// Force all date formatting to America/Denver (Mountain Time) — MUST be first import
import "@/lib/timezonePolyfill";
import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { MutationCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import { toast } from "sonner";
import superjson from "superjson";
import App from "./App";
import { getLoginUrl } from "./const";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Reduce refetch frequency to prevent rate limiting
      staleTime: 30_000, // Data is fresh for 30 seconds
      refetchOnWindowFocus: false, // Don't refetch when tab regains focus
      retry: 1, // Only retry once on failure
    },
    mutations: {
      // Global onError for all mutations - shows a toast if the mutation
      // doesn't have its own onError handler (or even if it does, as a safety net)
      onError: (error: unknown) => {
        // Don't show toast for auth redirects
        if (error instanceof TRPCClientError && error.message === UNAUTHED_ERR_MSG) return;
        // Don't show duplicate toasts for errors already handled by autosave components
        if (error instanceof TRPCClientError) {
          const msg = error.message;
          if (msg.includes('Too many requests')) return;
          if (msg.includes('Server error')) return; // Handled by autosave retry logic
          if (msg.includes('Server temporarily unavailable')) return;
          if (msg.includes('payload too large')) return;
        }
        const message = error instanceof Error ? error.message : "Something went wrong. Please try again.";
        toast.error(message);
      },
    },
  },
});

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  // Don't redirect to login on public pages (transformation journey, payment success, etc.)
  const publicPaths = ["/transformation", "/payment/success", "/payment-success", "/login", "/signin", "/set-password", "/forgot-password", "/partners", "/protocol/", "/payments/", "/intake", "/checkin"];
  const currentPath = window.location.pathname;
  if (publicPaths.some(p => currentPath.startsWith(p))) {
    console.log("[Auth] Skipping login redirect on public page:", currentPath);
    return;
  }

  window.location.href = getLoginUrl();
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        }).then(async (res) => {
          const contentType = res.headers.get('content-type') || '';

          // Handle non-JSON error responses (HTML from proxy, rate limiter, or catch-all)
          if (!res.ok && !contentType.includes('application/json')) {
            const body = await res.text();
            console.error('[tRPC] Non-JSON error response:', res.status, contentType, body.substring(0, 200));

            let message = 'Server error. Please try again.';
            if (res.status === 429) {
              message = 'Too many requests. Please wait a moment.';
            } else if (res.status === 413) {
              message = 'Request payload too large. Try saving smaller sections individually.';
            } else if (res.status === 502 || res.status === 503 || res.status === 504) {
              message = 'Server temporarily unavailable. Please try again in a moment.';
            }

            // Return a synthetic JSON response that tRPC can parse
            return new Response(JSON.stringify({
              error: {
                json: {
                  message,
                  code: -32000,
                  data: { code: 'INTERNAL_SERVER_ERROR', httpStatus: res.status },
                },
              },
            }), {
              status: res.status,
              headers: { 'content-type': 'application/json' },
            });
          }
          return res;
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);
