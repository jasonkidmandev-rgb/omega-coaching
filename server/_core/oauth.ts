import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { COOKIE_NAME } from "@shared/const";
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

// Parse state parameter to extract returnTo URL and rememberMe preference
function parseState(state: string): { redirectUri?: string; returnTo: string; rememberMe: boolean } {
  try {
    const decoded = Buffer.from(state, 'base64').toString('utf-8');
    const parsed = JSON.parse(decoded);
    return {
      redirectUri: parsed.redirectUri,
      returnTo: parsed.returnTo || '/',
      rememberMe: parsed.rememberMe !== false, // Default to true if not specified
    };
  } catch {
    // Legacy state format (just the redirectUri)
    return { returnTo: '/', rememberMe: true };
  }
}

// Validate returnTo URL to prevent open redirect attacks
function isValidReturnTo(returnTo: string): boolean {
  // Only allow relative paths starting with /
  if (!returnTo.startsWith('/')) return false;
  // Disallow protocol-relative URLs
  if (returnTo.startsWith('//')) return false;
  // Disallow javascript: URLs
  if (returnTo.toLowerCase().includes('javascript:')) return false;
  return true;
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    console.log("[OAuth] Callback received");
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      console.log("[OAuth] Missing code or state");
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    // Parse state to get returnTo URL and rememberMe preference
    const { returnTo, rememberMe } = parseState(state);
    const safeReturnTo = isValidReturnTo(returnTo) ? returnTo : '/';
    console.log(`[OAuth] Parsed state - returnTo: ${returnTo}, safeReturnTo: ${safeReturnTo}, rememberMe: ${rememberMe}`);

    try {
      console.log("[OAuth] Exchanging code for token...");
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      console.log("[OAuth] Token exchange successful");
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      console.log(`[OAuth] Got user info - openId: ${userInfo.openId}, email: ${userInfo.email}`);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      // Check if this is a new user (for welcome email)
      const existingUser = await db.getUserByOpenId(userInfo.openId);
      const isNewUser = !existingUser;

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      });

      // Use different session duration based on rememberMe preference
      const sessionDuration = rememberMe ? ONE_YEAR_MS : ONE_DAY_MS;
      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: sessionDuration,
      });

      const cookieOptions = getSessionCookieOptions(req);
      console.log(`[OAuth] Setting cookie with options:`, JSON.stringify(cookieOptions));
      console.log(`[OAuth] Request secure: ${req.secure}, protocol: ${req.protocol}, x-forwarded-proto: ${req.headers['x-forwarded-proto']}`);
      console.log(`[OAuth] Session duration: ${rememberMe ? '1 year' : '24 hours'}`);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: sessionDuration });
      console.log(`[OAuth] Cookie set successfully`);

      // Create session record for session management
      try {
        const user = await db.getUserByOpenId(userInfo.openId);
        if (user) {
          const userAgent = req.headers['user-agent'] || null;
          const ipAddress = req.headers['x-forwarded-for']?.toString().split(',')[0] || req.ip || null;
          await db.createUserSession({
            userId: user.id,
            sessionToken,
            userAgent: userAgent || undefined,
            ipAddress: ipAddress || undefined,
            expiresAt: new Date(Date.now() + sessionDuration),
          });
          console.log(`[OAuth] Session record created for user ${user.id}`);
        }
      } catch (sessionError) {
        console.error("[OAuth] Failed to create session record:", sessionError);
        // Don't fail login if session tracking fails
      }

      // Auto-link any unlinked enrollment matching this user's email
      try {
        const user = await db.getUserByOpenId(userInfo.openId);
        if (user && userInfo.email) {
          const database = await db.getDb();
          if (database) {
            const { sql: sqlTag } = await import('drizzle-orm');
            const [unlinkedRows] = await database.execute(sqlTag`
              SELECT id, email, fullName FROM transformation_enrollments
              WHERE LOWER(email) = LOWER(${userInfo.email})
                AND (userId IS NULL OR userId = 0)
              LIMIT 5
            `) as any;
            const unlinked = (unlinkedRows as any[]) || [];
            if (unlinked.length > 0) {
              for (const enrollment of unlinked) {
                await database.execute(sqlTag`
                  UPDATE transformation_enrollments
                  SET userId = ${user.id}, authToken = NULL, authTokenExpiresAt = NULL, updatedAt = NOW()
                  WHERE id = ${enrollment.id}
                `);
                console.log(`[OAuth] Auto-linked enrollment #${enrollment.id} (${enrollment.email}) to user #${user.id} on login`);
              }
            }
          }
        }
      } catch (autoLinkErr) {
        console.error('[OAuth] Auto-link enrollment failed (non-blocking):', autoLinkErr);
      }

      // Send welcome email to new users
      if (isNewUser && userInfo.email) {
        try {
          const { sendWelcomeEmail } = await import("../emailService");
          const baseUrl = req.headers.origin || process.env.VITE_APP_URL || '';
          
          // Check if user has a linked client protocol
          let protocolUrl: string | undefined;
          const clientProtocol = await db.getClientProtocolByEmail(userInfo.email);
          if (clientProtocol) {
            protocolUrl = `${baseUrl}/protocol/${clientProtocol.accessToken}`;
          }
          
          await sendWelcomeEmail({
            to: userInfo.email,
            userName: userInfo.name || 'there',
            dashboardUrl: `${baseUrl}/dashboard`,
            protocolUrl,
            launchpadUrl: `${baseUrl}/launchpad`,
          });
          
          console.log(`[OAuth] Welcome email sent to new user: ${userInfo.email}`);
          
          // Create in-app notification for admin about new user registration
          await db.createNotificationsForEnabledUsers(
            'new_user_registered',
            'New User Registered',
            `${userInfo.name || userInfo.email} has created an account and logged in for the first time.`,
          );

          // Auto-create prospect record so Shannon sees every new signup in the pipeline
          try {
            const database = await db.getDb();
            if (database) {
              const { prospects } = await import('../../drizzle/schema');
              const { eq: eqOp } = await import('drizzle-orm');
              const crypto = await import('crypto');

              // Dedup check: match by email OR by name (fuzzy)
              const normalizedEmail = userInfo.email?.toLowerCase().trim();
              let existingProspect = null;
              
              if (normalizedEmail) {
                const [byEmail] = await database.select().from(prospects).where(eqOp(prospects.email, normalizedEmail));
                if (byEmail) existingProspect = byEmail;
              }
              
              if (!existingProspect && userInfo.name) {
                // Also check by name to catch cases where email was different (typo, etc.)
                const { like } = await import('drizzle-orm');
                const [byName] = await database.select().from(prospects).where(like(prospects.name, userInfo.name));
                if (byName) existingProspect = byName;
              }
              
              if (!existingProspect) {
                const SHANNON_TEAM_ID = 30001;
                const trackingToken = crypto.randomBytes(16).toString('hex');
                await database.insert(prospects).values({
                  name: userInfo.name || userInfo.email,
                  email: normalizedEmail,
                  phone: 'not-provided',
                  status: 'new',
                  source: 'account-signup',
                  notes: `Auto-created when ${userInfo.name || userInfo.email} created an account via ${userInfo.loginMethod || 'OAuth'}. New prospect for Shannon to follow up with.`,
                  trackingToken,
                  lastContactedAt: new Date(),
                  assignedTo: SHANNON_TEAM_ID,
                });
                console.log(`[OAuth] Auto-created prospect for new user: ${userInfo.email}`);
              } else {
                // Update existing prospect with userId link and email if missing
                const updates: any = { userId: newUser.id, updatedAt: new Date() };
                if (normalizedEmail && !existingProspect.email) updates.email = normalizedEmail;
                await database.update(prospects).set(updates).where(eqOp(prospects.id, existingProspect.id));
                console.log(`[OAuth] Linked existing prospect #${existingProspect.id} (${existingProspect.name}) to new user ${userInfo.email}`);
              }
            }
          } catch (prospectErr) {
            console.error('[OAuth] Failed to auto-create prospect (non-blocking):', prospectErr);
          }
        } catch (emailError) {
          // Don't fail the login if email fails
          console.error("[OAuth] Failed to send welcome email:", emailError);
        }
      }

      // Redirect to the original page the user was trying to access
      console.log(`[OAuth] Login successful for user ${userInfo.email}, redirecting to: ${safeReturnTo}`);
      console.log(`[OAuth] Response headers before redirect:`, JSON.stringify(res.getHeaders()));
      res.redirect(302, safeReturnTo);
    } catch (error: any) {
      console.error("[OAuth] Callback failed", error);
      console.error("[OAuth] Error details:", {
        message: error?.message,
        code: error?.code,
        response: error?.response?.data,
        status: error?.response?.status,
      });
      const errorMessage = error?.response?.data?.message || error?.message || "OAuth callback failed";
      res.status(500).json({ error: "OAuth callback failed", details: errorMessage });
    }
  });
}
