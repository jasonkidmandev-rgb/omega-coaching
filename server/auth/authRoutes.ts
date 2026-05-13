import type { Express, Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { parse as parseCookieHeader } from "cookie";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "../_core/cookies";
import { ENV } from "../_core/env";
import * as db from "../db";
import { users } from "../../drizzle/schema";
import { eq, and, isNull } from "drizzle-orm";
import { sendEmail } from "../emailService";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const SALT_ROUNDS = 12;

// Rate limiting state for login attempts
const loginAttempts = new Map<string, { count: number; lastAttempt: number; lockedUntil?: number }>();

function getLoginKey(email: string, ip: string): string {
  return `${email.toLowerCase()}:${ip}`;
}

function checkRateLimit(email: string, ip: string): { allowed: boolean; retryAfter?: number } {
  const key = getLoginKey(email, ip);
  const now = Date.now();
  const state = loginAttempts.get(key);

  if (!state) return { allowed: true };

  // Check if locked out
  if (state.lockedUntil && now < state.lockedUntil) {
    return { allowed: false, retryAfter: Math.ceil((state.lockedUntil - now) / 1000) };
  }

  // Reset if last attempt was more than 15 minutes ago
  if (now - state.lastAttempt > 15 * 60 * 1000) {
    loginAttempts.delete(key);
    return { allowed: true };
  }

  // Lock after 5 failed attempts for 15 minutes
  if (state.count >= 5) {
    state.lockedUntil = now + 15 * 60 * 1000;
    return { allowed: false, retryAfter: 15 * 60 };
  }

  return { allowed: true };
}

function recordFailedAttempt(email: string, ip: string): void {
  const key = getLoginKey(email, ip);
  const now = Date.now();
  const state = loginAttempts.get(key);

  if (!state) {
    loginAttempts.set(key, { count: 1, lastAttempt: now });
  } else {
    state.count++;
    state.lastAttempt = now;
  }
}

function clearAttempts(email: string, ip: string): void {
  loginAttempts.delete(getLoginKey(email, ip));
}

function getSessionSecret() {
  return new TextEncoder().encode(ENV.cookieSecret);
}

async function createSessionToken(userId: number, email: string, name: string): Promise<string> {
  const issuedAt = Date.now();
  const expirationSeconds = Math.floor((issuedAt + THIRTY_DAYS_MS) / 1000);
  const secretKey = getSessionSecret();

  // Use a unique openId format for local auth: "local:{userId}"
  return new SignJWT({
    openId: `local:${userId}`,
    appId: ENV.appId,
    name: name || "",
    userId,
    email,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(expirationSeconds)
    .sign(secretKey);
}

export function registerAuthRoutes(app: Express) {
  // ============================================
  // POST /api/auth/login - Email + Password Login
  // ============================================
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      const normalizedEmail = email.toLowerCase().trim();
      const ip = (req.headers["x-forwarded-for"]?.toString().split(",")[0] || req.ip || "unknown").trim();

      // Rate limit check
      const rateCheck = checkRateLimit(normalizedEmail, ip);
      if (!rateCheck.allowed) {
        return res.status(429).json({
          error: "Too many login attempts. Please try again later.",
          retryAfter: rateCheck.retryAfter,
        });
      }

      // Find user by email
      const user = await db.getUserByEmail(normalizedEmail);

      if (!user) {
        recordFailedAttempt(normalizedEmail, ip);
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // Check if user has a password set
      if (!user.passwordHash) {
        // Check legacy loginMethod field for password:hash format
        if (user.loginMethod?.startsWith("password:")) {
          // Migrate legacy password to passwordHash column
          const legacyHash = user.loginMethod.replace("password:", "");
          const isValid = await bcrypt.compare(password, legacyHash);
          if (!isValid) {
            recordFailedAttempt(normalizedEmail, ip);
            return res.status(401).json({ error: "Invalid email or password" });
          }
          // Migrate the hash to the proper column
          const dbConn = await db.getDb();
          await dbConn!.update(users)
            .set({ passwordHash: legacyHash, loginMethod: "password" })
            .where(eq(users.id, user.id));
        } else {
          recordFailedAttempt(normalizedEmail, ip);
          return res.status(401).json({ error: "Invalid email or password" });
        }
      } else {
        // Verify password against passwordHash
        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
          recordFailedAttempt(normalizedEmail, ip);
          return res.status(401).json({ error: "Invalid email or password" });
        }
      }

      // Clear rate limit on success
      clearAttempts(normalizedEmail, ip);

      // Create session
      const sessionToken = await createSessionToken(user.id, user.email!, user.name || "");

      // Set cookie
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: THIRTY_DAYS_MS });

      // Update last signed in
      const dbConn = await db.getDb();
      await dbConn!.update(users)
        .set({ lastSignedIn: new Date(), loginMethod: "password" })
        .where(eq(users.id, user.id));

      // Create session record
      try {
        const userAgent = req.headers["user-agent"] || null;
        const ipAddress = (req.headers["x-forwarded-for"]?.toString().split(",")[0] || req.ip || null);
        await db.createUserSession({
          userId: user.id,
          sessionToken,
          userAgent: userAgent || undefined,
          ipAddress: ipAddress?.trim() || undefined,
          expiresAt: new Date(Date.now() + THIRTY_DAYS_MS),
        });
      } catch (sessionError) {
        console.error("[Auth] Failed to create session record:", sessionError);
      }

      console.log(`[Auth] Login successful for ${normalizedEmail} (user ${user.id})`);

      return res.json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      console.error("[Auth] Login error:", error);
      return res.status(500).json({ error: "An error occurred during login" });
    }
  });

  // ============================================
  // POST /api/auth/signup - Email + Password Signup
  // ============================================
  app.post("/api/auth/signup", async (req: Request, res: Response) => {
    try {
      const { email, password, name } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      if (password.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters" });
      }

      const normalizedEmail = email.toLowerCase().trim();
      const trimmedName = (name || "").trim();

      // Check if user already exists
      const existingUser = await db.getUserByEmail(normalizedEmail);
      if (existingUser) {
        // If user exists but has no password, they were pre-created (e.g., from protocol)
        // Allow them to set a password
        if (!existingUser.passwordHash && !existingUser.loginMethod?.startsWith("password:")) {
          const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
          const dbConn = await db.getDb();
          await dbConn!.update(users)
            .set({
              passwordHash: hashedPassword,
              loginMethod: "password",
              name: trimmedName || existingUser.name,
              emailVerified: true,
              lastSignedIn: new Date(),
            })
            .where(eq(users.id, existingUser.id));

          // Create session
          const sessionToken = await createSessionToken(existingUser.id, normalizedEmail, trimmedName || existingUser.name || "");
          const cookieOptions = getSessionCookieOptions(req);
          res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: THIRTY_DAYS_MS });

          // Create session record
          try {
            await db.createUserSession({
              userId: existingUser.id,
              sessionToken,
              userAgent: req.headers["user-agent"] || undefined,
              ipAddress: (req.headers["x-forwarded-for"]?.toString().split(",")[0] || req.ip || "").trim() || undefined,
              expiresAt: new Date(Date.now() + THIRTY_DAYS_MS),
            });
          } catch (e) { /* non-critical */ }

          console.log(`[Auth] Existing user ${existingUser.id} set password via signup (${normalizedEmail})`);

          return res.json({
            success: true,
            user: {
              id: existingUser.id,
              name: trimmedName || existingUser.name,
              email: normalizedEmail,
              role: existingUser.role,
            },
          });
        }

        return res.status(409).json({ error: "An account with this email already exists. Please sign in instead." });
      }

      // Create new user
      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
      const openId = `local:${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

      // Create or find unified contact
      let contactId: number | undefined;
      try {
        const { findOrCreateContact } = await import('../contacts/contactService');
        const contact = await findOrCreateContact({
          fullName: trimmedName || undefined,
          email: normalizedEmail,
          lifecycleStage: 'lead',
        });
        contactId = contact.id;
      } catch (e) {
        console.error('[Register] Failed to create/find contact:', e);
      }

      const dbConn = await db.getDb();
      const result = await dbConn!.insert(users).values({
        openId,
        passwordHash: hashedPassword,
        emailVerified: true,
        name: trimmedName || null,
        email: normalizedEmail,
        loginMethod: "password",
        role: "user",
        lastSignedIn: new Date(),
        contactId: contactId || null,
      });

      const userId = result[0].insertId;

      // Create session
      const sessionToken = await createSessionToken(userId, normalizedEmail, trimmedName);
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: THIRTY_DAYS_MS });

      // Create session record
      try {
        await db.createUserSession({
          userId,
          sessionToken,
          userAgent: req.headers["user-agent"] || undefined,
          ipAddress: (req.headers["x-forwarded-for"]?.toString().split(",")[0] || req.ip || "").trim() || undefined,
          expiresAt: new Date(Date.now() + THIRTY_DAYS_MS),
        });
      } catch (e) { /* non-critical */ }

      // Send welcome email
      try {
        const { sendWelcomeEmail } = await import("../emailService");
        const baseUrl = req.headers.origin || process.env.VITE_APP_URL || "";
        await sendWelcomeEmail({
          to: normalizedEmail,
          userName: trimmedName || "there",
          dashboardUrl: `${baseUrl}/dashboard`,
          launchpadUrl: `${baseUrl}/launchpad`,
        });
      } catch (emailError) {
        console.error("[Auth] Failed to send welcome email:", emailError);
      }

      // Create admin notification
      try {
        await db.createNotificationsForEnabledUsers(
          "new_user_registered",
          "New User Registered",
          `${trimmedName || normalizedEmail} has created an account.`
        );
      } catch (e) { /* non-critical */ }

      console.log(`[Auth] New user ${userId} created via signup (${normalizedEmail})`);

      return res.json({
        success: true,
        user: {
          id: userId,
          name: trimmedName,
          email: normalizedEmail,
          role: "user",
        },
      });
    } catch (error) {
      console.error("[Auth] Signup error:", error);
      return res.status(500).json({ error: "An error occurred during signup" });
    }
  });

  // ============================================
  // POST /api/auth/forgot-password - Request password reset email
  // ============================================
  app.post("/api/auth/forgot-password", async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      const normalizedEmail = email.toLowerCase().trim();
      const user = await db.getUserByEmailForPasswordReset(normalizedEmail);

      if (user) {
        const token = await db.createPasswordResetToken(user.id, user.email!, "reset_password");
        const resetUrl = `${process.env.VITE_APP_URL || req.headers.origin}/set-password?token=${token}`;

        await sendEmail({
          to: user.email!,
          subject: "Reset Your Password - Peptide Coach",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #ea580c;">Reset Your Password</h2>
              <p>Hi ${user.name || "there"},</p>
              <p>We received a request to reset your password. Click the button below to create a new password:</p>
              <p style="margin: 30px 0;">
                <a href="${resetUrl}" style="background-color: #ea580c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a>
              </p>
              <p style="color: #666; font-size: 14px;">This link will expire in 1 hour.</p>
              <p style="color: #666; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
              <p style="color: #999; font-size: 12px;">Peptide Coach - Omega Longevity</p>
            </div>
          `,
        });
        console.log(`[Auth] Password reset email sent to ${normalizedEmail}`);
      }

      // Always return success to prevent email enumeration
      return res.json({
        success: true,
        message: "If an account exists with that email, a password reset link has been sent.",
      });
    } catch (error) {
      console.error("[Auth] Forgot password error:", error);
      return res.status(500).json({ error: "An error occurred" });
    }
  });
}
