import { useCallback } from "react";
import { useLocation } from "wouter";

/**
 * Returns a "go back" handler for page-level back buttons.
 *
 * Prefers real browser-history back so the user returns to wherever they
 * actually came from (a search, a list, a detail page they clicked through),
 * instead of always jumping to one fixed page. Falls back to a sensible fixed
 * path when there's no in-app history to go back to — e.g. the page was opened
 * cold via a deep link / emailed URL.
 *
 * Usage: replace a hard-coded back button
 *   onClick={() => setLocation('/admin/clients')}
 * with
 *   const goBack = useGoBack('/admin/clients');
 *   ... onClick={goBack}
 *
 * NOTE: only for page-to-page navigation back buttons. Do NOT use this for
 * in-component "back" controls (wizard steps, multi-view panels) — those should
 * keep their own state logic.
 */
export function useGoBack(fallback: string) {
  const [, setLocation] = useLocation();
  return useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
    } else {
      setLocation(fallback);
    }
  }, [fallback, setLocation]);
}
