/**
 * Structured Logging Service
 * Provides centralized logging with support for external monitoring services
 * (DataDog, Loggly, CloudWatch, etc.)
 */

import crypto from "crypto";

// Log levels
export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

// Log entry structure
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  service: string;
  environment: string;
  requestId?: string;
  userId?: number;
  userEmail?: string;
  traceId?: string;
  spanId?: string;
  duration?: number;
  metadata?: Record<string, any>;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
  http?: {
    method: string;
    path: string;
    statusCode?: number;
    userAgent?: string;
    ip?: string;
  };
  security?: {
    eventType: string;
    severity: string;
    blocked?: boolean;
  };
}

// Configuration
const config = {
  service: process.env.SERVICE_NAME || "health-coach-protocol",
  environment: process.env.NODE_ENV || "development",
  logLevel: (process.env.LOG_LEVEL || "info") as LogLevel,
  datadogApiKey: process.env.DATADOG_API_KEY,
  logglyToken: process.env.LOGGLY_TOKEN,
  enableConsole: process.env.DISABLE_CONSOLE_LOGS !== "true",
};

// Log level priority
const levelPriority: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
};

// Check if log level should be output
function shouldLog(level: LogLevel): boolean {
  return levelPriority[level] >= levelPriority[config.logLevel];
}

// Generate trace ID for request correlation
export function generateTraceId(): string {
  return crypto.randomBytes(16).toString("hex");
}

// Generate span ID for sub-operations
export function generateSpanId(): string {
  return crypto.randomBytes(8).toString("hex");
}

// Format log entry for console output
function formatConsoleLog(entry: LogEntry): string {
  const timestamp = entry.timestamp;
  const level = entry.level.toUpperCase().padEnd(5);
  const requestId = entry.requestId ? `[${entry.requestId.slice(0, 8)}]` : "";
  const userId = entry.userId ? `[user:${entry.userId}]` : "";
  
  let message = `${timestamp} ${level} ${requestId}${userId} ${entry.message}`;
  
  if (entry.http) {
    message += ` | ${entry.http.method} ${entry.http.path}`;
    if (entry.http.statusCode) {
      message += ` -> ${entry.http.statusCode}`;
    }
  }
  
  if (entry.duration !== undefined) {
    message += ` | ${entry.duration}ms`;
  }
  
  if (entry.error) {
    message += `\n  Error: ${entry.error.name}: ${entry.error.message}`;
    if (entry.error.stack && config.environment !== "production") {
      message += `\n  ${entry.error.stack}`;
    }
  }
  
  return message;
}

// Send log to DataDog
async function sendToDataDog(entry: LogEntry): Promise<void> {
  if (!config.datadogApiKey) return;
  
  try {
    const ddEntry = {
      ...entry,
      ddsource: "nodejs",
      ddtags: `env:${config.environment},service:${config.service}`,
      hostname: process.env.HOSTNAME || "unknown",
    };
    
    await fetch("https://http-intake.logs.datadoghq.com/api/v2/logs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "DD-API-KEY": config.datadogApiKey,
      },
      body: JSON.stringify([ddEntry]),
    });
  } catch (error) {
    // Silently fail - don't let logging failures affect the application
    console.error("[Logger] Failed to send to DataDog:", error);
  }
}

// Send log to Loggly
async function sendToLoggly(entry: LogEntry): Promise<void> {
  if (!config.logglyToken) return;
  
  try {
    await fetch(`https://logs-01.loggly.com/inputs/${config.logglyToken}/tag/http/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(entry),
    });
  } catch (error) {
    console.error("[Logger] Failed to send to Loggly:", error);
  }
}

// Main logging function
function log(level: LogLevel, message: string, metadata?: Partial<LogEntry>): void {
  if (!shouldLog(level)) return;
  
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    service: config.service,
    environment: config.environment,
    ...metadata,
  };
  
  // Console output
  if (config.enableConsole) {
    const formatted = formatConsoleLog(entry);
    switch (level) {
      case "debug":
        console.debug(formatted);
        break;
      case "info":
        console.info(formatted);
        break;
      case "warn":
        console.warn(formatted);
        break;
      case "error":
      case "fatal":
        console.error(formatted);
        break;
    }
  }
  
  // Send to external services (non-blocking)
  if (config.environment === "production" || config.datadogApiKey || config.logglyToken) {
    sendToDataDog(entry).catch(() => {});
    sendToLoggly(entry).catch(() => {});
  }
}

// Convenience methods
export const logger = {
  debug: (message: string, metadata?: Partial<LogEntry>) => log("debug", message, metadata),
  info: (message: string, metadata?: Partial<LogEntry>) => log("info", message, metadata),
  warn: (message: string, metadata?: Partial<LogEntry>) => log("warn", message, metadata),
  error: (message: string, metadata?: Partial<LogEntry>) => log("error", message, metadata),
  fatal: (message: string, metadata?: Partial<LogEntry>) => log("fatal", message, metadata),
  
  // Log HTTP request
  httpRequest: (
    method: string,
    path: string,
    statusCode: number,
    duration: number,
    metadata?: Partial<LogEntry>
  ) => {
    const level: LogLevel = statusCode >= 500 ? "error" : statusCode >= 400 ? "warn" : "info";
    log(level, `HTTP ${method} ${path}`, {
      ...metadata,
      duration,
      http: {
        method,
        path,
        statusCode,
        userAgent: metadata?.http?.userAgent,
        ip: metadata?.http?.ip,
      },
    });
  },
  
  // Log security event
  securityEvent: (
    eventType: string,
    severity: "low" | "medium" | "high" | "critical",
    message: string,
    metadata?: Partial<LogEntry>
  ) => {
    const level: LogLevel = severity === "critical" ? "fatal" : severity === "high" ? "error" : "warn";
    log(level, `[SECURITY] ${message}`, {
      ...metadata,
      security: {
        eventType,
        severity,
        blocked: metadata?.security?.blocked,
      },
    });
  },
  
  // Log error with stack trace
  exception: (error: Error, message?: string, metadata?: Partial<LogEntry>) => {
    log("error", message || error.message, {
      ...metadata,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: (error as any).code,
      },
    });
  },
  
  // Log with timing
  timed: async <T>(
    operation: string,
    fn: () => Promise<T>,
    metadata?: Partial<LogEntry>
  ): Promise<T> => {
    const start = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - start;
      log("info", `${operation} completed`, { ...metadata, duration });
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      log("error", `${operation} failed`, {
        ...metadata,
        duration,
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        } : { name: "Unknown", message: String(error) },
      });
      throw error;
    }
  },
  
  // Create child logger with preset metadata
  child: (defaultMetadata: Partial<LogEntry>) => ({
    debug: (message: string, metadata?: Partial<LogEntry>) => 
      log("debug", message, { ...defaultMetadata, ...metadata }),
    info: (message: string, metadata?: Partial<LogEntry>) => 
      log("info", message, { ...defaultMetadata, ...metadata }),
    warn: (message: string, metadata?: Partial<LogEntry>) => 
      log("warn", message, { ...defaultMetadata, ...metadata }),
    error: (message: string, metadata?: Partial<LogEntry>) => 
      log("error", message, { ...defaultMetadata, ...metadata }),
    fatal: (message: string, metadata?: Partial<LogEntry>) => 
      log("fatal", message, { ...defaultMetadata, ...metadata }),
  }),
};

// Request context middleware helper
export function createRequestLogger(requestId: string, userId?: number, userEmail?: string) {
  return logger.child({ requestId, userId, userEmail });
}

// Export for testing
export { config as loggerConfig };
