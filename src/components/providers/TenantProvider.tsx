"use client";

/**
 * TenantProvider — injects white-label brand context into the React tree.
 *
 * On white-label domains the middleware resolves the tenant and passes the
 * brand as a serialised prop from the RSC layout. On native TRANSPE domains
 * brand is null and all consumers fall back to TRANSPE defaults.
 */

import * as React from "react";
import type { TenantBrand } from "@/lib/tenant/context";

// ── Context ───────────────────────────────────────────────────────────────

const TenantContext = React.createContext<TenantBrand | null>(null);

export function useTenant(): TenantBrand | null {
  return React.useContext(TenantContext);
}

// ── CSS variable injection ─────────────────────────────────────────────────

function hexToRgb(hex: string): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `${r} ${g} ${b}`;
}

function TenantStyleInjector({ brand }: { brand: TenantBrand }) {
  React.useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--tenant-primary", brand.primaryColor);
    root.style.setProperty("--tenant-primary-rgb", hexToRgb(brand.primaryColor));
    root.style.setProperty("--tenant-accent", brand.accentColor);
    root.style.setProperty("--tenant-accent-rgb", hexToRgb(brand.accentColor));
    root.setAttribute("data-tenant", "true");

    // Override favicon if provided
    if (brand.faviconUrl) {
      const existingFavicons = document.querySelectorAll<HTMLLinkElement>(
        "link[rel='icon'], link[rel='shortcut icon']"
      );
      existingFavicons.forEach((el) => el.remove());
      const link = document.createElement("link");
      link.rel = "icon";
      link.href = brand.faviconUrl;
      document.head.appendChild(link);
    }

    return () => {
      root.style.removeProperty("--tenant-primary");
      root.style.removeProperty("--tenant-primary-rgb");
      root.style.removeProperty("--tenant-accent");
      root.style.removeProperty("--tenant-accent-rgb");
      root.removeAttribute("data-tenant");
    };
  }, [brand]);

  return null;
}

// ── Provider ──────────────────────────────────────────────────────────────

export function TenantProvider({
  brand,
  children,
}: {
  brand: TenantBrand | null;
  children: React.ReactNode;
}) {
  return (
    <TenantContext.Provider value={brand}>
      {brand && <TenantStyleInjector brand={brand} />}
      {children}
    </TenantContext.Provider>
  );
}
