"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, CaretLeft, CaretRight } from "@phosphor-icons/react";
import { IconTile } from "@/components/ui/Icon";
import { Reveal } from "@/components/motion";
import { services, type ServiceItem } from "@/lib/data";
import { cn } from "@/lib/utils";
import { SectionHeading } from "./_shared/SectionHeading";
import { iconForService, serviceToneByCategory } from "./_shared/serviceIcons";

const CATEGORIES = [
  { key: "all", label: "Everything" },
  { key: "banking", label: "Banking & payments" },
  { key: "bills", label: "Bills & BBPS" },
  { key: "recharge", label: "Recharges" },
  { key: "travel", label: "Travel desk" }
] as const;

type CategoryKey = (typeof CATEGORIES)[number]["key"];

/**
 * The service catalogue as a draggable, snap-scrolling rail with category
 * filters — a deliberately different silhouette from any grid layout.
 */
export function ServiceRail() {
  const [cat, setCat] = useState<CategoryKey>("all");
  const railRef = useRef<HTMLUListElement>(null);

  const visible = useMemo<ServiceItem[]>(
    () => (cat === "all" ? services : services.filter((s) => s.category === cat)),
    [cat]
  );

  const nudge = (dir: 1 | -1) => {
    railRef.current?.scrollBy({ left: dir * 640, behavior: "smooth" });
  };

  return (
    <section className="section overflow-hidden bg-ink-50/60" id="services">
      <div className="container-x">
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <SectionHeading
            eyebrow="The catalogue"
            title={
              <>
                Sixty ways your counter
                <br className="hidden md:block" /> earns every day
              </>
            }
            sub="Every tile below is a live service — switch it on from your dashboard and start charging for it the same afternoon."
          />
          <div className="hidden shrink-0 items-center gap-2 md:flex">
            <button
              type="button"
              aria-label="Scroll services left"
              onClick={() => nudge(-1)}
              className="grid h-11 w-11 place-items-center rounded-full border border-ink-200 bg-white text-ink-700 transition hover:border-ink-400 hover:text-ink-950 focus-energy active:scale-95"
            >
              <CaretLeft size={16} weight="bold" aria-hidden />
            </button>
            <button
              type="button"
              aria-label="Scroll services right"
              onClick={() => nudge(1)}
              className="grid h-11 w-11 place-items-center rounded-full border border-ink-200 bg-white text-ink-700 transition hover:border-ink-400 hover:text-ink-950 focus-energy active:scale-95"
            >
              <CaretRight size={16} weight="bold" aria-hidden />
            </button>
          </div>
        </div>

        {/* Category chips */}
        <Reveal className="mt-8 flex flex-wrap gap-2" role="tablist" aria-label="Service categories">
          {CATEGORIES.map((c) => {
            const active = cat === c.key;
            return (
              <button
                key={c.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setCat(c.key)}
                className={cn(
                  "relative rounded-full px-4 py-2 text-sm font-semibold transition focus-energy",
                  active
                    ? "text-white"
                    : "border border-ink-200 bg-white text-ink-600 hover:border-ink-300 hover:text-ink-900"
                )}
              >
                {active && (
                  <motion.span
                    layoutId="service-cat-pill"
                    aria-hidden
                    className="absolute inset-0 rounded-full bg-energy-gradient shadow-energy-sm"
                    transition={{ type: "spring", stiffness: 420, damping: 36 }}
                  />
                )}
                <span className="relative z-10">{c.label}</span>
              </button>
            );
          })}
        </Reveal>
      </div>

      {/* Rail — bleeds to the viewport edge on the right */}
      <ul
        ref={railRef}
        className="scrollbar-none scroll-snap-x mt-10 flex gap-4 overflow-x-auto px-4 pb-4 sm:px-6 lg:px-[max(2rem,calc((100vw-80rem)/2+2rem))]"
      >
        {visible.map((s, i) => {
          const SIcon = iconForService(s.slug);
          return (
            <motion.li
              key={`${cat}-${s.slug}`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.45, delay: Math.min(i, 6) * 0.05, ease: [0.22, 1, 0.36, 1] }}
              className="snap-start"
            >
              <Link
                href="/services"
                className="group flex h-full w-[264px] flex-col justify-between rounded-3xl border border-ink-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-energy-sm focus-energy"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <IconTile icon={SIcon} tone={serviceToneByCategory[s.category] ?? "brand"} size="lg" />
                    {s.badge && (
                      <span className="rounded-full bg-accent-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-accent-700">
                        {s.badge}
                      </span>
                    )}
                  </div>
                  <h3 className="mt-5 font-display text-lg font-semibold tracking-[-0.01em] text-ink-950">
                    {s.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-500">{s.description}</p>
                </div>
                <span className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em] text-royal-700 opacity-0 transition group-hover:opacity-100">
                  See commission <ArrowRight size={12} weight="bold" aria-hidden />
                </span>
              </Link>
            </motion.li>
          );
        })}

        {/* Terminal card */}
        <li className="snap-start">
          <Link
            href="/register"
            className="grain group flex h-full w-[264px] flex-col justify-between rounded-3xl bg-ink-950 p-6 text-white transition hover:-translate-y-1 hover:shadow-energy focus-energy"
          >
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">
                And counting
              </p>
              <p className="mt-4 font-display text-3xl font-semibold leading-tight tracking-[-0.02em]">
                New services ship every quarter
              </p>
            </div>
            <span className="mt-6 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-ink-950 transition group-hover:bg-accent-400">
              <ArrowRight size={16} weight="bold" aria-hidden />
            </span>
          </Link>
        </li>
      </ul>
    </section>
  );
}
