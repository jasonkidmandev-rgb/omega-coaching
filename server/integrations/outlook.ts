/**
 * Outlook Office 365 Calendar Integration
 * 
 * This module provides integration with Microsoft Outlook/Office 365 calendars
 * using Microsoft Graph API.
 * 
 * To enable this integration, you need to:
 * 1. Register an app in Azure Active Directory
 * 2. Configure the following environment variables:
 *    - OUTLOOK_CLIENT_ID: Your Azure AD app client ID
 *    - OUTLOOK_CLIENT_SECRET: Your Azure AD app client secret
 *    - OUTLOOK_TENANT_ID: Your Azure AD tenant ID (or 'common' for multi-tenant)
 *    - OUTLOOK_REDIRECT_URI: OAuth redirect URI (e.g., https://yourapp.com/api/outlook/callback)
 */

import { getDb } from "../db";
import { appointments } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

// Microsoft Graph API endpoints
const GRAPH_API_BASE = "https://graph.microsoft.com/v1.0";
const AUTH_BASE = "https://login.microsoftonline.com";

// Environment variables (to be added when user configures)
const OUTLOOK_CLIENT_ID = process.env.OUTLOOK_CLIENT_ID || "";
const OUTLOOK_CLIENT_SECRET = process.env.OUTLOOK_CLIENT_SECRET || "";
const OUTLOOK_TENANT_ID = process.env.OUTLOOK_TENANT_ID || "common";
const OUTLOOK_REDIRECT_URI = process.env.OUTLOOK_REDIRECT_URI || "";

export interface OutlookTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export interface OutlookEvent {
  id?: string;
  subject: string;
  body?: {
    contentType: "HTML" | "Text";
    content: string;
  };
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  attendees?: Array<{
    emailAddress: {
      address: string;
      name: string;
    };
    type: "required" | "optional";
  }>;
  location?: {
    displayName: string;
  };
  isOnlineMeeting?: boolean;
  onlineMeetingProvider?: "teamsForBusiness" | "skypeForBusiness" | "skypeForConsumer";
}

/**
 * Generate OAuth authorization URL for Outlook
 */
export function getOutlookAuthUrl(state: string): string {
  const scopes = [
    "offline_access",
    "Calendars.ReadWrite",
    "User.Read",
  ].join(" ");

  const params = new URLSearchParams({
    client_id: OUTLOOK_CLIENT_ID,
    response_type: "code",
    redirect_uri: OUTLOOK_REDIRECT_URI,
    response_mode: "query",
    scope: scopes,
    state,
  });

  return `${AUTH_BASE}/${OUTLOOK_TENANT_ID}/oauth2/v2.0/authorize?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<OutlookTokens> {
  const response = await fetch(`${AUTH_BASE}/${OUTLOOK_TENANT_ID}/oauth2/v2.0/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: OUTLOOK_CLIENT_ID,
      client_secret: OUTLOOK_CLIENT_SECRET,
      code,
      redirect_uri: OUTLOOK_REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange code for tokens: ${error}`);
  }

  const data = await response.json();
  
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  };
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<OutlookTokens> {
  const response = await fetch(`${AUTH_BASE}/${OUTLOOK_TENANT_ID}/oauth2/v2.0/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: OUTLOOK_CLIENT_ID,
      client_secret: OUTLOOK_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to refresh token: ${error}`);
  }

  const data = await response.json();
  
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  };
}

/**
 * Create a calendar event in Outlook
 */
export async function createOutlookEvent(
  accessToken: string,
  event: OutlookEvent
): Promise<OutlookEvent> {
  const response = await fetch(`${GRAPH_API_BASE}/me/events`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(event),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create Outlook event: ${error}`);
  }

  return response.json();
}

/**
 * Update a calendar event in Outlook
 */
export async function updateOutlookEvent(
  accessToken: string,
  eventId: string,
  event: Partial<OutlookEvent>
): Promise<OutlookEvent> {
  const response = await fetch(`${GRAPH_API_BASE}/me/events/${eventId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(event),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to update Outlook event: ${error}`);
  }

  return response.json();
}

/**
 * Delete a calendar event from Outlook
 */
export async function deleteOutlookEvent(
  accessToken: string,
  eventId: string
): Promise<void> {
  const response = await fetch(`${GRAPH_API_BASE}/me/events/${eventId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to delete Outlook event: ${error}`);
  }
}

/**
 * Get calendar events from Outlook
 */
export async function getOutlookEvents(
  accessToken: string,
  startDateTime: string,
  endDateTime: string
): Promise<OutlookEvent[]> {
  const params = new URLSearchParams({
    startDateTime,
    endDateTime,
    $orderby: "start/dateTime",
    $top: "100",
  });

  const response = await fetch(
    `${GRAPH_API_BASE}/me/calendarView?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Prefer: 'outlook.timezone="America/Denver"',
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get Outlook events: ${error}`);
  }

  const data = await response.json();
  return data.value;
}

/**
 * Sync an appointment to Outlook calendar
 */
export async function syncAppointmentToOutlook(
  accessToken: string,
  appointmentId: number,
  appointmentData: {
    clientName: string;
    clientEmail: string;
    startTime: Date;
    endTime: Date;
    appointmentTypeName: string;
    notes?: string;
    meetingLink?: string;
  }
): Promise<string | null> {
  try {
    const event: OutlookEvent = {
      subject: `${appointmentData.appointmentTypeName} - ${appointmentData.clientName}`,
      body: {
        contentType: "HTML",
        content: `
          <p><strong>Client:</strong> ${appointmentData.clientName}</p>
          <p><strong>Email:</strong> ${appointmentData.clientEmail}</p>
          ${appointmentData.notes ? `<p><strong>Notes:</strong> ${appointmentData.notes}</p>` : ""}
          ${appointmentData.meetingLink ? `<p><strong>Meeting Link:</strong> <a href="${appointmentData.meetingLink}">${appointmentData.meetingLink}</a></p>` : ""}
        `,
      },
      start: {
        dateTime: appointmentData.startTime.toISOString(),
        timeZone: "America/Denver",
      },
      end: {
        dateTime: appointmentData.endTime.toISOString(),
        timeZone: "America/Denver",
      },
      attendees: [
        {
          emailAddress: {
            address: appointmentData.clientEmail,
            name: appointmentData.clientName,
          },
          type: "required",
        },
      ],
    };

    const createdEvent = await createOutlookEvent(accessToken, event);
    
    // Store the Outlook event ID in the database for future updates
    const db = await getDb();
    if (db && createdEvent.id) {
      // Note: You would need to add an outlookEventId column to the appointments table
      // await db.update(appointments)
      //   .set({ outlookEventId: createdEvent.id })
      //   .where(eq(appointments.id, appointmentId));
    }

    return createdEvent.id || null;
  } catch (error) {
    console.error("[Outlook] Failed to sync appointment:", error);
    return null;
  }
}

/**
 * Check if Outlook integration is configured
 */
export function isOutlookConfigured(): boolean {
  return !!(OUTLOOK_CLIENT_ID && OUTLOOK_CLIENT_SECRET && OUTLOOK_REDIRECT_URI);
}

/**
 * Get user profile from Outlook
 */
export async function getOutlookProfile(accessToken: string): Promise<{
  displayName: string;
  mail: string;
  userPrincipalName: string;
}> {
  const response = await fetch(`${GRAPH_API_BASE}/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get Outlook profile: ${error}`);
  }

  return response.json();
}
