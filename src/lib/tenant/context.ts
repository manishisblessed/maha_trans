/**
 * Tenant context — white-label brand resolution.
 *
 * Server-side: resolves a LIVE WhitelabelProfile from the incoming request's
 * host header (injected by the middleware as x-tenant-id). Returns null for
 * native TRANSPE requests.
 *
 * The resolved brand is safe to embed in RSC/SSR since it contains no PII.
 */

import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { cache } from "react";

export type TenantBrand = {
  id: string;
  /** White-label owner user-id (platformOwnerId for members). */
  ownerId: string;
  brandName: string;
  tagline: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  accentColor: string;
  supportEmail: string | null;
  supportPhone: string | null;
  subdomain: string | null;
  customDomain: string | null;
};

/** Header keys written by the middleware. */
export const TENANT_HEADER = "x-tenant-id";
export const TENANT_DOMAIN_HEADER = "x-tenant-domain";

/**
 * Resolve tenant brand from the current request's x-tenant-id header.
 * Uses React's `cache()` so the DB call is deduped per request.
 */
export const getTenantBrand = cache(async (): Promise<TenantBrand | null> => {
  try {
    const headerStore = await headers();
    const tenantId = headerStore.get(TENANT_HEADER);
    if (!tenantId) return null;

    const profile = await prisma.whitelabelProfile.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        userId: true,
        status: true,
        brandName: true,
        tagline: true,
        logoUrl: true,
        faviconUrl: true,
        primaryColor: true,
        accentColor: true,
        supportEmail: true,
        supportPhone: true,
        subdomain: true,
        customDomain: true,
      },
    });

    if (!profile || profile.status !== "LIVE") return null;

    return {
      id: profile.id,
      ownerId: profile.userId,
      brandName: profile.brandName,
      tagline: profile.tagline,
      logoUrl: profile.logoUrl,
      faviconUrl: profile.faviconUrl,
      primaryColor: profile.primaryColor,
      accentColor: profile.accentColor,
      supportEmail: profile.supportEmail,
      supportPhone: profile.supportPhone,
      subdomain: profile.subdomain,
      customDomain: profile.customDomain,
    };
  } catch {
    return null;
  }
});

/**
 * Resolve the effective platform domain for a given user.
 * For white-label users, returns their tenant's custom domain or subdomain URL.
 * For native users, returns the platform APP_URL.
 */
export async function getEffectivePlatformUrl(platformOwnerId: string | null): Promise<string> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://transpe.net";
  const platformDomain = process.env.PLATFORM_DOMAIN ?? "transpe.in";

  if (!platformOwnerId) return appUrl;

  try {
    const profile = await prisma.whitelabelProfile.findUnique({
      where: { userId: platformOwnerId },
      select: { customDomain: true, subdomain: true, status: true },
    });
    if (!profile || profile.status !== "LIVE") return appUrl;
    if (profile.customDomain) return `https://${profile.customDomain}`;
    if (profile.subdomain) return `https://${profile.subdomain}.${platformDomain}`;
  } catch {
    // fall through to default
  }
  return appUrl;
}
