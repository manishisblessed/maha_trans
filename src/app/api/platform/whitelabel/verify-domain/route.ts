import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { prisma } from "@/lib/db";
import { toErrorResponse } from "@/lib/security/apiErrors";
import dns from "node:dns/promises";

/**
 * POST /api/platform/whitelabel/verify-domain
 *
 * Attempts a DNS lookup of the user's custom domain to confirm the CNAME is
 * pointing at the platform. Returns { ok, resolved, cname, target }.
 *
 * We do NOT block going-live on this check — DNS propagation can take up to
 * 48 h. This endpoint is informational only (shown in the domain-verify UI).
 */
export const dynamic = "force-dynamic";

const PLATFORM_DOMAIN = process.env.PLATFORM_DOMAIN ?? "transpe.in";

export async function POST() {
  let user;
  try {
    user = await requireAuth();
  } catch (e) {
    return toErrorResponse(e);
  }

  const profile = await prisma.whitelabelProfile.findUnique({
    where: { userId: user.id },
    select: { customDomain: true, subdomain: true },
  });

  if (!profile) {
    return NextResponse.json({ error: "No white-label profile found" }, { status: 404 });
  }

  const results: {
    type: "subdomain" | "customDomain";
    host: string;
    ok: boolean;
    resolved?: string[];
    expectedCname?: string;
    cnameMatches?: boolean;
    error?: string;
  }[] = [];

  // ── Subdomain check ──────────────────────────────────────────────────────
  if (profile.subdomain) {
    const host = `${profile.subdomain}.${PLATFORM_DOMAIN}`;
    try {
      const addresses = await dns.resolve4(host).catch(() => []);
      results.push({
        type: "subdomain",
        host,
        ok: true,
        resolved: addresses,
      });
    } catch (e) {
      results.push({
        type: "subdomain",
        host,
        ok: false,
        error: (e as Error).message,
      });
    }
  }

  // ── Custom domain check ──────────────────────────────────────────────────
  if (profile.customDomain) {
    const expectedCname = PLATFORM_DOMAIN;
    try {
      let cnameTarget: string | null = null;
      try {
        const cnames = await dns.resolveCname(profile.customDomain);
        cnameTarget = cnames[0] ?? null;
      } catch {
        // Domain may not have a CNAME (could be A record) — try A lookup
      }

      const addresses = await dns.resolve4(profile.customDomain).catch(() => []);
      const cnameMatches = cnameTarget
        ? cnameTarget.endsWith(expectedCname) || cnameTarget === expectedCname
        : false;

      results.push({
        type: "customDomain",
        host: profile.customDomain,
        ok: addresses.length > 0 || cnameMatches,
        resolved: addresses,
        expectedCname,
        cnameMatches: cnameTarget ? cnameMatches : undefined,
      });
    } catch (e) {
      results.push({
        type: "customDomain",
        host: profile.customDomain,
        ok: false,
        expectedCname,
        error: (e as Error).message,
      });
    }
  }

  return NextResponse.json({ results });
}
