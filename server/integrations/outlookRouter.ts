import { z } from "zod";
import { router, adminProcedure } from "../_core/trpc";
import { 
  getOutlookAuthUrl, 
  exchangeCodeForTokens, 
  refreshAccessToken,
  getOutlookEvents,
  isOutlookConfigured,
  getOutlookProfile,
  OutlookTokens
} from "./outlook";

// In-memory token storage (in production, store in database)
let outlookTokens: OutlookTokens | null = null;

export const outlookRouter = router({
  // Check if Outlook integration is configured
  getStatus: adminProcedure.query(async () => {
    const configured = isOutlookConfigured();
    const connected = !!outlookTokens && outlookTokens.expiresAt > new Date();
    
    return {
      configured,
      connected,
      message: !configured 
        ? "Outlook integration not configured. Add OUTLOOK_CLIENT_ID, OUTLOOK_CLIENT_SECRET, and OUTLOOK_REDIRECT_URI to environment variables."
        : connected 
        ? "Connected to Outlook"
        : "Not connected to Outlook",
    };
  }),

  // Get OAuth authorization URL
  getAuthUrl: adminProcedure.query(async () => {
    if (!isOutlookConfigured()) {
      throw new Error("Outlook integration not configured");
    }
    
    const state = Math.random().toString(36).substring(7);
    const url = getOutlookAuthUrl(state);
    
    return { url, state };
  }),

  // Exchange authorization code for tokens
  exchangeCode: adminProcedure
    .input(z.object({ code: z.string() }))
    .mutation(async ({ input }) => {
      if (!isOutlookConfigured()) {
        throw new Error("Outlook integration not configured");
      }
      
      const tokens = await exchangeCodeForTokens(input.code);
      outlookTokens = tokens;
      
      // Get user profile
      const profile = await getOutlookProfile(tokens.accessToken);
      
      return {
        success: true,
        profile: {
          name: profile.displayName,
          email: profile.mail || profile.userPrincipalName,
        },
      };
    }),

  // Disconnect from Outlook
  disconnect: adminProcedure.mutation(async () => {
    outlookTokens = null;
    return { success: true };
  }),

  // Get calendar events
  getEvents: adminProcedure
    .input(z.object({
      startDate: z.string(),
      endDate: z.string(),
    }))
    .query(async ({ input }) => {
      if (!outlookTokens) {
        throw new Error("Not connected to Outlook");
      }
      
      // Refresh token if expired
      if (outlookTokens.expiresAt <= new Date()) {
        outlookTokens = await refreshAccessToken(outlookTokens.refreshToken);
      }
      
      const events = await getOutlookEvents(
        outlookTokens.accessToken,
        input.startDate,
        input.endDate
      );
      
      return events.map(event => ({
        id: event.id,
        subject: event.subject,
        start: event.start.dateTime,
        end: event.end.dateTime,
        location: event.location?.displayName,
        isOnlineMeeting: event.isOnlineMeeting,
      }));
    }),

  // Get connected profile
  getProfile: adminProcedure.query(async () => {
    if (!outlookTokens) {
      return null;
    }
    
    // Refresh token if expired
    if (outlookTokens.expiresAt <= new Date()) {
      try {
        outlookTokens = await refreshAccessToken(outlookTokens.refreshToken);
      } catch {
        outlookTokens = null;
        return null;
      }
    }
    
    try {
      const profile = await getOutlookProfile(outlookTokens.accessToken);
      return {
        name: profile.displayName,
        email: profile.mail || profile.userPrincipalName,
      };
    } catch {
      return null;
    }
  }),
});
