import { useId } from "react";
import { useLocation } from "wouter";
import { ArrowRight } from "lucide-react";

/**
 * HumanEdge mark — a rounded gradient tile with an upward "edge" chevron
 * (momentum / rising). Uses a unique gradient id per instance so multiple
 * marks on one page don't collide.
 */
function HumanEdgeMark({ className = "h-12 w-12" }: { className?: string }) {
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

function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-bold tracking-tight ${className}`}>
      Human
      <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
        Edge
      </span>
    </span>
  );
}

export default function Cover() {
  const [, setLocation] = useLocation();
  const year = new Date().getFullYear();

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      {/* Animated aurora background */}
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
      {/* Subtle grid + vignette */}
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

      {/* Content */}
      <div className="relative z-10 flex min-h-screen flex-col">
        {/* Header */}
        <header className="flex items-center justify-between px-5 py-5 sm:px-8">
          <div className="flex items-center gap-2.5">
            <HumanEdgeMark className="h-8 w-8" />
            <Wordmark className="text-lg" />
          </div>
          <button
            onClick={() => setLocation("/login")}
            className="rounded-full px-4 py-1.5 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
          >
            Log in
          </button>
        </header>

        {/* Hero */}
        <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <HumanEdgeMark className="mb-7 h-16 w-16 rounded-2xl shadow-2xl shadow-amber-500/20 sm:h-20 sm:w-20" />

          <h1 className="text-5xl font-bold leading-none tracking-tight sm:text-6xl md:text-7xl">
            <Wordmark />
          </h1>

          <p className="mt-6 max-w-xl text-lg text-slate-300 sm:text-xl">
            Personalized coaching for how you want to feel.
          </p>
          <p className="mt-3 max-w-md text-sm text-slate-400">
            Your private portal for coaching, protocols, and progress — all in one place.
          </p>

          <div className="mt-10 flex w-full max-w-md flex-col items-center gap-3 sm:w-auto sm:flex-row">
            <button
              onClick={() => setLocation("/login")}
              className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-7 py-3.5 font-semibold text-white shadow-lg shadow-orange-500/25 transition-all hover:from-amber-400 hover:to-orange-400 hover:shadow-orange-500/40 sm:w-auto"
            >
              Log in
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
            <button
              onClick={() => setLocation("/transformation")}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-6 py-3.5 text-sm font-medium text-slate-200 backdrop-blur-sm transition-colors hover:border-white/20 hover:bg-white/10 sm:w-auto"
            >
              New here? Learn about coaching
            </button>
          </div>
        </main>

        {/* Footer */}
        <footer className="relative z-10 px-6 py-6 text-center text-xs text-slate-500">
          <div className="flex items-center justify-center gap-3">
            <a href="/privacy" className="transition-colors hover:text-slate-300">
              Privacy
            </a>
            <span aria-hidden>·</span>
            <a href="/terms" className="transition-colors hover:text-slate-300">
              Terms
            </a>
          </div>
          <p className="mt-2">© {year} HumanEdge</p>
        </footer>
      </div>

      {/* Keyframes for the aurora drift */}
      <style>{`
        @keyframes he-float-1 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(40px,-30px) scale(1.12); } }
        @keyframes he-float-2 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-36px,24px) scale(1.08); } }
        @keyframes he-float-3 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(24px,30px) scale(1.15); } }
        @media (prefers-reduced-motion: reduce) {
          [style*="he-float"] { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
