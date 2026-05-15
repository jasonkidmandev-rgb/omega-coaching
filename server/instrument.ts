import * as Sentry from "@sentry/node";

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    integrations: [Sentry.expressIntegration()],
    tracesSampleRate: 0.1,
    environment: process.env.NODE_ENV || "development",
  });
  console.log("[Sentry] Initialized — error tracking active");
} else {
  console.warn("[Sentry] SENTRY_DSN not set — error tracking disabled");
}
