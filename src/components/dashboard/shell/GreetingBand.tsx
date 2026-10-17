"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn, formatINR } from "@/lib/utils";

/**
 * GreetingBand — the console band at the top of every role overview.
 *
 * TRANSPE treatment: a navy slab with a gradient keyline on top; greeting and
 * date on the left, and the hero number inside an inset frosted "console tile"
 * on the right with the secondary chips rendered as dotted ledger rows —
 * echoing the commission-receipt motif used across the marketing site.
 *
 * Purely presentational: every value is passed in by the overview that
 * already owns the data.
 */
export type GreetingChip = {
  label: string;
  value: string;
  tone?: "neutral" | "brand" | "accent" | "coral" | "royal" | "amber";
};

const chipValueTone: Record<NonNullable<GreetingChip["tone"]>, string> = {
  neutral: "text-white",
  brand: "text-brand-200",
  accent: "text-accent-300",
  coral: "text-coral-300",
  royal: "text-royal-200",
  amber: "text-amber-300",
};

function timeGreeting(d = new Date()) {
  const h = d.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

/** rAF-driven count-up from the previous value to `target`. */
function useCountUp(target: number, duration = 900, enabled = true) {
  const [value, setValue] = React.useState(enabled ? 0 : target);
  const fromRef = React.useRef(enabled ? 0 : target);
  const rafRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (!enabled) {
      fromRef.current = target;
      setValue(target);
      return;
    }
    const from = fromRef.current;
    const delta = target - from;
    if (delta === 0) return;
    const start = performance.now();
    const ease = (t: number) => 1 - Math.pow(1 - t, 4);
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const next = from + delta * ease(p);
      setValue(next);
      if (p < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      fromRef.current = target;
    };
  }, [target, duration, enabled]);

  return value;
}

export function GreetingBand({
  name,
  eyebrow = "Counter console · live",
  subtitle,
  heroLabel,
  heroValue,
  heroFormat = formatINR,
  heroHint,
  chips = [],
  actions,
  loading = false,
  className,
}: {
  /** Full name — only the first word is used. */
  name?: string | null;
  eyebrow?: string;
  /** One short line under the greeting. */
  subtitle?: React.ReactNode;
  heroLabel: string;
  heroValue: number;
  heroFormat?: (n: number) => string;
  /** Tiny caption beneath the hero number. */
  heroHint?: React.ReactNode;
  chips?: GreetingChip[];
  /** Optional right-aligned actions (buttons/links). */
  actions?: React.ReactNode;
  loading?: boolean;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const animated = useCountUp(heroValue, 900, !reduce && !loading);
  const firstName = name?.trim().split(/\s+/)[0] || "there";
  const dateLabel = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <motion.section
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "grain relative overflow-hidden rounded-4xl bg-ink-950 text-white shadow-[0_30px_80px_-30px_rgba(7,11,20,0.7)]",
        "before:absolute before:inset-x-0 before:top-0 before:z-20 before:h-1 before:bg-energy-gradient-x before:content-['']",
        className
      )}
      aria-label="Overview summary"
    >
      {/* décor: single rotated energy beam + corner radial */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 top-1/2 h-[30rem] w-44 -translate-y-1/2 rotate-[24deg] bg-energy-gradient opacity-[0.16] blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_80%_at_0%_0%,rgba(255,255,255,0.06),transparent)]"
      />

      <div className="relative z-10 grid gap-6 p-6 md:p-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-center lg:gap-10">
        {/* Greeting */}
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-300">
            <span className="brand-dot" aria-hidden />
            {eyebrow}
          </p>
          <h1 className="mt-3 font-display text-3xl font-semibold leading-[1.05] tracking-[-0.02em] md:text-4xl">
            {timeGreeting()}, {firstName}
          </h1>
          <p className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-300">
            <span className="inline-flex items-center rounded-full bg-white/[0.06] px-2.5 py-0.5 text-xs font-medium text-ink-200 ring-1 ring-inset ring-white/10">
              {dateLabel}
            </span>
            {subtitle && <span>{subtitle}</span>}
          </p>
          {actions && <div className="mt-6 flex flex-wrap gap-2">{actions}</div>}
        </div>

        {/* Hero number inside an inset console tile */}
        <div className="relative rounded-3xl bg-white/[0.05] p-5 ring-1 ring-inset ring-white/10 md:p-6">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-400">
              {heroLabel}
            </p>
            {heroHint && <p className="text-[11px] text-ink-500">{heroHint}</p>}
          </div>
          <p
            className={cn(
              "mt-2 font-display text-4xl font-semibold tabular-nums tracking-[-0.03em] md:text-[2.75rem] md:leading-none",
              loading && "animate-pulse text-white/30"
            )}
            aria-live="polite"
          >
            {loading ? "₹ ——" : heroFormat(animated)}
          </p>
          {chips.length > 0 && (
            <ul className="mt-5 space-y-2 border-t border-white/10 pt-4" aria-label="Highlights">
              {chips.slice(0, 3).map((c) => (
                <li key={c.label} className="flex items-baseline gap-2 text-xs">
                  <span className="shrink-0 text-ink-300">{c.label}</span>
                  <span
                    aria-hidden
                    className="min-w-4 flex-1 border-b border-dotted border-white/20"
                  />
                  <span
                    className={cn(
                      "shrink-0 font-display font-semibold tabular-nums",
                      chipValueTone[c.tone ?? "neutral"]
                    )}
                  >
                    {c.value}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </motion.section>
  );
}
