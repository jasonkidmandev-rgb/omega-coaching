import { cn } from "@/lib/utils";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
}

/**
 * Detects if an error is a dynamic import / chunk loading failure.
 * These happen when a new deploy changes chunk hashes but the user's
 * browser still has the old HTML cached with stale chunk URLs.
 */
function isChunkLoadError(error: Error): boolean {
  const msg = error.message || "";
  return (
    msg.includes("Failed to fetch dynamically imported module") ||
    msg.includes("Importing a module script failed") ||
    msg.includes("Loading chunk") ||
    msg.includes("Loading CSS chunk") ||
    msg.includes("error loading dynamically imported module") ||
    // Safari-specific
    msg.includes("Unexpected token '<'") ||
    error.name === "ChunkLoadError"
  );
}

const MAX_AUTO_RETRIES = 1;
const RETRY_KEY = "chunk_error_reload";

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, retryCount: 0 };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    // If it's a chunk load error, try an automatic reload (once)
    if (isChunkLoadError(error)) {
      const lastReload = sessionStorage.getItem(RETRY_KEY);
      const now = Date.now();

      // Only auto-reload if we haven't done so in the last 10 seconds
      if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
        sessionStorage.setItem(RETRY_KEY, now.toString());
        console.warn(
          "[ErrorBoundary] Chunk load error detected — auto-reloading to fetch fresh assets.",
          error.message
        );
        window.location.reload();
        return;
      }
    }
  }

  handleReload = () => {
    sessionStorage.removeItem(RETRY_KEY);
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const isChunk = this.state.error
        ? isChunkLoadError(this.state.error)
        : false;

      return (
        <div className="flex items-center justify-center min-h-screen p-8 bg-background">
          <div className="flex flex-col items-center w-full max-w-2xl p-8">
            <AlertTriangle
              size={48}
              className="text-destructive mb-6 flex-shrink-0"
            />

            <h2 className="text-xl mb-4">
              {isChunk
                ? "A new version is available."
                : "An unexpected error occurred."}
            </h2>

            {isChunk ? (
              <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
                The page you requested has been updated. Click below to load the
                latest version.
              </p>
            ) : (
              <div className="p-4 w-full rounded bg-muted overflow-auto mb-6">
                <pre className="text-sm text-muted-foreground whitespace-break-spaces">
                  {this.state.error?.message}
                </pre>
              </div>
            )}

            <button
              onClick={this.handleReload}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg",
                "bg-primary text-primary-foreground",
                "hover:opacity-90 cursor-pointer"
              )}
            >
              <RotateCcw size={16} />
              {isChunk ? "Load Latest Version" : "Reload Page"}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
