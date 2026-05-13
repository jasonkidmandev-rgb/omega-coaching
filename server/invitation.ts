import { getDb } from "./db";
import { adminInvitations } from "../drizzle/schema";
import { eq, and, gt } from "drizzle-orm";
import crypto from "crypto";
import { sendEmail } from "./emailService";

// Generate a secure random token
export function generateInvitationToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

// Check if there's already a pending invitation for this email
export async function hasPendingInvitation(email: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const existing = await db
    .select()
    .from(adminInvitations)
    .where(
      and(
        eq(adminInvitations.email, email.toLowerCase()),
        eq(adminInvitations.status, "pending"),
        gt(adminInvitations.expiresAt, new Date())
      )
    );
  return existing.length > 0;
}

// Create a new invitation
export async function createInvitation(
  email: string,
  name: string | undefined,
  role: "admin" | "manager" | "viewer" | "finance",
  invitedBy: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Check for existing pending invitation
  const hasPending = await hasPendingInvitation(email);
  if (hasPending) {
    throw new Error(`A pending invitation already exists for ${email}. Please revoke the existing invitation first.`);
  }
  
  const token = generateInvitationToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await db.insert(adminInvitations).values({
    email,
    name,
    role,
    token,
    invitedBy,
    expiresAt,
    status: "pending",
  });

  return { token, expiresAt };
}

// Get invitation by token
export async function getInvitationByToken(token: string) {
  const db = await getDb();
  if (!db) return null;
  const [invitation] = await db
    .select()
    .from(adminInvitations)
    .where(eq(adminInvitations.token, token));
  return invitation;
}

// Get pending invitations
export async function getPendingInvitations() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(adminInvitations)
    .where(
      and(
        eq(adminInvitations.status, "pending"),
        gt(adminInvitations.expiresAt, new Date())
      )
    );
}

// Accept invitation
export async function acceptInvitation(token: string, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(adminInvitations)
    .set({
      status: "accepted",
      acceptedAt: new Date(),
      acceptedByUserId: userId,
    })
    .where(eq(adminInvitations.token, token));
}

// Revoke invitation
export async function revokeInvitation(id: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(adminInvitations)
    .set({ status: "revoked" })
    .where(eq(adminInvitations.id, id));
}

// Generate invitation email HTML
export function generateInvitationEmailHtml(
  inviteeName: string | undefined,
  inviterName: string,
  role: string,
  inviteUrl: string,
  appName: string
): string {
  const roleDescriptions: Record<string, string> = {
    admin: "full administrative access to manage all aspects of the platform",
    manager: "manage clients, protocols, and team operations",
    viewer: "read-only access to view protocols, analytics, and client information",
    finance: "manage payments, refunds, and financial operations",
  };

  const roleDescription = roleDescriptions[role] || "access to the platform";
  const greeting = inviteeName ? `Hi ${inviteeName},` : "Hi,";
  const roleDisplay = role.charAt(0).toUpperCase() + role.slice(1);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're Invited!</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0f172a;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #1e293b; border-radius: 16px; overflow: hidden;">
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <h1 style="color: #f97316; font-size: 28px; margin: 0 0 8px;">You're Invited!</h1>
              <p style="color: #94a3b8; font-size: 16px; margin: 0;">Join the ${appName} team</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px;">
              <p style="color: #e2e8f0; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">${greeting}</p>
              <p style="color: #e2e8f0; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                <strong style="color: #f97316;">${inviterName}</strong> has invited you to join <strong style="color: #f97316;">${appName}</strong> as a team member.
              </p>
              <div style="background-color: #0f172a; border-radius: 12px; padding: 20px; margin: 20px 0;">
                <p style="color: #94a3b8; font-size: 14px; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.5px;">Your Role</p>
                <p style="color: #f97316; font-size: 24px; font-weight: bold; margin: 0 0 8px;">${roleDisplay}</p>
                <p style="color: #cbd5e1; font-size: 14px; margin: 0;">You'll have ${roleDescription}.</p>
              </div>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${inviteUrl}" style="display: inline-block; background: linear-gradient(135deg, #f97316, #ea580c); color: white; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: bold; font-size: 16px;">Accept Invitation</a>
              </div>
              <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 20px 0 0;">
                This invitation will expire in <strong style="color: #e2e8f0;">7 days</strong>. If you didn't expect this invitation, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px 40px;">
              <hr style="border: none; border-top: 1px solid #334155; margin: 0 0 20px;">
              <p style="color: #64748b; font-size: 12px; margin: 0; text-align: center;">All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// Generate invitation email plain text
export function generateInvitationEmailText(
  inviteeName: string | undefined,
  inviterName: string,
  role: string,
  inviteUrl: string,
  appName: string
): string {
  const roleDescriptions: Record<string, string> = {
    admin: "full administrative access to manage all aspects of the platform",
    manager: "manage clients, protocols, and team operations",
    viewer: "read-only access to view protocols, analytics, and client information",
    finance: "manage payments, refunds, and financial operations",
  };

  const roleDescription = roleDescriptions[role] || "access to the platform";
  const greeting = inviteeName ? `Hi ${inviteeName},` : "Hi,";
  const roleDisplay = role.charAt(0).toUpperCase() + role.slice(1);

  return `${greeting}

${inviterName} has invited you to join ${appName} as a team member.

Your Role: ${roleDisplay}
You'll have ${roleDescription}.

Accept your invitation by visiting:
${inviteUrl}

This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.`;
}

// Send invitation email
export async function sendInvitationEmail(
  email: string,
  name: string | undefined,
  inviterName: string,
  role: string,
  token: string,
  baseUrl: string,
  appName: string
) {
  const inviteUrl = `${baseUrl}/accept-invite?token=${token}`;
  
  const html = generateInvitationEmailHtml(name, inviterName, role, inviteUrl, appName);
  const text = generateInvitationEmailText(name, inviterName, role, inviteUrl, appName);

  await sendEmail({
    to: email,
    subject: `You're invited to join ${appName}`,
    html,
  });
}
