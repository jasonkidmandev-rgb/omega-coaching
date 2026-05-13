import { useEffect, useRef } from 'react';
import { useLocation } from 'wouter';

// Store scroll positions per route in sessionStorage
const SCROLL_POSITIONS_KEY = 'scroll_positions';

function getScrollPositions(): Record<string, number> {
  try {
    const stored = sessionStorage.getItem(SCROLL_POSITIONS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveScrollPosition(path: string, position: number) {
  try {
    const positions = getScrollPositions();
    positions[path] = position;
    // Keep only the last 50 positions to prevent storage bloat
    const keys = Object.keys(positions);
    if (keys.length > 50) {
      const oldestKey = keys[0];
      delete positions[oldestKey];
    }
    sessionStorage.setItem(SCROLL_POSITIONS_KEY, JSON.stringify(positions));
  } catch {
    // Ignore storage errors
  }
}

export function ScrollRestoration() {
  const [location] = useLocation();
  const previousLocation = useRef<string | null>(null);
  const isInitialMount = useRef(true);
  const isPopState = useRef(false);

  // Listen for popstate events (browser back/forward buttons)
  useEffect(() => {
    const handlePopState = () => {
      isPopState.current = true;
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Save scroll position on scroll (debounced)
  useEffect(() => {
    const handleScroll = () => {
      if (previousLocation.current) {
        saveScrollPosition(previousLocation.current, window.scrollY);
      }
    };

    let scrollTimeout: NodeJS.Timeout;
    const debouncedScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(handleScroll, 100);
    };

    window.addEventListener('scroll', debouncedScroll, { passive: true });
    return () => {
      clearTimeout(scrollTimeout);
      window.removeEventListener('scroll', debouncedScroll);
    };
  }, []);

  // Handle route changes
  useEffect(() => {
    // Save position of previous page before navigating away
    if (previousLocation.current && previousLocation.current !== location) {
      saveScrollPosition(previousLocation.current, window.scrollY);
    }

    // Skip scroll restoration for protocol pages - they have their own scroll handling
    const isProtocolPage = location.startsWith('/protocol/');
    const isClientEditPage = location.match(/^\/admin\/clients\/\d+$/);
    
    if (isProtocolPage || isClientEditPage) {
      previousLocation.current = location;
      isInitialMount.current = false;
      isPopState.current = false;
      return;
    }

    if (isPopState.current) {
      // Browser back/forward button was pressed — restore saved position
      const positions = getScrollPositions();
      const savedPosition = positions[location];
      
      // Use a longer delay for popstate to ensure the page content is fully rendered
      setTimeout(() => {
        if (savedPosition !== undefined) {
          window.scrollTo(0, savedPosition);
        } else {
          window.scrollTo(0, 0);
        }
      }, 50);
      
      isPopState.current = false;
    } else if (!isInitialMount.current) {
      // Forward navigation (programmatic) — scroll to top
      window.scrollTo(0, 0);
    }

    previousLocation.current = location;
    isInitialMount.current = false;
  }, [location]);

  return null;
}
