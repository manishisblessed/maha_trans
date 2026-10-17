import type { Metadata } from "next";
import { AuthProvider } from "@/components/providers/AuthProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "TRANSPE — Payments. Powered for India.",
    template: "%s · TRANSPE"
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
    "agent banking"
  ],
  metadataBase: new URL("https://transpe.net"),
  openGraph: {
    title: "TRANSPE — Payments. Powered for India.",
    description:
      "Payment gateway, POS terminals, QR collections and 60+ financial services for retailers, distributors and merchants across India.",
    url: "https://transpe.net",
    siteName: "TRANSPE",
    type: "website"
  }
  // Favicon + apple-touch icon are provided by the file-based conventions
  // `src/app/icon.png` and `src/app/apple-icon.png` (the official "tp" mark),
  // so no manual `icons` metadata is needed here.
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
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
      </head>
      <body><AuthProvider>{children}</AuthProvider></body>
    </html>
  );
}
