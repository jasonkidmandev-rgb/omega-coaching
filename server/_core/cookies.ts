import type { CookieOptions, Request } from "express";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function isIpAddress(host: string) {
  // Basic IPv4 check and IPv6 presence detection.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  return host.includes(":");
}

function isSecureRequest(req: Request) {
  if (req.protocol === "https") return true;

  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;

  const protoList = Array.isArray(forwardedProto)
    ? forwardedProto
    : forwardedProto.split(",");

  return protoList.some(proto => proto.trim().toLowerCase() === "https");
}

function isLocalRequest(req: Request) {
  const hostname = req.hostname;
  return LOCAL_HOSTS.has(hostname) || isIpAddress(hostname);
}

export function getSessionCookieOptions(
  req: Request
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  const isSecure = isSecureRequest(req);
  const isLocal = isLocalRequest(req);
  
  // For production (HTTPS), use sameSite: "lax" which is more compatible
  // than "none" and doesn't require third-party cookie support.
  // "lax" allows cookies on top-level navigations (like OAuth redirects)
  // while still providing CSRF protection.
  // 
  // For local development (HTTP), use sameSite: "lax" without secure flag.
  //
  // Note: "none" requires secure:true and third-party cookie support,
  // which many browsers block by default. "lax" is more permissive for
  // same-site navigations and OAuth flows.
  
  if (isLocal) {
    // Local development - no secure flag needed
    return {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: false,
    };
  }
  
  // Production - use lax for better compatibility with OAuth redirects
  // The cookie will be sent on top-level navigations (GET requests)
  // which is exactly what happens during OAuth callback redirects
  return {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: isSecure,
  };
}
