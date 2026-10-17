import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * TRANSPE ServicePageHeader — v3 "console band".
 *
 * A dark navy slab with the signature gradient keyline on top and a single
 * rotated energy beam — rhyming with the GreetingBand on the overviews. Holds
 * a gradient icon tile, back-link pill, eyebrow, Clash Display title and an
 * `aside` slot for limit / commission chips supplied by the page.
 *
 * Server-safe on purpose: bill-pay and recharge pages are server components
 * that pass Lucide icon functions, so this file must not become a client
 * component.
 */
export type ServicePageTone = "brand" | "accent" | "royal" | "coral" | "energy";

const TILE_BG: Record<ServicePageTone, string> = {
  energy: "bg-energy-gradient shadow-energy-sm",
  brand: "bg-gradient-to-br from-brand-600 to-brand-400",
  accent: "bg-gradient-to-br from-accent-600 to-accent-400",
  royal: "bg-gradient-to-br from-royal-500 to-royal-300",
  coral: "bg-gradient-to-br from-coral-600 to-coral-400",
};

const EYEBROW_TEXT: Record<ServicePageTone, string> = {
  energy: "text-accent-300",
  brand: "text-brand-200",
  accent: "text-accent-300",
  royal: "text-royal-200",
  coral: "text-coral-300",
};

export function ServicePageHeader({
  icon: Icon,
  title,
  description,
  back = "/dashboard",
  aside,
  tone = "energy",
  eyebrow,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  back?: string;
  /** Right-hand slot for limit / commission chips, balance pills, etc. */
  aside?: ReactNode;
  /** Tints the icon tile + eyebrow. Defaults to the signature energy gradient. */
  tone?: ServicePageTone;
  /** Small uppercase label above the title (e.g. "BBPS · Utilities"). */
  eyebrow?: string;
}) {
  return (
    <section
      className={cn(
        "grain relative mb-8 overflow-hidden rounded-4xl bg-ink-950 p-5 text-white shadow-[0_24px_60px_-28px_rgba(7,11,20,0.65)] sm:p-6 md:p-8",
        "before:absolute before:inset-x-0 before:top-0 before:z-20 before:h-1 before:bg-energy-gradient-x before:content-['']",
        "animate-fade-up motion-reduce:animate-none"
      )}
    >
      {/* Rotated energy beam + corner radial */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 top-1/2 h-[26rem] w-40 -translate-y-1/2 rotate-[24deg] bg-energy-gradient opacity-[0.15] blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_80%_at_0%_0%,rgba(255,255,255,0.06),transparent)]"
      />

      <div className="relative z-[1] flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 items-start gap-4 md:gap-5">
          <span
            aria-hidden
            className={cn(
              "grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-white ring-1 ring-inset ring-white/20",
              TILE_BG[tone]
            )}
          >
            <Icon className="h-7 w-7" strokeWidth={1.75} />
          </span>

          <div className="min-w-0">
            <Link
              href={back}
              className="inline-flex items-center gap-1 rounded-full bg-white/[0.08] px-2.5 py-1 text-[11px] font-semibold text-ink-200 ring-1 ring-inset ring-white/15 transition hover:bg-white/[0.14] hover:text-white"
            >
              <ChevronLeft className="h-3 w-3" aria-hidden /> Back
            </Link>

            {eyebrow && (
              <p
                className={cn(
                  "mt-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em]",
                  EYEBROW_TEXT[tone]
                )}
              >
                <span className="brand-dot" aria-hidden />
                {eyebrow}
              </p>
            )}

            <h1
              className={cn(
                "font-display text-2xl font-semibold leading-[1.1] tracking-[-0.02em] text-white md:text-3xl",
                eyebrow ? "mt-1.5" : "mt-3"
              )}
            >
              {title}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-300">{description}</p>
          </div>
        </div>

        {aside && (
          <div className="flex flex-wrap items-center gap-2 md:max-w-sm md:shrink-0 md:justify-end md:pt-1">
            {aside}
          </div>
        )}
      </div>
    </section>
  );
}
