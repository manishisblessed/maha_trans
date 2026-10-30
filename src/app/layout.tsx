import type { Metadata } from "next";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { TenantProvider } from "@/components/providers/TenantProvider";
import { getTenantBrand } from "@/lib/tenant/context";
import "./globals.css";

// Default (native TRANSPE) metadata — overridden per-request when a white-label
// tenant is detected via the x-tenant-id header injected by the middleware.
const DEFAULT_METADATA: Metadata = {
  title: {
    default: "TRANSPE — Payments. Powered for India.",
    template: "%s · TRANSPE",
  },
  description:
    "TRANSPE is a fintech distribution platform powering payment gateway, POS terminals, QR collections, AePS, money transfer, recharges and bill payments for retailers and merchants across India.",
  keywords: [
    "TRANSPE",
    "transpe.net",
    "payment gateway",
    "POS machine",
    "QR payments",
    "UPI",
    "AePS",
    "money transfer",
    "DMT",
    "recharge",
    "bill payment",
    "fintech India",
    "agent banking",
  ],
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://transpe.net"),
  openGraph: {
    title: "TRANSPE — Payments. Powered for India.",
    description:
      "Payment gateway, POS terminals, QR collections and 60+ financial services for retailers, distributors and merchants across India.",
    url: "https://transpe.net",
    siteName: "TRANSPE",
    type: "website",
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getTenantBrand();
  if (!brand) return DEFAULT_METADATA;

  // White-label tenant: use the tenant's brand in all metadata.
  const platformHost = brand.customDomain
    ? `https://${brand.customDomain}`
    : brand.subdomain
      ? `https://${brand.subdomain}.${process.env.PLATFORM_DOMAIN ?? "transpe.in"}`
      : (process.env.NEXT_PUBLIC_APP_URL ?? "https://transpe.net");

  return {
    title: {
      default: `${brand.brandName} — Payments Platform`,
      template: `%s · ${brand.brandName}`,
    },
    description:
      brand.tagline ??
      `${brand.brandName} — a full-service payments and distribution platform powered by TRANSPE.`,
    metadataBase: new URL(platformHost),
    openGraph: {
      title: `${brand.brandName} — Payments Platform`,
      description: brand.tagline ?? `${brand.brandName} payment services`,
      siteName: brand.brandName,
      type: "website",
    },
    icons: brand.faviconUrl
      ? { icon: brand.faviconUrl, shortcut: brand.faviconUrl }
      : undefined,
    themeColor: brand.primaryColor,
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const brand = await getTenantBrand();

  return (
    <html lang="en">
      {/*
        TRANSPE brand typography:
        · Clash Display → display / headlines (--font-display)
        · Satoshi       → body / UI (--font-sans)
        Loaded from Fontshare CDN (OFL, no self-hosting required).
        Keep `preconnect` first for fastest LCP.
      */}
      <head>
        <link rel="preconnect" href="https://api.fontshare.com" crossOrigin="" />
        <link rel="preconnect" href="https://cdn.fontshare.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=clash-display@600,700,500&f[]=satoshi@400,500,700,900&display=swap"
        />
        {/* Inject tenant CSS variables at SSR time to avoid FOUC */}
        {brand && (
          <style
            dangerouslySetInnerHTML={{
              __html: `
:root {
  --tenant-primary: ${brand.primaryColor};
  --tenant-accent: ${brand.accentColor};
}
              `.trim(),
            }}
          />
        )}
      </head>
      <body>
        <AuthProvider>
          <TenantProvider brand={brand}>
            {children}
          </TenantProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
