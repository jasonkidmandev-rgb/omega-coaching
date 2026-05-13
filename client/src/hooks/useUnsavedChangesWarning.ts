import { useEffect, useRef } from 'react';

/**
 * Hook that warns users when they try to navigate away with unsaved changes.
 * 
 * Handles two scenarios:
 * 1. Browser navigation (closing tab, refreshing, typing a new URL) via `beforeunload`
 * 2. In-app navigation via wouter's `useLocation` - we intercept by patching pushState/replaceState
 * 
 * @param hasUnsavedChanges - Whether there are currently unsaved changes
 * @param message - Custom warning message (used for in-app navigation confirm dialog)
 */
export function useUnsavedChangesWarning(
  hasUnsavedChanges: boolean,
  message: string = 'You have unsaved changes. Are you sure you want to leave?'
) {
  const hasChangesRef = useRef(hasUnsavedChanges);
  const messageRef = useRef(message);

  // Keep refs in sync
  useEffect(() => {
    hasChangesRef.current = hasUnsavedChanges;
  }, [hasUnsavedChanges]);

  useEffect(() => {
    messageRef.current = message;
  }, [message]);

  // Handle browser beforeunload (tab close, refresh, external navigation)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!hasChangesRef.current) return;
      e.preventDefault();
      // Modern browsers ignore custom messages but still show a generic prompt
      e.returnValue = messageRef.current;
      return messageRef.current;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Handle in-app navigation via pushState/replaceState (wouter uses these)
  useEffect(() => {
    const originalPushState = history.pushState.bind(history);
    const originalReplaceState = history.replaceState.bind(history);

    const interceptNavigation = (
      original: typeof history.pushState,
      ...args: Parameters<typeof history.pushState>
    ) => {
      if (hasChangesRef.current) {
        const confirmed = window.confirm(messageRef.current);
        if (!confirmed) return; // Block navigation
      }
      original(...args);
    };

    history.pushState = (...args) => interceptNavigation(originalPushState, ...args);
    history.replaceState = (...args) => interceptNavigation(originalReplaceState, ...args);

    // Also handle browser back/forward buttons
    const handlePopState = (e: PopStateEvent) => {
      if (hasChangesRef.current) {
        const confirmed = window.confirm(messageRef.current);
        if (!confirmed) {
          // Push the current state back to prevent navigation
          // This is a best-effort approach since popstate can't be truly cancelled
          e.stopImmediatePropagation();
        }
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);
}
