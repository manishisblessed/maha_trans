import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { MAX_BODY_BYTES } from "@/lib/env";
import { TENANT_HEADER, TENANT_DOMAIN_HEADER } from "@/lib/tenant/context";

const isDev = process.env.NODE_ENV !== "production";

// ── Tenant brand cache (in-memory, 5-minute TTL) ─────────────────────────
// Keeps hot tenant lookups out of the DB on every single request. This is a
// lightweight edge-compatible map — no external dependencies.
type CachedTenant = { id: string; expiresAt: number };
const tenantCache = new Map<string, CachedTenant | null>();
const TENANT_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function resolveTenantId(host: string): Promise<string | null> {
  const now = Date.now();
  const cached = tenantCache.get(host);
  if (cached !== undefined) {
    if (cached === null || cached.expiresAt > now) return cached?.id ?? null;
  }

  // Skip resolution for the platform's own domain
  const platformDomain = process.env.PLATFORM_DOMAIN ?? "transpe.in";
  const appHost = (process.env.NEXT_PUBLIC_APP_URL ?? "")
    .replace(/^https?:\/\//, "")
    .split(":")[0];

  // If this is the platform's root domain (not a subdomain), not a tenant
  if (host === appHost || host === platformDomain || host === `www.${platformDomain}`) {
    tenantCache.set(host, null);
    return null;
  }

  try {
    // Dynamic import to avoid pulling Prisma into the edge runtime
    const { prisma } = await import("@/lib/db");

    // Check if it's a subdomain of the platform domain (e.g. kapoor.transpe.in)
    let subdomain: string | null = null;
    if (host.endsWith(`.${platformDomain}`)) {
      subdomain = host.slice(0, -(`.${platformDomain}`.length));
    }

    const profile = await prisma.whitelabelProfile.findFirst({
      where: {
        status: "LIVE",
        OR: [
          { customDomain: host },
          ...(subdomain ? [{ subdomain }] : []),
        ],
      },
      select: { id: true },
    });

    const result = profile ? { id: profile.id, expiresAt: now + TENANT_CACHE_TTL_MS } : null;
    tenantCache.set(host, result);
    return profile?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Content-Security-Policy applied to every document response.
 *
 * Uses 'unsafe-inline' for script-src because Next.js 14.x does not reliably
 * propagate the x-nonce to every inline <script> it emits (bootstrap, data,
 * font-loader, etc.), causing the browser to block hydration entirely.
 *
 * TODO: migrate to nonce-based CSP once upgraded to Next.js 15+ which has
 * first-class nonce support via the `experimental.serverActions.nonce` flag.
 *
 * Cloudflare Turnstile (CAPTCHA) is explicitly allowlisted for script/frame/
 * connect so it works when SECURITY_CAPTCHA_ENABLED is on.
 */
function buildCsp(): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://res.cloudinary.com https://api.qrserver.com https://images.unsplash.com https://api.dicebear.com https://logo.clearbit.com",
    "font-src 'self' data:",
    "connect-src 'self' https://challenges.cloudflare.com https://ip-api.com https://api.cloudinary.com https://*.amazonaws.com",
    "frame-src 'self' https://challenges.cloudflare.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

const ADMIN_PATHS: Array<{ prefix: string; roles: string[] }> = [
  { prefix: "/dashboard/master-admin", roles: ["MASTER_ADMIN"] },
  { prefix: "/dashboard/sub-admin", roles: ["SUPPORT", "MASTER_ADMIN"] },
  // FINANCE gets read access to the admin area; write APIs enforce their own
  // stricter role checks (FINANCE is never accepted on mutating endpoints).
  { prefix: "/dashboard/admin", roles: ["MASTER_ADMIN", "ADMIN", "SUPPORT", "FINANCE"] },
];

/** BBPS bill-pay pages: only RETAILER can access. */
const BBPS_PATHS: Array<{ prefix: string; roles: string[] }> = [
  { prefix: "/dashboard/bill-pay", roles: ["RETAILER"] },
];

/** Payout consumer page: only network tiers (RT/DT/MD/SD) can access.
 *  Note: /dashboard/payout-approvals is a separate path and is NOT blocked. */
const PAYOUT_PATHS: Array<{ prefix: string; roles: string[] }> = [
  { prefix: "/dashboard/payout", roles: ["RETAILER", "DISTRIBUTOR", "MASTER_DISTRIBUTOR", "SUPER_DISTRIBUTOR"] },
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── 0. Tenant resolution — map custom domain / subdomain to a white-label
  //       brand. The resolved tenant-id is injected as a request header so
  //       server components and API routes can read it without a DB call.
  const host = req.headers.get("host")?.split(":")[0]?.toLowerCase() ?? "";
  const tenantId = host ? await resolveTenantId(host) : null;

  // ── 1. Request-size limit on mutating API calls (defense vs oversized bodies).
  //       Video upload proxy routes (/video/upload) handle their own size check
  //       internally (up to KYC_VIDEO_MAX_BYTES = 15 MiB), so skip them here.
  const isVideoUploadProxy = pathname.endsWith("/video/upload");
  if (!isVideoUploadProxy && pathname.startsWith("/api/") && ["POST", "PUT", "PATCH"].includes(req.method)) {
    const len = Number(req.headers.get("content-length") ?? 0);
    if (Number.isFinite(len) && len > MAX_BODY_BYTES) {
      return NextResponse.json(
        { error: "Request body too large" },
        { status: 413 }
      );
    }
  }

  // ── 2. CSP header
  const csp = buildCsp();

  const requestHeaders = new Headers(req.headers);

  // Inject tenant headers so downstream RSCs/APIs can resolve the brand without
  // an additional DB round-trip.
  if (tenantId) {
    requestHeaders.set(TENANT_HEADER, tenantId);
    requestHeaders.set(TENANT_DOMAIN_HEADER, host);
  } else {
    requestHeaders.delete(TENANT_HEADER);
    requestHeaders.delete(TENANT_DOMAIN_HEADER);
  }

  // ── 3. Auth gate for dashboard routes (replaces withAuth wrapper so we keep
  //       full control of the response headers).
  if (pathname.startsWith("/dashboard")) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }
    const role = (token.role as string) ?? "";
    const rule = ADMIN_PATHS.find((r) => pathname.startsWith(r.prefix));
    if (rule && !rule.roles.includes(role)) {
      const url = req.nextUrl.clone();
      url.pathname = "/dashboard";
      url.search = "";
      return NextResponse.redirect(url);
    }

    // BBPS pages: RETAILER-only (/dashboard/bill-pay/*)
    const bbpsRule = BBPS_PATHS.find((r) => pathname.startsWith(r.prefix));
    if (bbpsRule && !bbpsRule.roles.includes(role)) {
      const url = req.nextUrl.clone();
      url.pathname = "/dashboard";
      url.search = "";
      return NextResponse.redirect(url);
    }

    // Payout consumer page: network roles only (/dashboard/payout but NOT
    // /dashboard/payout-approvals which admins need).
    if (pathname.startsWith("/dashboard/payout") && !pathname.startsWith("/dashboard/payout-approvals")) {
      const payoutRule = PAYOUT_PATHS[0];
      if (!payoutRule.roles.includes(role)) {
        const url = req.nextUrl.clone();
        url.pathname = "/dashboard";
        url.search = "";
        return NextResponse.redirect(url);
      }
    }

    // Settlements (partner-wallet bank transfers) are a money movement admins
    // must not perform. Blocked for everyone. Note: "/dashboard/admin/settlements"
    // does not match "/dashboard/admin/settlement-ops" or ".../pos-settlement".
    if (pathname.startsWith("/dashboard/admin/settlements")) {
      const url = req.nextUrl.clone();
      url.pathname = "/dashboard";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set("content-security-policy", csp);

  // ── 4. Anti cache-deception / poisoning / replay.
  //       No cache (browser, nginx, CDN) may ever store authenticated HTML or
  //       API responses. Scoped to /dashboard and /api only — /_next/static,
  //       /_next/image and public assets are already excluded by the matcher,
  //       so their long-lived immutable caching is untouched.
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/api")) {
    // Server-Sent Events endpoints MUST keep `no-transform`, otherwise a
    // compression/proxy layer (Next's built-in gzip in production, nginx, a CDN)
    // buffers the `text/event-stream` and holds each frame back until the
    // connection closes — which breaks the live push (the feed then only
    // "refreshes" on reconnect / tab-switch). The stream route sets this header
    // itself; we must not clobber it here.
    const isEventStream = req.headers.get("accept") === "text/event-stream";
    res.headers.set(
      "Cache-Control",
      isEventStream
        ? "no-store, no-cache, no-transform, must-revalidate, private"
        : "no-store, no-cache, must-revalidate, private"
    );
    res.headers.set("Pragma", "no-cache");
    res.headers.set("Expires", "0");
    // Caches that key on the response must vary by the auth cookie so a shared
    // cache can never serve one user's authenticated response to another.
    res.headers.set("Vary", "Cookie");
    // Belt-and-suspenders: disable nginx/proxy response buffering for the stream.
    if (isEventStream) res.headers.set("X-Accel-Buffering", "no");
  }

  return res;
}

export const config = {
  // Run on everything except static assets so the CSP applies to all documents.
  matcher: [
    "/((?!monitoring|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|map|woff2?)$).*)",
  ],
};
