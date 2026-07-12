import { useLocation } from "wouter";
import { ArrowRight } from "lucide-react";
import { HumanEdgeMark, Wordmark, AuroraBackground } from "@/components/HumanEdgeBrand";

export default function Cover() {
  const [, setLocation] = useLocation();
  const year = new Date().getFullYear();

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <AuroraBackground />

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
    </div>
  );
}
