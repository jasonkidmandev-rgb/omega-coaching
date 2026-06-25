// Force UTC timezone for consistent date handling across all environments.
// The database stores UTC timestamps; mysql2 must interpret them as UTC.
process.env.TZ = 'UTC';

import "dotenv/config";
import * as Sentry from "@sentry/node";

import express from "express";
import helmet from "helmet";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerAuthRoutes } from "../auth/authRoutes";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import stripeWebhookRouter from "../stripe/webhook";
import omegalongevityWebhookRouter from "../integrations/omegalongevity/webhook";
import { startFollowUpCron } from "../cron/followUpCron";
import { startLowStockAlertCron } from "../cron/lowStockAlertCron";
// progressReminderCron removed - consolidated into checkinCron (Mar 2026)
import { initWaiverExpirationCron } from "../cron/waiverExpirationCron";
import { startScheduledAnnouncementCron } from "../cron/scheduledAnnouncementCron";
import { startPaymentReminderCron } from "../cron/paymentReminderCron";
import { startArchivedPackingSlipCleanupCron } from "../cron/archivedPackingSlipCleanup";
import { initCheckinCron } from "../cron/checkinCron";
import { initializeDigestCron } from "../cron/digestCron";
import { initEmailReportCron } from "../cron/emailReportCron";
import { initSessionReminderCron } from "../cron/sessionReminderCron";
import { initStalledClientCron } from "../cron/stalledClientCron";
import { initWeeklyTeamDigestCron } from "../cron/weeklyTeamDigestCron";
import { initShannonDailyPipelineCron } from "../cron/shannonDailyPipelineCron";
import { startNightlyReconciliationCron } from "../cron/nightlyReconciliationCron";
import { initEnrollmentFollowUpCron } from "../cron/enrollmentFollowUpCron";
import { initIntakeFormReminderCron } from "../cron/intakeFormReminderCron";
import { startProtocolExpirationCron } from "../cron/protocolExpirationCron";
import { startWeeklyExpirationDigestCron } from "../cron/weeklyExpirationDigestCron";
// DISABLED: Abandoned checkout recovery cron removed per owner request
// import { startAbandonedCheckoutCron } from "../cron/abandonedCheckoutCron";
import { initPostDiscoveryFollowUpCron } from "../cron/postDiscoveryFollowUpCron";
import { initStrategySessionMonitorCron } from "../cron/strategySessionMonitorCron";
import { initBackorderAndTrackingCron } from "../cron/backorderAndTrackingCron";
import { initTaskEscalationCron } from "../cron/taskEscalationCron";
import { startEmailReplyPolling } from '../emailReplyBridge';
import { isStaging } from './appEnv';
import { initDbBackupCron } from '../cron/dbBackupCron';
import calendlyWebhookRouter from "../calendly/webhook";
import { generalLimiter, authLimiter, trackingLimiter, webhookLimiter, publicApiLimiter } from "./rateLimiter";
import { recordEmailOpen, recordEmailClick } from "../emailTracking";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  
  // Trust proxy for rate limiting behind reverse proxy
  app.set('trust proxy', 1);
  
  // Security headers with helmet
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://maps.googleapis.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        imgSrc: ["'self'", "data:", "https:", "blob:", "https://maps.gstatic.com", "https://maps.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        connectSrc: ["'self'", "https://maps.googleapis.com", "https://places.googleapis.com", "wss:", "ws:", "https://*.r2.cloudflarestorage.com"],
        frameSrc: ["https://www.youtube.com", "https://www.youtube-nocookie.com"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false, // Required for PayPal iframes
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" }, // Allow payment popups
  }));
  
  // Stripe webhook MUST be registered BEFORE express.json() for raw body signature verification
  app.use('/api/stripe/webhook', stripeWebhookRouter);

  // External partner webhooks (omegalongevity.com purchases) — also raw body for HMAC verification
  app.use('/api/external/omegalongevity', webhookLimiter, omegalongevityWebhookRouter);

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  
  // Global JSON error handler: catch ALL errors for /api/* routes and return JSON instead of HTML.
  // This catches body-parser errors, unhandled exceptions, and any other middleware errors.
  // Without this, Express returns an HTML error page which causes "unexpected token <" errors.
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    // For API routes, ALWAYS return JSON
    if (req.path.startsWith('/api')) {
      console.error(`[API Error] ${req.method} ${req.path}: ${err.type || err.name || 'Error'}: ${err.message}`);
      
      let message = 'Server error. Please try again.';
      let code = 'INTERNAL_SERVER_ERROR';
      let status = err.status || err.statusCode || 500;
      
      if (err.type === 'entity.too.large') {
        message = 'Request payload too large. Try saving smaller sections individually.';
        code = 'PAYLOAD_TOO_LARGE';
        status = 413;
      } else if (err.type === 'entity.parse.failed') {
        message = 'Invalid request format. Please try saving again.';
        code = 'PARSE_ERROR';
        status = 400;
      }
      
      res.status(status).json({
        error: {
          json: {
            message,
            code: -32000,
            data: { code, httpStatus: status },
          },
        },
      });
      return;
    }
    next(err);
  });
  // Healthie integration removed - no license available


  

  // Calendly webhook for real-time event notifications
  app.use('/api/calendly', webhookLimiter, calendlyWebhookRouter);
  
  // Known bot/prefetch user agent patterns that auto-load images
  const BOT_UA_PATTERNS = [
    /GoogleImageProxy/i, /YahooMailProxy/i, /Outlook/i,
    /Microsoft Office/i, /OfficeMacOutlook/i,
    /Thunderbird/i, /Postfix/i, /ZmImgProxy/i,
    /proxy/i, /prefetch/i, /preview/i,
    /bot/i, /crawler/i, /spider/i,
    /urllib/i, /python-requests/i, /Go-http-client/i,
    /Java\//i, /Apache-HttpClient/i,
  ];
  
  function isLikelyBot(userAgent: string | undefined): boolean {
    if (!userAgent) return true; // No UA = likely automated
    return BOT_UA_PATTERNS.some(pattern => pattern.test(userAgent));
  }
  
  // Minimum seconds after email send before we consider an open "genuine"
  const MIN_OPEN_DELAY_SECONDS = 30;

  // Email tracking pixel endpoint
  app.get('/api/track/:token', trackingLimiter, async (req, res) => {
    try {
      const { token } = req.params;
      const { recordEmailOpen, getClientProtocolById, getAdminEmails } = await import('../db');
      const { sendClientOpenedNotification } = await import('../emailService');
      const userAgent = req.get('User-Agent');
      
      // Record the email open (always record for analytics)
      const result = await recordEmailOpen(token, {
        ip: req.ip,
        userAgent,
        timestamp: new Date().toISOString(),
      });
      
      // Check if this looks like a bot/prefetch — skip notifications if so
      if (isLikelyBot(userAgent)) {
        console.log(`[EmailTrack] Skipping notification — bot/prefetch UA detected: ${userAgent?.substring(0, 60)}`);
        // Still return pixel but don't notify
        const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
        res.set('Content-Type', 'image/gif');
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
        return res.send(pixel);
      }
      
      // Check timing — if the email was sent very recently, it's likely a prefetch
      if (result.success && result.protocolId && result.sentAt) {
        const secondsSinceSend = (Date.now() - new Date(result.sentAt).getTime()) / 1000;
        if (secondsSinceSend < MIN_OPEN_DELAY_SECONDS) {
          console.log(`[EmailTrack] Skipping notification — opened ${secondsSinceSend.toFixed(1)}s after send (threshold: ${MIN_OPEN_DELAY_SECONDS}s)`);
          const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
          res.set('Content-Type', 'image/gif');
          res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
          res.set('Pragma', 'no-cache');
          res.set('Expires', '0');
          return res.send(pixel);
        }
      }
      
      // If this is a new open (first time) and passed bot/timing checks, send notifications
      if (result.success && result.protocolId && result.isFirstOpen) {
        const protocol = await getClientProtocolById(result.protocolId);
        if (protocol) {
          const adminEmails = await getAdminEmails();
          // 1. Send admin email notification
          await sendClientOpenedNotification({
            adminEmails,
            clientName: protocol.clientName,
            clientEmail: protocol.clientEmail,
            protocolId: protocol.id,
            openedAt: new Date(),
          });
          
          // 2. Create in-app notification for all admin users
          try {
            const { createNotificationsForEnabledUsers } = await import('../db');
            await createNotificationsForEnabledUsers(
              'protocol_viewed',
              `${protocol.clientName} opened their protocol email`,
              `${protocol.clientName} opened their protocol email at ${new Date().toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })}. They may be reviewing their protocol now.`,
              protocol.id
            );
          } catch (notifErr) {
            console.error('Error creating in-app notification for email open:', notifErr);
          }
        }
      }
    } catch (error) {
      console.error('Error recording email open:', error);
    }
    
    // Return a 1x1 transparent GIF
    const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    res.set('Content-Type', 'image/gif');
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.send(pixel);
  });
  
  // New engagement tracking - email open pixel
  app.get('/api/email/track/open/:trackingId', trackingLimiter, async (req, res) => {
    try {
      const { trackingId } = req.params;
      const { getDb } = await import('../db');
      const { emailEngagementEvents } = await import('../../drizzle/schema');
      const { eq, and } = await import('drizzle-orm');
      const userAgent = req.get('User-Agent');
      
      // Track in new email_tracking table (always record for analytics)
      await recordEmailOpen(trackingId, userAgent, req.ip || undefined);
      
      // Bot/prefetch detection — skip notifications for automated requests
      if (isLikelyBot(userAgent)) {
        console.log(`[EmailEngagement] Skipping notification — bot/prefetch UA: ${userAgent?.substring(0, 60)}`);
        const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
        res.set('Content-Type', 'image/gif');
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
        return res.send(pixel);
      }
      
      const db = await getDb();
      
      // Timing check — if email was sent within MIN_OPEN_DELAY_SECONDS, it's likely a prefetch
      if (db) {
        const { sql: sqlCheck } = await import('drizzle-orm');
        const [sentRows] = await db.execute(
          sqlCheck`SELECT sentAt FROM email_tracking WHERE trackingId = ${trackingId} LIMIT 1`
        );
        const sentRecord = (sentRows as any)?.[0];
        if (sentRecord?.sentAt) {
          const secondsSinceSend = (Date.now() - new Date(sentRecord.sentAt).getTime()) / 1000;
          if (secondsSinceSend < MIN_OPEN_DELAY_SECONDS) {
            console.log(`[EmailEngagement] Skipping notification — opened ${secondsSinceSend.toFixed(1)}s after send (threshold: ${MIN_OPEN_DELAY_SECONDS}s)`);
            const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
            res.set('Content-Type', 'image/gif');
            res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            res.set('Pragma', 'no-cache');
            res.set('Expires', '0');
            return res.send(pixel);
          }
        }
      }
      
      let isFirstOpen = false;
      if (db) {
        // Check for existing open event in legacy table
        const existing = await db
          .select()
          .from(emailEngagementEvents)
          .where(and(
            eq(emailEngagementEvents.trackingId, trackingId),
            eq(emailEngagementEvents.eventType, 'open')
          ))
          .limit(1);
        
        if (existing.length === 0) {
          isFirstOpen = true;
          await db.insert(emailEngagementEvents).values({
            trackingId,
            eventType: 'open',
            userAgent: userAgent || null,
            ipAddress: req.ip || null,
          });
        }
      }
      
      // On first open (passed bot + timing checks), look up client info
      // and create in-app + push notifications for admins
      if (isFirstOpen && db) {
        try {
          const { sql: sqlTag } = await import('drizzle-orm');
          const [trackingRows] = await db.execute(
            sqlTag`SELECT recipientName, recipientEmail, emailType, clientProtocolId, enrollmentId FROM email_tracking WHERE trackingId = ${trackingId} LIMIT 1`
          );
          const trackingRecord = (trackingRows as any)?.[0];
          if (trackingRecord) {
            const clientName = trackingRecord.recipientName || trackingRecord.recipientEmail || 'A client';
            const emailType = trackingRecord.emailType || 'email';
            
            // Create in-app notification
            const { createNotificationsForEnabledUsers } = await import('../db');
            await createNotificationsForEnabledUsers(
              'protocol_viewed',
              `${clientName} opened their ${emailType.replace(/_/g, ' ')} email`,
              `${clientName} opened their ${emailType.replace(/_/g, ' ')} email at ${new Date().toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })}.`,
              trackingRecord.clientProtocolId || undefined
            );
          }
        } catch (engagementNotifErr) {
          console.error('[EmailEngagement] Error creating notifications for email open:', engagementNotifErr);
        }
      }
    } catch (error) {
      console.error('[EmailEngagement] Error tracking open:', error);
    }
    
    // Return 1x1 transparent GIF
    const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    res.set('Content-Type', 'image/gif');
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.send(pixel);
  });
  
  // New engagement tracking - click redirect
  app.get('/api/email/track/click/:trackingId', trackingLimiter, async (req, res) => {
    const { trackingId } = req.params;
    const { url, name } = req.query;
    const targetUrl = url ? decodeURIComponent(url as string) : '';
    const linkName = name ? decodeURIComponent(name as string) : 'Unknown';
    
    try {
      // Track in new email_tracking table
      await recordEmailClick(trackingId, targetUrl, req.get('User-Agent'), req.ip || undefined);
      
      const { getDb } = await import('../db');
      const { emailEngagementEvents } = await import('../../drizzle/schema');
      const { v4: uuidv4 } = await import('uuid');
      
      const db = await getDb();
      if (db) {
        const clickId = `${trackingId}_click_${uuidv4().slice(0, 8)}`;
        await db.insert(emailEngagementEvents).values({
          trackingId: clickId,
          eventType: 'click',
          linkUrl: targetUrl,
          linkName,
          userAgent: req.get('User-Agent') || null,
          ipAddress: req.ip || null,
        });
      }
    } catch (error) {
      console.error('[EmailEngagement] Error tracking click:', error);
    }
    
    if (targetUrl) {
      res.redirect(targetUrl);
    } else {
      res.status(400).send('Missing URL parameter');
    }
  });
  
  // Email link click tracking endpoint
  app.get('/api/track/click/:token', trackingLimiter, async (req, res) => {
    try {
      const { token } = req.params;
      const { redirect, label, url, name } = req.query;
      const { recordEmailClick } = await import('../db');
      
      // Support both old (url/name) and new (redirect/label) query params
      // Decode the URL since it was encoded when creating the tracking link
      const rawTargetUrl = (redirect || url) as string || '';
      const targetUrl = rawTargetUrl ? decodeURIComponent(rawTargetUrl) : '';
      const linkLabel = (label || name) as string || 'Unknown Link';
      
      // Record the click
      await recordEmailClick(token, {
        linkUrl: targetUrl,
        linkName: linkLabel,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString(),
      });
      
      // Redirect to the actual URL
      if (targetUrl) {
        res.redirect(targetUrl);
      } else {
        res.status(400).send('Missing URL parameter');
      }
    } catch (error) {
      console.error('Error recording email click:', error);
      // Still redirect even if tracking fails
      const { redirect, url } = req.query;
      const rawTargetUrl = (redirect || url) as string;
      const targetUrl = rawTargetUrl ? decodeURIComponent(rawTargetUrl) : '';
      if (targetUrl) {
        res.redirect(targetUrl);
      } else {
        res.status(500).send('Error processing click');
      }
    }
  });
  
  // Prospect SMS click tracking
  app.get('/api/prospect/click/:trackingToken', trackingLimiter, async (req, res) => {
    try {
      const { trackingToken } = req.params;
      const { dest } = req.query;
      const destination = (dest as string) || '/transformation';
      
      // Record the click engagement
      const { getDb } = await import('../db');
      const d = await getDb();
      if (d) {
        const { prospects, prospectEngagement } = await import('../../drizzle/schema');
        const { eq, sql } = await import('drizzle-orm');
        
        // Find prospect by tracking token
        const [prospect] = await d.select().from(prospects).where(eq(prospects.trackingToken, trackingToken));
        if (prospect) {
          // Record engagement event
          await d.insert(prospectEngagement).values({
            prospectId: prospect.id,
            eventType: 'sms_link_click',
            url: destination,
            ipAddress: req.ip || null,
            userAgent: req.get('User-Agent') || null,
          });
          
          // Update prospect stats
          await d.update(prospects).set({
            lastClickedAt: new Date(),
            totalClicks: sql`${prospects.totalClicks} + 1`,
            status: ['new', 'contacted'].includes(prospect.status) ? 'clicked' : prospect.status,
          }).where(eq(prospects.id, prospect.id));
          
          console.log(`[Prospect Tracking] Click from ${prospect.name} (${prospect.id}) → ${destination}`);
        }
      }
      
      // Always redirect, even if tracking fails
      res.redirect(destination);
    } catch (error) {
      console.error('[Prospect Tracking] Error:', error);
      const { dest } = req.query;
      res.redirect((dest as string) || '/transformation');
    }
  });
  
  // Temporary Sentry connectivity test — remove after confirming events appear in Sentry
  app.get('/api/sentry-test', (_req, _res) => { throw new Error('Sentry test error — safe to ignore'); });

  // Email+Password auth routes (primary auth method)
  app.use('/api/auth', authLimiter);
  registerAuthRoutes(app);
  
  // OAuth callback under /api/oauth/callback (legacy - kept for existing sessions)
  // app.use('/api/oauth', authLimiter);
  // registerOAuthRoutes(app);
  
  // tRPC API with general rate limiting
  app.use(
    "/api/trpc",
    generalLimiter,
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // API catch-all: ensure any unmatched /api/* route returns JSON, not HTML.
  // Without this, unmatched API requests fall through to Vite/serveStatic
  // which returns index.html, causing "unexpected token <" errors on the client.
  app.use('/api', (_req, res) => {
    res.status(404).json({
      error: {
        json: {
          message: 'API endpoint not found',
          code: -32004,
          data: { code: 'NOT_FOUND', httpStatus: 404 },
        },
      },
    });
  });

  // Sentry error handler must come after all routes and before other error middleware
  if (process.env.SENTRY_DSN) {
    Sentry.setupExpressErrorHandler(app);
  }

  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);

    if (isStaging()) {
      console.log('[Startup] STAGING environment — cron jobs and email-reply polling are disabled.');
      return;
    }

    // Start the automated follow-up email cron job
    startFollowUpCron();
    
    // Start the automated low stock alert cron job
    startLowStockAlertCron();
    
    // Start the waiver expiration reminder cron job
    initWaiverExpirationCron();
    
    // Start the scheduled announcement cron job
    startScheduledAnnouncementCron();
    
    // Payment reminder cron - only sends to SENT protocols with pending payment (fixed Jan 20, 2026)
    startPaymentReminderCron();
    
    // Archived packing slip cleanup cron - auto-deletes archived slips after 30 days
    startArchivedPackingSlipCleanupCron();
    
    // Weekly check-in cron - sends check-ins every Thursday at 10 AM, reminders, and low score alerts
    initCheckinCron();
    
    // Daily/weekly digest emails for coaches
    initializeDigestCron();
    
    // Scheduled email delivery reports
    initEmailReportCron();
    
    // Session reminder cron - sends 24-hour reminders for upcoming coaching sessions
    initSessionReminderCron();
    
    // Enrollment follow-up cron - sends reminders 48-72 hours after payment if account not linked
    initEnrollmentFollowUpCron();
    
    // Intake form reminder cron - sends 24h and 72h reminders for incomplete intake forms after payment
    initIntakeFormReminderCron();
    
    // Protocol expiration alerts - notifies coaches when protocols are approaching end date
    startProtocolExpirationCron();
    
    // Weekly expiration digest - sends summary email every Monday at 9 AM
    startWeeklyExpirationDigestCron();
    
    // DISABLED: Abandoned checkout recovery cron removed per owner request
    // startAbandonedCheckoutCron();
    
    // Stalled client detector - daily check for clients stuck in onboarding >48hrs
    initStalledClientCron();

    // Weekly team digest - sends summary every Monday at 8 AM to Jason, Shannon, Lisa, Vee
    initWeeklyTeamDigestCron();

    // Shannon's daily pipeline scorecard email - sends every day at 8 AM
    initShannonDailyPipelineCron();
    
    // Post-discovery follow-up - checks every 6 hours for unconverted discovery sessions, tasks Shannon
    initPostDiscoveryFollowUpCron();
    
    // Strategy session scheduling monitor - checks every 6 hours for paid clients without scheduled sessions
    initStrategySessionMonitorCron();
    
    // Backorder task auto-assignment & tracking notifications - every 4 hours
    initBackorderAndTrackingCron();
    
    // Task escalation - every 12 hours, escalates tasks overdue by 48+ hours to the next person up
    initTaskEscalationCron();
    
    // Nightly reconciliation - runs at 2 AM to fix stages, link prospects, scan duplicates
    startNightlyReconciliationCron();
    
    // Email Reply Bridge - polls Gmail IMAP for client replies to chat notification emails
    startEmailReplyPolling();

    // Daily DB backup to R2 at 3:00 AM UTC — keeps last 7 days
    initDbBackupCron();
  });
}

startServer().catch(console.error);
