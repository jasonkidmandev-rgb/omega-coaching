import { useId } from "react";

/**
 * HumanEdge logo mark — a rounded gradient tile with an upward "edge" chevron
 * (momentum / rising). Uses a unique gradient id per instance so multiple marks
 * on one page don't collide.
 *
 * Shared by the cover page and the login page so the logo lives in ONE place —
 * if the brand mark changes (or we swap in the Omega logo), edit only this file.
 */
export function HumanEdgeMark({ className = "h-12 w-12" }: { className?: string }) {
  const gid = useId();
  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-label="HumanEdge">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fbbf24" />
          <stop offset="1" stopColor="#ea580c" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="44" height="44" rx="13" fill={`url(#${gid})`} />
      <path
        d="M12 33 L24 16 L36 33"
        fill="none"
        stroke="#ffffff"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18 33 L24 25 L30 33"
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.5"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-bold tracking-tight ${className}`}>
      Human
      <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
        Edge
      </span>
    </span>
  );
}

/**
 * The dark aurora background used behind both the cover and login pages, so the
 * entry flow feels like one cohesive thing. Render inside a `relative` wrapper.
 */
export function AuroraBackground() {
  return (
    <>
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-1/4 -left-1/4 h-[45rem] w-[45rem] rounded-full bg-amber-500/20 blur-3xl"
          style={{ animation: "he-float-1 18s ease-in-out infinite" }}
        />
        <div
          className="absolute top-1/4 -right-1/4 h-[42rem] w-[42rem] rounded-full bg-orange-600/20 blur-3xl"
          style={{ animation: "he-float-2 22s ease-in-out infinite" }}
        />
        <div
          className="absolute -bottom-1/4 left-1/3 h-[36rem] w-[36rem] rounded-full bg-rose-500/10 blur-3xl"
          style={{ animation: "he-float-3 20s ease-in-out infinite" }}
        />
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 0%, rgba(2,6,23,0.55) 100%)",
        }}
      />
      <style>{`
        @keyframes he-float-1 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(40px,-30px) scale(1.12); } }
        @keyframes he-float-2 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-36px,24px) scale(1.08); } }
        @keyframes he-float-3 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(24px,30px) scale(1.15); } }
        @media (prefers-reduced-motion: reduce) { [style*="he-float"] { animation: none !important; } }
      `}</style>
    </>
  );
}
