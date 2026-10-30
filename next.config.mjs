/**
 * Static security headers applied to every response.
 *
 * NOTE: Content-Security-Policy is intentionally NOT set here. It is generated
 * per-request with a fresh nonce in `src/middleware.ts` (nonce-based CSP), which
 * lets us drop script-src 'unsafe-inline'. Defining it here too would create a
 * conflicting second policy, so the dynamic one is the single source of truth.
 */
import { withSentryConfig } from "@sentry/nextjs";

const isProd = process.env.NODE_ENV === "production";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // camera/microphone MUST be (self): KYC selfie + liveness video use getUserMedia.
  // camera=() would hard-block the camera site-wide with no permission popup.
  { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=(self), payment=()" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  ...(isProd
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
    : []),
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  eslint: { ignoreDuringBuilds: true },
  // Limit the number of parallel workers during static page generation.
  // The Amplify build container has 8GiB RAM; with --max-old-space-size=4096
  // the main process uses up to 4GB, so we cap workers at 2 to avoid
  // ENOMEM when forking (each worker needs its own V8 heap).
  experimental: { cpus: 2 },
  // The in-build `tsc` type-check is the single biggest memory consumer of
  // `next build` and OOM-kills (exit 137) the small production instance AFTER
  // webpack has already compiled — leaving PM2 serving the stale build. Types
  // are validated on every change in dev and via `tsc --noEmit` before deploy,
  // so skipping the redundant build-time pass makes the prod build fit in RAM
  // and finish far faster. Keep local/CI type-checking as the real gate.
  typescript: { ignoreBuildErrors: true },
  // pdfkit loads its built-in AFM font-data files from disk at runtime; bundling
  // it with webpack breaks those file reads, so keep it external on the server.
  // Renamed from experimental.serverComponentsExternalPackages and stabilized in Next 15.
  serverExternalPackages: ["pdfkit"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "api.dicebear.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      // White-label tenant logos / favicons hosted on any CDN.
      // The middleware already validates these domains are LIVE tenants, so
      // allowing all remote patterns here is safe.
      { protocol: "https", hostname: "**" },
    ]
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async rewrites() {
    return [
      {
        source: "/dashboard/master-admin/:path*",
        destination: "/dashboard/admin/:path*",
      },
      {
        source: "/dashboard/sub-admin/:path*",
        destination: "/dashboard/admin/:path*",
      },
    ];
  },

  // Allow the app to respond to white-label custom domains and subdomains.
  // The middleware resolves the host → WhitelabelProfile and injects the
  // x-tenant-id header so every page/API knows its tenant context. No explicit
  // rewrite rules are required for custom domains — they all map to the same
  // Next.js app. The `hostname` wildcard below ensures Next.js does not reject
  // requests from unknown origins in production.
  // Note: configure your nginx / ALB to route all white-label domains to this
  // app; AWS ACM wildcard cert covers *.transpe.in; each custom domain owner
  // must point a CNAME record (kapoorpay.in → transpe.in or the ALB hostname).

};

export default withSentryConfig(nextConfig, {
  org: "TRANSPE",
  project: "javascript-nextjs",

  // Build-time secret used to upload source maps so production stack traces are
  // readable. Only needed at `next build`; leave unset in dev.
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Upload a wider set of client files for better client-side stack traces.
  widenClientFileUpload: true,

  // Delete the generated .map files once Sentry has uploaded them so they don't
  // ship inside .next. Together with the `find … -delete` step in amplify.yml,
  // this keeps the deploy artifact under Amplify's 220 MB limit (source maps are
  // only needed at build/upload time, never to serve or run the app).
  sourcemaps: { deleteSourcemapsAfterUpload: true },

  // Route browser events through our own origin (/monitoring) so they aren't
  // blocked by ad-blockers or the strict `connect-src` CSP set in middleware.
  // NOTE: /monitoring is excluded from the middleware matcher.
  tunnelRoute: "/monitoring",

  // Only print SDK build output in CI.
  silent: !process.env.CI,
});
