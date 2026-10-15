import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * TRANSPE brand mark — rounded teal squircle with a navy "t" + white "p",
 * matching the official Transpe app-icon. Used only for icon-only contexts
 * (e.g. collapsed sidebar). Everywhere else we render the full official logo
 * artwork via <Logo />.
 */
export function LogoMark({
  className,
  size = 32
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      width={size}
      height={size}
      fill="none"
      className={cn(
        "shrink-0 transition-transform group-hover:scale-105",
        className
      )}
      role="img"
      aria-label="TRANSPE logo"
    >
      <rect x="0" y="0" width="48" height="48" rx="12" fill="#17B8A6" />
      <polygon points="15,10 21,10 18,5" fill="#172B6B" />
      <path
        d="M12 15 H25 M18 11 V36 Q18 39 21 39 H24"
        stroke="#172B6B"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="33" cy="26" r="7" stroke="#FFFFFF" strokeWidth="4.5" fill="none" />
      <line x1="28" y1="24" x2="28" y2="42" stroke="#FFFFFF" strokeWidth="4.5" strokeLinecap="round" />
    </svg>
  );
}

/** Brand tagline shown beside the logo. Change here to update it everywhere. */
export const LOGO_TAGLINE = "Payments. Powered for Bharat.";

const sizeMap = {
  sm: "h-8",
  md: "h-10",
  lg: "h-12"
} as const;

/**
 * Full TRANSPE logo lockup — renders the "trans" (navy) + "pe" (teal) wordmark
 * from /logo.svg.
 *
 * - On light surfaces (navbar, auth, sidebar) the full-colour logo is used.
 * - On dark surfaces pass `variant="light"` to render a crisp white
 *   monochrome version of the same artwork.
 * - Pass `iconOnly` to render just the squircle "tp" mark (collapsed sidebar).
 * - Pass `tagline` to show the theme-gradient tagline beside the mark.
 * - Use `size` to scale the lockup ("sm" | "md" | "lg").
 */
export function Logo({
  className,
  variant = "dark",
  iconOnly = false,
  tagline = false,
  size = "md"
}: {
  className?: string;
  variant?: "dark" | "light";
  iconOnly?: boolean;
  tagline?: boolean;
  size?: keyof typeof sizeMap;
}) {
  if (iconOnly) {
    return (
      <Link
        href="/"
        className={cn("group relative inline-flex items-center", className)}
        aria-label="TRANSPE home"
      >
        <LogoMark size={34} />
        {/* Live brand-dot — subtle pulse that signals "the Transpe platform is on". */}
        <span
          aria-hidden
          className="pointer-events-none absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5"
        >
          <span className="absolute inline-flex h-full w-full rounded-full bg-accent-400 opacity-70 animate-ping-soft" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-gradient-to-br from-brand-700 to-accent-500 ring-2 ring-white" />
        </span>
      </Link>
    );
  }

  const logoSrc = variant === "light" ? "/logo-light.svg" : "/logo.svg";

  return (
    <Link
      href="/"
      className={cn("group relative inline-flex items-center gap-3", className)}
      aria-label="TRANSPE home"
    >
      <span className="relative inline-flex">
        <Image
          src={logoSrc}
          alt="TRANSPE"
          width={320}
          height={72}
          priority
          unoptimized
          className={cn(
            "w-auto transition-transform duration-300 group-hover:scale-[1.03]",
            sizeMap[size]
          )}
        />
        {/* Live brand-dot — tucked at the top-right of the wordmark. */}
        <span
          aria-hidden
          className="pointer-events-none absolute -right-1 -top-0.5 flex h-2.5 w-2.5"
        >
          <span
            className={cn(
              "absolute inline-flex h-full w-full rounded-full opacity-70 animate-ping-soft",
              variant === "light" ? "bg-white" : "bg-accent-400"
            )}
          />
          <span
            className={cn(
              "relative inline-flex h-2.5 w-2.5 rounded-full bg-gradient-to-br from-brand-700 to-accent-500",
              variant === "light" ? "ring-2 ring-white/70" : "ring-2 ring-white"
            )}
          />
        </span>
      </span>

      {tagline && (
        <span
          className={cn(
            "hidden items-center self-stretch border-l pl-3 sm:inline-flex",
            variant === "light" ? "border-white/25" : "border-ink-200"
          )}
        >
          {/* The tagline carries the signature Transpe gradient-sweep
              (animated navy→royal→teal) via `globals.css .gradient-text`. */}
          <span className="gradient-text whitespace-nowrap text-[11px] font-bold uppercase leading-tight tracking-[0.14em]">
            {LOGO_TAGLINE}
          </span>
        </span>
      )}
    </Link>
  );
}
