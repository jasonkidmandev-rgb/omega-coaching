/**
 * Access token for a transformation enrollment (the intake form).
 *
 * The intake form endpoints require proof that the caller owns the enrollment: a staff
 * session, a signed-in owner, or this token. Guests filling in the form have none of the
 * first two, so the token has to survive between page loads — specifically across the
 * Stripe redirect, where the client leaves the app entirely and comes back to
 * /payment/success with nothing but ?enrollmentId= in the URL.
 *
 * sessionStorage, not the URL: a URL-borne token would end up in browser history, in the
 * Referer header sent to Stripe, and in any analytics that record page paths. This one
 * opens a medical intake form, so it stays out of the address bar. sessionStorage is
 * per-tab and cleared when the tab closes, which matches how long the flow lives.
 *
 * The key names are the ones TransformationVerify.tsx already writes when a client
 * arrives from the emailed magic link, so both entry points share one mechanism.
 */

const TOKEN_KEY = "transformationAuthToken";
const ENROLLMENT_KEY = "transformationEnrollmentId";

export function rememberEnrollmentAccess(enrollmentId: number, accessToken: string | undefined | null): void {
  if (!accessToken) return;
  try {
    sessionStorage.setItem(TOKEN_KEY, accessToken);
    sessionStorage.setItem(ENROLLMENT_KEY, String(enrollmentId));
  } catch {
    // Private browsing / storage disabled. The client can still use the emailed link.
  }
}

/**
 * Returns the stored token only if it belongs to the enrollment being asked about, so a
 * stale token from an earlier enrollment in the same tab is never sent for a new one.
 */
export function getEnrollmentAccess(enrollmentId: number | null | undefined): string | undefined {
  if (!enrollmentId) return undefined;
  try {
    const storedId = sessionStorage.getItem(ENROLLMENT_KEY);
    if (storedId !== String(enrollmentId)) return undefined;
    return sessionStorage.getItem(TOKEN_KEY) || undefined;
  } catch {
    return undefined;
  }
}
