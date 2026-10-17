"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Minus, Plus, WhatsappLogo } from "@phosphor-icons/react";
import { company, faqs } from "@/lib/data";
import { cn } from "@/lib/utils";
import { SectionHeading } from "./_shared/SectionHeading";

const easeOut = [0.22, 1, 0.36, 1] as const;

/**
 * FAQ as a single centered accordion column with a support hand-off card at
 * the end.
 */
export function AnswerDesk() {
  const [open, setOpen] = useState<number | null>(0);
  const reduce = useReducedMotion();

  return (
    <section className="section bg-white" id="faq">
      <div className="container-x">
        <SectionHeading
          align="center"
          eyebrow="Straight answers"
          title="Asked at every onboarding call"
        />

        <div className="mx-auto mt-12 max-w-3xl">
          <ul className="divide-y divide-ink-100 overflow-hidden rounded-3xl border border-ink-100 bg-white">
            {faqs.map((f, i) => {
              const isOpen = open === i;
              return (
                <li key={f.q}>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={`faq-panel-${i}`}
                    onClick={() => setOpen(isOpen ? null : i)}
                    className={cn(
                      "flex w-full items-center justify-between gap-6 px-6 py-5 text-left transition focus-energy md:px-8",
                      isOpen ? "bg-ink-50/70" : "hover:bg-ink-50/40"
                    )}
                  >
                    <span
                      className={cn(
                        "font-display text-base font-semibold tracking-[-0.01em] md:text-lg",
                        isOpen ? "text-royal-800" : "text-ink-900"
                      )}
                    >
                      {f.q}
                    </span>
                    <span
                      className={cn(
                        "grid h-8 w-8 shrink-0 place-items-center rounded-full border transition",
                        isOpen
                          ? "border-transparent bg-energy-gradient text-white"
                          : "border-ink-200 text-ink-500"
                      )}
                    >
                      {isOpen ? (
                        <Minus size={14} weight="bold" aria-hidden />
                      ) : (
                        <Plus size={14} weight="bold" aria-hidden />
                      )}
                    </span>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        id={`faq-panel-${i}`}
                        initial={reduce ? false : { height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={reduce ? undefined : { height: 0, opacity: 0 }}
                        transition={{ duration: 0.32, ease: easeOut }}
                        className="overflow-hidden bg-ink-50/70"
                      >
                        <p className="px-6 pb-6 text-sm leading-relaxed text-ink-600 md:px-8 md:text-[15px]">
                          {f.a}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </li>
              );
            })}
          </ul>

          {/* Hand-off card */}
          <div className="mt-6 flex flex-col items-center justify-between gap-4 rounded-3xl border border-ink-100 bg-ink-50/60 px-6 py-5 sm:flex-row md:px-8">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-accent-50 text-accent-700">
                <WhatsappLogo size={22} weight="duotone" aria-hidden />
              </span>
              <div>
                <p className="text-sm font-semibold text-ink-950">Still deciding?</p>
                <p className="text-xs text-ink-500">
                  WhatsApp us on +91 {company.phone} — a human replies, Mon–Sat.
                </p>
              </div>
            </div>
            <Link
              href="/contact"
              className="inline-flex items-center gap-1.5 text-sm font-bold text-royal-700 transition hover:text-royal-900 focus-energy rounded-lg"
            >
              Talk to the team <ArrowRight size={14} weight="bold" aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
