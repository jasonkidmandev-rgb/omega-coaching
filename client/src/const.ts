export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Generate login URL - now points to local login page instead of OAuth
// Optional returnTo parameter specifies where to redirect after successful login.
export const getLoginUrl = (returnTo?: string, _rememberMe: boolean = true) => {
  const loginPath = "/login";
  if (returnTo) {
    return `${loginPath}?returnTo=${encodeURIComponent(returnTo)}`;
  }
  return loginPath;
};
