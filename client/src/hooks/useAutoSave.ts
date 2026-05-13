import { useState, useRef, useCallback, useEffect } from 'react';

type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'retrying';

interface UseAutoSaveOptions {
  debounceMs?: number;
  maxRetries?: number;
  retryDelayMs?: number;
  onSave: (content: string) => Promise<void>;
  onError?: (error: Error) => void;
}

export function useAutoSave({
  debounceMs = 1500,
  maxRetries = 2,
  retryDelayMs = 3000,
  onSave,
  onError,
}: UseAutoSaveOptions) {
  const [status, setStatus] = useState<AutoSaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const statusTimerRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastContentRef = useRef<string>('');
  const isMountedRef = useRef(true);
  const isSavingRef = useRef(false);
  const retryCountRef = useRef(0);
  const lastFailedContentRef = useRef<string>('');
  
  // Use refs for callbacks to avoid stale closures and dependency issues
  const onSaveRef = useRef(onSave);
  const onErrorRef = useRef(onError);
  
  // Keep refs up to date without triggering re-renders
  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);
  
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (statusTimerRef.current) {
        clearTimeout(statusTimerRef.current);
      }
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }
    };
  }, []);

  const save = useCallback(
    async (content: string) => {
      if (!isMountedRef.current) return;
      if (isSavingRef.current) return; // Prevent concurrent saves
      
      isSavingRef.current = true;
      setStatus(retryCountRef.current > 0 ? 'retrying' : 'saving');
      
      // Clear any existing status timer
      if (statusTimerRef.current) {
        clearTimeout(statusTimerRef.current);
      }
      
      try {
        await onSaveRef.current(content);
        if (isMountedRef.current) {
          setStatus('saved');
          setLastSavedAt(new Date());
          lastContentRef.current = content;
          retryCountRef.current = 0; // Reset retry count on success
          lastFailedContentRef.current = '';
          
          // Reset to idle after 3 seconds
          statusTimerRef.current = setTimeout(() => {
            if (isMountedRef.current) {
              setStatus('idle');
            }
          }, 3000);
        }
      } catch (error) {
        if (isMountedRef.current) {
          // Check if we should retry
          if (retryCountRef.current < maxRetries) {
            retryCountRef.current++;
            lastFailedContentRef.current = content;
            console.log(`[AutoSave] Retry ${retryCountRef.current}/${maxRetries} in ${retryDelayMs}ms...`);
            setStatus('retrying');
            
            // Schedule retry
            retryTimerRef.current = setTimeout(() => {
              isSavingRef.current = false; // Allow the retry save to proceed
              if (isMountedRef.current) {
                save(lastFailedContentRef.current);
              }
            }, retryDelayMs);
          } else {
            // All retries exhausted
            retryCountRef.current = 0;
            lastFailedContentRef.current = '';
            setStatus('error');
            onErrorRef.current?.(error as Error);
            
            // Reset to idle after 4 seconds
            statusTimerRef.current = setTimeout(() => {
              if (isMountedRef.current) {
                setStatus('idle');
              }
            }, 4000);
          }
        }
      } finally {
        // Only release the saving lock if we're not scheduling a retry
        if (retryCountRef.current === 0 || !isMountedRef.current) {
          isSavingRef.current = false;
        }
      }
    },
    [maxRetries, retryDelayMs] // Stable deps - uses refs for everything else
  );

  const debouncedSave = useCallback(
    (content: string) => {
      // Don't save if content hasn't changed from last saved
      if (content === lastContentRef.current) return;

      // Clear existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Set new timer
      debounceTimerRef.current = setTimeout(() => {
        save(content);
      }, debounceMs);
    },
    [save, debounceMs]
  );

  const saveNow = useCallback(
    (content: string) => {
      // Clear any pending debounced save
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      // Reset retry count for manual saves
      retryCountRef.current = 0;
      save(content);
    },
    [save]
  );

  const setInitialContent = useCallback((content: string) => {
    lastContentRef.current = content;
  }, []);

  return {
    status,
    lastSavedAt,
    debouncedSave,
    saveNow,
    setInitialContent,
  };
}

// Helper to format last saved time
export function formatLastSaved(date: Date | null): string {
  if (!date) return '';
  
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  
  if (diffSecs < 5) return 'just now';
  if (diffSecs < 60) return `${diffSecs} seconds ago`;
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
