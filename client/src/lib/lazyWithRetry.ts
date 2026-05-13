import { lazy, ComponentType } from "react";

/**
 * A wrapper around React.lazy() that retries failed dynamic imports.
 *
 * When a new version is deployed, chunk filenames change. Users with
 * cached HTML may request old chunk URLs that no longer exist, causing
 * "Failed to fetch dynamically imported module" errors.
 *
 * This utility:
 * 1. Retries the import up to `maxRetries` times with exponential backoff
 * 2. On final failure, forces a page reload (once per session) to fetch fresh HTML
 * 3. Falls through to the ErrorBoundary if the reload already happened
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  maxRetries = 2
): React.LazyExoticComponent<T> {
  return lazy(async () => {
    const RELOAD_KEY = "lazy_import_reload";

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Add cache-busting query param on retries
        if (attempt > 0) {
          // Small delay with exponential backoff
          await new Promise((r) => setTimeout(r, 500 * Math.pow(2, attempt - 1)));
        }
        const module = await importFn();
        // Success — clear any reload flag
        sessionStorage.removeItem(RELOAD_KEY);
        return module;
      } catch (error) {
        console.warn(
          `[lazyWithRetry] Import attempt ${attempt + 1}/${maxRetries + 1} failed:`,
          (error as Error).message
        );

        if (attempt === maxRetries) {
          // All retries exhausted — try a full page reload once
          const lastReload = sessionStorage.getItem(RELOAD_KEY);
          const now = Date.now();

          if (!lastReload || now - parseInt(lastReload, 10) > 15000) {
            sessionStorage.setItem(RELOAD_KEY, now.toString());
            console.warn("[lazyWithRetry] All retries failed — reloading page for fresh assets.");
            window.location.reload();
            // Return a never-resolving promise to prevent rendering during reload
            return new Promise(() => {});
          }

          // Already reloaded recently — let the error propagate to ErrorBoundary
          throw error;
        }
      }
    }

    // TypeScript safety — should never reach here
    throw new Error("lazyWithRetry: unexpected code path");
  });
}
