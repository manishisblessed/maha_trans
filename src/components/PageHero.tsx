import Link from "next/link";
import * as React from "react";
import { CaretRight } from "@phosphor-icons/react/dist/ssr";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/motion";
import { cn } from "@/lib/utils";

export type PageHeroBreadcrumb = { label: string; href: string };
export type PageHeroStat = { value: string; label: string };

export interface PageHeroProps {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  breadcrumbs?: PageHeroBreadcrumb[];
  /** `dark` = ink-950 + grain + energy beam; `light` = white with radial wash. */
  variant?: "dark" | "light";
  stats?: PageHeroStat[];
  /** Buttons / chips rendered under the description rail. */
  actions?: React.ReactNode;
  /** Optional right-hand panel (illustration, mock UI, meta card). */
  children?: React.ReactNode;
  className?: string;
}

/**
 * PageHero — the TRANSPE editorial ledger header, shared by every secondary
 * marketing page.
 *
 * Composition (deliberately asymmetric):
 *  · breadcrumb chip row
 *  · headline left — description + actions in a right-hand rail with a
 *    gradient keyline, bottom-aligned against the title
 *  · optional panel (`children`) below the header, full-width
 *  · stats as freestanding "tickets" with a gradient top edge, the even ones
 *    nudged down a notch on desktop
 *
 * Carries its own top padding because the navbar is fixed. Emits
 * `data-nav-theme` so the navbar flips to light text over dark heroes.
 */
export function PageHero({
  eyebrow,
  title,
  description,
  breadcrumbs,
  variant = "light",
  stats,
  actions,
  children,
  className
}: PageHeroProps) {
  const dark = variant === "dark";

  return (
    <section
      data-nav-theme={variant}
      className={cn(
        "relative overflow-hidden pb-16 pt-32 md:pb-20 md:pt-40",
        dark ? "grain bg-ink-950 text-white" : "bg-white text-ink-900",
        className
      )}
    >
      {/* Backdrop */}
      {dark ? (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute -top-40 left-1/3 h-[480px] w-[720px] -rotate-12 rounded-full bg-energy-gradient opacity-[0.16] blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-60 -left-40 h-[480px] w-[480px] rounded-full bg-accent-500/15 blur-3xl"
          />
        </>
      ) : (
        <>
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-hero-radial" />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-energy-gradient-x opacity-60"
          />
        </>
      )}

      <Container className="relative z-10">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="mb-10">
            <ol
              className={cn(
                "inline-flex flex-wrap items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium",
                dark
                  ? "border-white/10 bg-white/[0.05] text-white/60"
                  : "border-ink-100 bg-ink-50/80 text-ink-500"
              )}
            >
              <li>
                <Link
                  href="/"
                  className={cn(
                    "rounded-md px-0.5 transition focus-energy",
                    dark ? "hover:text-white" : "hover:text-ink-900"
                  )}
                >
                  Home
                </Link>
              </li>
              {breadcrumbs.map((b, i) => {
                const last = i === breadcrumbs.length - 1;
                return (
                  <li key={b.href} className="flex items-center gap-1.5">
                    <CaretRight size={11} weight="bold" aria-hidden />
                    {last ? (
                      <span aria-current="page" className={dark ? "text-white" : "text-ink-900"}>
                        {b.label}
                      </span>
                    ) : (
                      <Link
                        href={b.href}
                        className={cn(
                          "rounded-md px-0.5 transition focus-energy",
                          dark ? "hover:text-white" : "hover:text-ink-900"
                        )}
                      >
                        {b.label}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        )}

        {/* Headline + description rail */}
        <div className="grid gap-10 lg:grid-cols-12 lg:items-end lg:gap-12">
          <div className="lg:col-span-7">
            {eyebrow && (
              <Reveal distance={12} duration={0.5}>
                <span
                  className={cn(
                    "inline-flex items-center gap-2.5 text-xs font-semibold uppercase tracking-[0.18em]",
                    dark ? "text-accent-300" : "text-royal-700"
                  )}
                >
                  <span className="brand-dot" aria-hidden />
                  {eyebrow}
                </span>
              </Reveal>
            )}
            <Reveal delay={0.05}>
              <h1
                className={cn(
                  "mt-5 font-display text-4xl font-semibold leading-[1.0] tracking-[-0.025em] md:text-6xl lg:text-7xl",
                  dark ? "text-white" : "text-ink-950"
                )}
              >
                {title}
              </h1>
            </Reveal>
          </div>

          {(description || actions) && (
            <div className="lg:col-span-5">
              <Reveal delay={0.14} direction="left">
                <div
                  className={cn(
                    "border-l-2 pl-6",
                    dark ? "border-accent-400/60" : "border-royal-300"
                  )}
                >
                  {description && (
                    <p
                      className={cn(
                        "text-base leading-relaxed md:text-lg",
                        dark ? "text-white/70" : "text-ink-600"
                      )}
                    >
                      {description}
                    </p>
                  )}
                  {actions && (
                    <div className="mt-6 flex flex-wrap items-center gap-3">{actions}</div>
                  )}
                </div>
              </Reveal>
            </div>
          )}
        </div>

        {/* Optional panel */}
        {children && (
          <Reveal delay={0.2} className="mt-14">
            {children}
          </Reveal>
        )}

        {/* Stat tickets */}
        {stats && stats.length > 0 && (
          <div className="mt-14 grid grid-cols-2 gap-4 md:mt-16 md:grid-cols-4">
            {stats.map((s, i) => (
              <Reveal
                key={s.label}
                delay={0.2 + i * 0.07}
                className={cn(i % 2 === 1 && "md:translate-y-3")}
              >
                <div
                  className={cn(
                    "relative overflow-hidden rounded-2xl border p-5 md:p-6",
                    dark
                      ? "border-white/10 bg-white/[0.045] backdrop-blur"
                      : "border-ink-100 bg-white shadow-sm"
                  )}
                >
                  <span aria-hidden className="absolute inset-x-0 top-0 h-[3px] bg-energy-gradient-x" />
                  <p
                    className={cn(
                      "font-display text-3xl font-semibold tracking-[-0.02em] md:text-4xl",
                      dark ? "text-white" : "text-ink-950"
                    )}
                  >
                    {s.value}
                  </p>
                  <p
                    className={cn(
                      "mt-1 text-xs font-medium uppercase tracking-wider",
                      dark ? "text-white/50" : "text-ink-500"
                    )}
                  >
                    {s.label}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        )}
      </Container>
    </section>
  );
}
