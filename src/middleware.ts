/**
 * Next.js Edge Middleware.
 * Enforces HTTPS in production by redirecting any plain-HTTP request
 * to its HTTPS equivalent. All requests pass through unchanged in development.
 *
 * Requirement: 10.2
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest): NextResponse {
  // In development, allow all requests through without modification
  if (process.env.NODE_ENV !== "production") {
    return NextResponse.next();
  }

  const { headers, nextUrl } = request;

  // Check the protocol via the x-forwarded-proto header (set by most reverse
  // proxies / load balancers) or fall back to the URL protocol.
  const proto = headers.get("x-forwarded-proto") ?? nextUrl.protocol.replace(":", "");

  if (proto !== "https") {
    // Build the HTTPS equivalent URL and issue a permanent redirect
    const httpsUrl = new URL(request.url);
    httpsUrl.protocol = "https:";
    return NextResponse.redirect(httpsUrl, { status: 301 });
  }

  return NextResponse.next();
}

// ============================================================
// Route matcher
// ============================================================

/**
 * Apply this middleware to all routes except:
 *  - Next.js internal routes (_next/*)
 *  - Static files served from the public directory
 *  - Favicon
 */
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot)).*)",
  ],
};
