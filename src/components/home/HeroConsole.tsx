"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Bank,
  CaretRight,
  CheckCircle,
  DeviceMobile,
  Fingerprint,
  Lightning,
  PaperPlaneTilt,
  QrCode,
  Receipt,
  SealCheck,
  ShieldCheck,
  type Icon
} from "@phosphor-icons/react";
import { services, trustBadges } from "@/lib/data";
import { cn } from "@/lib/utils";
import { ButtonLink } from "./_shared/ButtonLink";
import { CountUp } from "./_shared/CountUp";

const easeOut = [0.22, 1, 0.36, 1] as const;

/* Live feed shown inside the counter console. Cycles forever. */
type FeedItem = {
  icon: Icon;
  label: string;
  sub: string;
  amount: string;
  commission: string;
};

const FEED: FeedItem[] = [
  {
    icon: Fingerprint,
    label: "AePS withdrawal",
    sub: "Aadhaar ••6214 · Bank of Baroda",
    amount: "₹2,500",
    commission: "+₹6.00"
  },
  {
    icon: PaperPlaneTilt,
    label: "Money transfer",
    sub: "IMPS · HDFC ••0193",
    amount: "₹10,000",
    commission: "+₹8.00"
  },
  {
    icon: QrCode,
    label: "UPI collect",
    sub: "ramesh.k@oksbi",
    amount: "₹1,250",
    commission: "+₹2.50"
  },
  {
    icon: Receipt,
    label: "Electricity bill",
    sub: "MSEDCL · Consumer 48812",
    amount: "₹1,840",
    commission: "+₹14.70"
  },
  {
    icon: DeviceMobile,
    label: "Mobile recharge",
    sub: "Jio · 98•• ••4421",
    amount: "₹299",
    commission: "+₹8.97"
  },
  {
    icon: Bank,
    label: "Virtual account credit",
    sub: "NEFT · Settlement T+1",
    amount: "₹48,200",
    commission: "auto-credited"
  }
];

export function HeroConsole() {
  const reduce = useReducedMotion();

  const enter = (i: number) => ({
    initial: reduce ? false : { opacity: 0, y: 26 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.65, ease: easeOut, delay: 0.08 + i * 0.1 }
  });

  return (
    <section
      data-nav-theme="dark"
      className="grain relative overflow-hidden bg-ink-950 text-white"
    >
      {/* Backdrop */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="grid-bg mask-fade-y absolute inset-0 opacity-[0.07] invert" />
        <div className="aurora-glow absolute -left-56 top-[-180px] h-[560px] w-[560px] rounded-full" />
        <div className="aurora-glow absolute -right-48 bottom-[-220px] h-[620px] w-[620px] rounded-full [animation-direction:reverse]" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-ink-950 to-transparent" />
      </div>

      <div className="container-x relative z-10 pb-10 pt-28 md:pt-36">
        <div className="grid items-center gap-14 lg:grid-cols-12 lg:gap-10">
          {/* ── Copy ── */}
          <div className="lg:col-span-6">
            <motion.p
              {...enter(0)}
              className="inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.06] px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/75 backdrop-blur"
            >
              <Lightning size={13} weight="fill" className="text-accent-400" aria-hidden />
              Banking rails for every counter in India
            </motion.p>

            <motion.h1
              {...enter(1)}
              className="mt-6 font-display text-[2.6rem] font-semibold leading-[1.02] tracking-[-0.025em] sm:text-5xl lg:text-[3.6rem]"
            >
              Run a bank-grade
              <br />
              counter.{" "}
              <span className="gradient-text [background-image:linear-gradient(110deg,#58d7bf,#2cc4a7,#8bb3f6)]">
                Keep the margin.
              </span>
            </motion.h1>

            <motion.p
              {...enter(2)}
              className="mt-6 max-w-xl text-base leading-relaxed text-white/65 md:text-lg"
            >
              TRANSPE turns your shop into a full financial point — cash
              withdrawals, transfers, bills, recharges and travel on one
              dashboard. Commission lands in your wallet the second a
              transaction succeeds.
            </motion.p>

            <motion.div {...enter(3)} className="mt-9 flex flex-wrap items-center gap-3">
              <ButtonLink href="/register" size="lg">
                Open your counter
                <ArrowRight size={16} weight="bold" aria-hidden />
              </ButtonLink>
              <ButtonLink
                href="/services"
                size="lg"
                variant="outline"
                className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              >
                Explore 60+ services
              </ButtonLink>
            </motion.div>

            <motion.ul
              {...enter(4)}
              className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-white/55"
            >
              {["Free to join", "KYC in 5 minutes", "Same-day first transaction"].map(
                (t) => (
                  <li key={t} className="inline-flex items-center gap-1.5">
                    <CheckCircle size={14} weight="fill" className="text-accent-400" aria-hidden />
                    {t}
                  </li>
                )
              )}
            </motion.ul>

            {/* Trust badges */}
            <motion.ul {...enter(5)} className="mt-10 flex flex-wrap gap-2">
              {trustBadges.map((b) => (
                <li
                  key={b.label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold text-white/60"
                >
                  <SealCheck size={13} weight="duotone" className="text-accent-400" aria-hidden />
                  {b.label}
                </li>
              ))}
            </motion.ul>
          </div>

          {/* ── Counter console ── */}
          <div className="lg:col-span-6">
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 40, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.8, ease: easeOut, delay: 0.25 }}
              className="relative mx-auto max-w-lg"
            >
              <ConsoleCard reduce={Boolean(reduce)} />

              {/* Floating commission toast */}
              <motion.div
                initial={reduce ? false : { opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, ease: easeOut, delay: 1 }}
                className="absolute -right-3 top-16 hidden rounded-2xl border border-white/10 bg-ink-900/90 px-4 py-3 shadow-energy backdrop-blur sm:block"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">
                  Commission credited
                </p>
                <p className="mt-0.5 font-display text-lg font-semibold text-accent-300">
                  <CountUp value="₹1,284" /> <span className="text-xs font-sans text-white/45">today</span>
                </p>
              </motion.div>

              {/* Floating settlement chip */}
              <motion.div
                initial={reduce ? false : { opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, ease: easeOut, delay: 1.2 }}
                className="absolute -left-4 bottom-20 hidden items-center gap-2 rounded-2xl border border-white/10 bg-ink-900/90 px-4 py-3 shadow-energy-sm backdrop-blur sm:flex"
              >
                <ShieldCheck size={18} weight="duotone" className="text-accent-400" aria-hidden />
                <div>
                  <p className="text-xs font-semibold text-white">T+1 settlement</p>
                  <p className="text-[10px] text-white/45">Licensed sponsor banks</p>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Service marquee — replaces a separate ticker section */}
      <div className="relative z-10 border-t border-white/[0.07] py-4">
        <div className="mask-fade-x overflow-hidden">
          <div className="flex w-max animate-marquee gap-8 pr-8">
            {[...services, ...services].map((s, i) => (
              <span
                key={`${s.slug}-${i}`}
                className="inline-flex items-center gap-2 whitespace-nowrap text-xs font-semibold uppercase tracking-[0.12em] text-white/40"
              >
                <span className="h-1 w-1 rounded-full bg-accent-400" aria-hidden />
                {s.title}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Console card with cycling live feed ── */
function ConsoleCard({ reduce }: { reduce: boolean }) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => setTick((v) => v + 1), 2600);
    return () => clearInterval(t);
  }, [reduce]);

  // The 4 most recent feed rows, newest first.
  const rows = Array.from({ length: 4 }, (_, i) => {
    const idx = ((tick - i) % FEED.length + FEED.length) % FEED.length;
    return { ...FEED[idx], key: tick - i };
  });

  return (
    <div className="gradient-ring relative overflow-hidden rounded-4xl border border-white/10 bg-ink-900/70 shadow-energy backdrop-blur" data-active="true">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.07] px-6 py-5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
            Counter wallet
          </p>
          <p className="mt-1 font-display text-3xl font-semibold tracking-[-0.02em] text-white">
            <CountUp value="₹24,860" />
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-accent-400/30 bg-accent-400/10 px-3 py-1.5 text-[11px] font-semibold text-accent-300">
          <span className="relative flex h-1.5 w-1.5" aria-hidden>
            <span className="absolute inline-flex h-full w-full animate-ping-soft rounded-full bg-accent-400" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent-400" />
          </span>
          Live
        </span>
      </div>

      {/* Feed */}
      <ul className="space-y-1.5 px-4 py-4" aria-label="Live transactions (demo)">
        <AnimatePresence initial={false} mode="popLayout">
          {rows.map((row, i) => {
            const RowIcon = row.icon;
            return (
              <motion.li
                key={row.key}
                layout
                initial={reduce ? false : { opacity: 0, y: -18, scale: 0.98 }}
                animate={{ opacity: 1 - i * 0.18, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 14, scale: 0.98 }}
                transition={{ duration: 0.45, ease: easeOut }}
                className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.04] px-3.5 py-3"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/[0.07] text-accent-300">
                  <RowIcon size={18} weight="duotone" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-white">
                    {row.label}
                  </span>
                  <span className="block truncate text-[11px] text-white/45">{row.sub}</span>
                </span>
                <span className="text-right">
                  <span className="block text-sm font-semibold tabular-nums text-white">
                    {row.amount}
                  </span>
                  <span
                    className={cn(
                      "block text-[11px] font-semibold tabular-nums",
                      row.commission.startsWith("+") ? "text-accent-300" : "text-white/45"
                    )}
                  >
                    {row.commission}
                  </span>
                </span>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-white/[0.07] px-6 py-4 text-[11px] text-white/45">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-accent-400" aria-hidden />
          99.98% uptime · NPCI rails
        </span>
        <span className="inline-flex items-center gap-1 font-semibold text-white/65">
          Open dashboard <CaretRight size={12} weight="bold" aria-hidden />
        </span>
      </div>
    </div>
  );
}
