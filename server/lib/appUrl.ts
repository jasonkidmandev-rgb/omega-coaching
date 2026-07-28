/**
 * The single source of truth for "what is this app's public base URL".
 *
 * This existed as ~70 copies of `process.env.VITE_APP_URL || 'https://peptidecoach.pro'`
 * scattered across 24 server files. Two problems with that:
 *
 *  1. The fallback named the OLD Manus site. Every one of those copies sits in a
 *     client-facing link — check-in URLs, payment portals, protocol links, intake
 *     forms, password resets. If VITE_APP_URL were ever unset or misspelled in the
 *     Railway service, the app would silently mail clients back to peptidecoach.pro
 *     instead of erroring, so the misconfiguration would be invisible to us and
 *     confusing to them.
 *  2. Being duplicated, it could never be corrected in one place.
 *
 * The fallback is now the current domain, and it lives here only.
 */

/** Correct public origin for the app when the environment does not say otherwise. */
export const APP_URL_FALLBACK = "https://www.humanedge.health";

/**
 * The app's public base URL, without a trailing slash.
 *
 * Prefers `VITE_APP_URL` (set per-environment in Railway); falls back to the current
 * production domain. Callers building a path should do `${getAppBaseUrl()}/checkin/1`.
 */
export function getAppBaseUrl(): string {
  const configured = process.env.VITE_APP_URL?.trim();
  const base = configured && configured.length > 0 ? configured : APP_URL_FALLBACK;
  // Normalise: a trailing slash here turns every `${base}/path` into a double slash,
  // which breaks link matching and looks wrong in emails.
  return base.replace(/\/+$/, "");
}

/**
 * Base URL for a link we are about to put in front of a specific user, preferring the
 * origin their request actually came from. Falls back to `getAppBaseUrl()`.
 *
 * Use this in request-scoped code (tRPC procedures, express handlers) so a request that
 * arrives on a preview/staging host keeps generating links back to that same host.
 */
export function getRequestBaseUrl(origin?: string | null): string {
  const trimmed = origin?.trim();
  if (trimmed && /^https?:\/\//i.test(trimmed)) return trimmed.replace(/\/+$/, "");
  return getAppBaseUrl();
}
