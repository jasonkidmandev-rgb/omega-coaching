import { useEffect, useRef } from "react";
import { trpc } from "../lib/trpc";

// Generate a session ID that persists for the browser session
function getSessionId(): string {
  let sessionId = sessionStorage.getItem("_pv_sid");
  if (!sessionId) {
    sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
    sessionStorage.setItem("_pv_sid", sessionId);
  }
  return sessionId;
}

/**
 * Hook that tracks page views automatically.
 * Place this in the root App component.
 */
export function usePageTracker() {
  const trackMutation = trpc.webTraffic.track.useMutation();
  const lastTrackedPath = useRef<string>("");
  const startTime = useRef<number>(Date.now());

  useEffect(() => {
    const trackPageView = () => {
      const path = window.location.pathname;
      
      // Don't track admin pages or duplicate consecutive views
      if (path.startsWith("/admin") || path === lastTrackedPath.current) {
        return;
      }

      lastTrackedPath.current = path;
      const loadTime = Date.now() - startTime.current;
      startTime.current = Date.now();

      trackMutation.mutate({
        path,
        referrer: document.referrer || undefined,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        sessionId: getSessionId(),
        loadTime: loadTime > 0 && loadTime < 60000 ? loadTime : undefined,
      });
    };

    // Track initial page view
    trackPageView();

    // Listen for SPA navigation changes via popstate
    const handlePopState = () => {
      startTime.current = Date.now();
      setTimeout(trackPageView, 100);
    };
    window.addEventListener("popstate", handlePopState);

    // Intercept pushState/replaceState for SPA routing
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function (...args) {
      originalPushState.apply(this, args);
      startTime.current = Date.now();
      setTimeout(trackPageView, 100);
    };

    history.replaceState = function (...args) {
      originalReplaceState.apply(this, args);
      startTime.current = Date.now();
      setTimeout(trackPageView, 100);
    };

    return () => {
      window.removeEventListener("popstate", handlePopState);
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
