import * as React from "react";

const MOBILE_BREAKPOINT = 768;

/**
 * True below `breakpoint` px. Defaults to Tailwind's `md` (768).
 *
 * Pass a breakpoint when a component switches layouts somewhere else — the client
 * dashboard's chat panel flips at `lg` (1024), and using the 768 default there would
 * leave a 768–1024 band where the wrong panel renders.
 *
 * Initialised from `window` on first render rather than `undefined`, so a mobile
 * visitor doesn't briefly get the desktop branch before the effect runs. That matters
 * wherever this decides which component to MOUNT (not just how to style one) — a
 * throwaway mount can fire a query before it unmounts.
 */
export function useIsMobile(breakpoint: number = MOBILE_BREAKPOINT) {
  const [isMobile, setIsMobile] = React.useState<boolean>(() =>
    typeof window === "undefined" ? false : window.innerWidth < breakpoint
  );

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < breakpoint);
    return () => mql.removeEventListener("change", onChange);
  }, [breakpoint]);

  return isMobile;
}
