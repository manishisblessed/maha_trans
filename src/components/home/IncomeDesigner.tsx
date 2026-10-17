"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Calculator, Printer } from "@phosphor-icons/react";
import { Reveal } from "@/components/motion";
import { cn } from "@/lib/utils";
import { SectionHeading } from "./_shared/SectionHeading";
import { ButtonLink } from "./_shared/ButtonLink";
import { CountUp } from "./_shared/CountUp";

type Dial = {
  id: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  initial: number;
  /** ₹ earned per unit per day */
  perUnit: number;
  receiptLabel: string;
};

const DIALS: Dial[] = [
  {
    id: "aeps",
    label: "AePS withdrawals",
    unit: "per day",
    min: 0,
    max: 120,
    step: 5,
    initial: 40,
    perUnit: 6,
    receiptLabel: "AePS @ ₹6.00 avg"
  },
  {
    id: "dmt",
    label: "Money transfers",
    unit: "per day",
    min: 0,
    max: 80,
    step: 5,
    initial: 20,
    perUnit: 8,
    receiptLabel: "DMT @ ₹8.00 avg"
  },
  {
    id: "bills",
    label: "Bills & recharges",
    unit: "per day",
    min: 0,
    max: 150,
    step: 10,
    initial: 50,
    perUnit: 3.5,
    receiptLabel: "BBPS @ ₹3.50 avg"
  },
  {
    id: "pos",
    label: "Card volume",
    unit: "₹ ’000 / day",
    min: 0,
    max: 100,
    step: 5,
    initial: 20,
    perUnit: 4, // ₹4 per ₹1,000 → 0.4%
    receiptLabel: "POS @ 0.40%"
  }
];

const WORKING_DAYS = 26;

const inr = (n: number) =>
  "₹" + Math.round(n).toLocaleString("en-IN");

/**
 * Interactive income planner — controls on the left, a live "commission
 * receipt" printing itself on the right.
 */
export function IncomeDesigner() {
  const [values, setValues] = useState<Record<string, number>>(
    () => Object.fromEntries(DIALS.map((d) => [d.id, d.initial]))
  );

  const lines = useMemo(
    () =>
      DIALS.map((d) => ({
        ...d,
        daily: values[d.id] * d.perUnit,
        monthly: values[d.id] * d.perUnit * WORKING_DAYS
      })),
    [values]
  );
  const totalMonthly = lines.reduce((a, l) => a + l.monthly, 0);

  return (
    <section className="section relative overflow-hidden bg-ink-950 text-white" id="income">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="aurora-glow absolute -right-64 -top-40 h-[560px] w-[560px] rounded-full" />
        <div className="grid-bg mask-fade-y absolute inset-0 opacity-[0.05] invert" />
      </div>

      <div className="container-x relative z-10">
        <SectionHeading
          dark
          eyebrow="Plan your month"
          title="Dial in your footfall. Read your payout."
          sub="Slide each service to match your counter's real traffic. The receipt updates line by line — these are our published commission slabs, not marketing numbers."
        />

        <div className="mt-12 grid gap-8 lg:grid-cols-12 lg:gap-12">
          {/* Dials */}
          <div className="space-y-7 lg:col-span-7">
            {DIALS.map((d, i) => (
              <Reveal key={d.id} delay={i * 0.06} className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur">
                <div className="flex items-baseline justify-between gap-4">
                  <label htmlFor={`dial-${d.id}`} className="text-sm font-semibold text-white">
                    {d.label}
                    <span className="ml-2 text-xs font-normal text-white/45">{d.unit}</span>
                  </label>
                  <output className="font-display text-xl font-semibold tabular-nums text-accent-300">
                    {values[d.id]}
                  </output>
                </div>
                <input
                  id={`dial-${d.id}`}
                  type="range"
                  min={d.min}
                  max={d.max}
                  step={d.step}
                  value={values[d.id]}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [d.id]: Number(e.target.value) }))
                  }
                  className="mt-4 h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-accent-400"
                />
                <div className="mt-2 flex justify-between text-[10px] font-medium uppercase tracking-wider text-white/30">
                  <span>{d.min}</span>
                  <span>{d.max}</span>
                </div>
              </Reveal>
            ))}

            <Reveal className="flex items-center gap-3 rounded-3xl border border-dashed border-white/15 p-5 text-sm text-white/55">
              <Calculator size={20} weight="duotone" className="shrink-0 text-accent-400" aria-hidden />
              Assumes {WORKING_DAYS} working days. Travel bookings, PG and overrides from your own
              network come on top.
            </Reveal>
          </div>

          {/* Receipt */}
          <div className="lg:col-span-5">
            <Reveal direction="left" className="lg:sticky lg:top-28">
              <div className="relative overflow-hidden rounded-3xl bg-white text-ink-950 shadow-energy">
                {/* perforation */}
                <div
                  aria-hidden
                  className="absolute inset-x-0 top-0 h-1.5 bg-energy-gradient-x"
                />
                <div className="px-7 pb-7 pt-8">
                  <div className="flex items-center justify-between">
                    <p className="font-display text-sm font-bold uppercase tracking-[0.2em]">
                      Commission receipt
                    </p>
                    <Printer size={18} weight="duotone" className="text-ink-400" aria-hidden />
                  </div>
                  <p className="mt-1 text-[11px] text-ink-400">
                    TRANSPE · estimated monthly payout
                  </p>

                  <ul className="mt-6 space-y-3 border-t border-dashed border-ink-200 pt-5">
                    {lines.map((l) => (
                      <li key={l.id} className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="text-ink-600">
                          {l.receiptLabel}
                          <span className="ml-1.5 text-[11px] text-ink-400">× {values[l.id]}/day</span>
                        </span>
                        <span
                          aria-hidden
                          className="flex-1 border-b border-dotted border-ink-200"
                        />
                        <motion.span
                          key={l.monthly}
                          initial={{ opacity: 0.4 }}
                          animate={{ opacity: 1 }}
                          className="font-semibold tabular-nums"
                        >
                          {inr(l.monthly)}
                        </motion.span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-6 rounded-2xl bg-ink-950 px-5 py-4 text-white">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">
                      Your month, roughly
                    </p>
                    <motion.p
                      key={totalMonthly}
                      initial={{ scale: 0.97, opacity: 0.6 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 24 }}
                      className="mt-1 font-display text-4xl font-semibold tabular-nums tracking-[-0.02em]"
                    >
                      {inr(totalMonthly)}
                    </motion.p>
                    <p className="mt-1 text-[11px] text-white/45">
                      Credited in real time, withdrawable 24×7
                    </p>
                  </div>

                  <ButtonLink href="/register" size="lg" linkClassName="mt-6 w-full" className="w-full">
                    Make it real
                    <ArrowRight size={16} weight="bold" aria-hidden />
                  </ButtonLink>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
