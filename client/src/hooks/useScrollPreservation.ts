import { useRef, useEffect, useCallback } from 'react';

/**
 * Hook to preserve scroll position after mutations/updates
 * 
 * Usage:
 * const { saveScrollPosition, restoreScrollPosition } = useScrollPreservation();
 * 
 * // Before mutation
 * saveScrollPosition();
 * await someMutation.mutateAsync(data);
 * // After mutation success, call restoreScrollPosition() or let useEffect handle it
 */
export function useScrollPreservation() {
  const savedScrollPosition = useRef<number | null>(null);
  const shouldRestoreScroll = useRef(false);

  // Auto-restore scroll position on each render if flagged
  useEffect(() => {
    if (shouldRestoreScroll.current && savedScrollPosition.current !== null) {
      requestAnimationFrame(() => {
        window.scrollTo(0, savedScrollPosition.current!);
        savedScrollPosition.current = null;
        shouldRestoreScroll.current = false;
      });
    }
  });

  const saveScrollPosition = useCallback(() => {
    savedScrollPosition.current = window.scrollY;
    shouldRestoreScroll.current = true;
  }, []);

  const restoreScrollPosition = useCallback(() => {
    if (savedScrollPosition.current !== null) {
      requestAnimationFrame(() => {
        window.scrollTo(0, savedScrollPosition.current!);
        savedScrollPosition.current = null;
        shouldRestoreScroll.current = false;
      });
    }
  }, []);

  const clearSavedPosition = useCallback(() => {
    savedScrollPosition.current = null;
    shouldRestoreScroll.current = false;
  }, []);

  return {
    saveScrollPosition,
    restoreScrollPosition,
    clearSavedPosition,
    currentSavedPosition: savedScrollPosition.current,
  };
}

/**
 * Hook to prevent scroll-to-top behavior on state changes
 * This wraps common mutation patterns to automatically preserve scroll
 */
export function usePreservedMutation<T extends (...args: any[]) => Promise<any>>(
  mutationFn: T,
  options?: {
    onSuccess?: () => void;
    onError?: (error: any) => void;
  }
) {
  const { saveScrollPosition, restoreScrollPosition } = useScrollPreservation();

  const wrappedMutate = useCallback(async (...args: Parameters<T>) => {
    saveScrollPosition();
    try {
      const result = await mutationFn(...args);
      restoreScrollPosition();
      options?.onSuccess?.();
      return result;
    } catch (error) {
      restoreScrollPosition();
      options?.onError?.(error);
      throw error;
    }
  }, [mutationFn, saveScrollPosition, restoreScrollPosition, options]);

  return wrappedMutate;
}

export default useScrollPreservation;
