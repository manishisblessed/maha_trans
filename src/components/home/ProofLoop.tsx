"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CaretLeft, CaretRight, Quotes, Star } from "@phosphor-icons/react";
import { testimonials } from "@/lib/data";
import { cn } from "@/lib/utils";
import { SectionHeading } from "./_shared/SectionHeading";

const easeOut = [0.22, 1, 0.36, 1] as const;
const AUTOPLAY_MS = 6000;

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/**
 * One big rotating quote — auto-advances, with manual controls and a progress
 * dot rail. A completely different silhouette from a card grid.
 */
export function ProofLoop() {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (reduce || paused) return;
    const t = setInterval(
      () => setIndex((i) => (i + 1) % testimonials.length),
      AUTOPLAY_MS
    );
    return () => clearInterval(t);
  }, [reduce, paused]);

  const t = testimonials[index];
  const [shop, city] = splitRole(t.role);

  return (
    <section
      className="section bg-ink-50/60"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="container-x">
        <SectionHeading
          align="center"
          eyebrow="From the counters"
          title="Partners do the talking"
        />

        <div className="relative mx-auto mt-12 max-w-3xl text-center">
          <Quotes
            size={56}
            weight="fill"
            aria-hidden
            className="mx-auto text-royal-200"
          />

          <div className="relative mt-4 min-h-[220px] sm:min-h-[180px]">
            <AnimatePresence mode="wait">
              <motion.figure
                key={index}
                initial={reduce ? false : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: -14 }}
                transition={{ duration: 0.45, ease: easeOut }}
              >
                <blockquote className="font-display text-xl font-medium leading-snug tracking-[-0.01em] text-ink-900 sm:text-2xl">
                  “{t.quote}”
                </blockquote>
                <figcaption className="mt-7 flex items-center justify-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-energy-gradient font-display text-sm font-bold text-white">
                    {initials(t.name)}
                  </span>
                  <span className="text-left">
                    <span className="block text-sm font-semibold text-ink-950">{t.name}</span>
                    <span className="block text-xs text-ink-500">
                      {shop}
                      {city && <> · {city}</>}
                    </span>
                  </span>
                  <span className="ml-2 flex gap-0.5" aria-label={`${t.rating} out of 5 stars`}>
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} size={13} weight="fill" className="text-amber-400" aria-hidden />
                    ))}
                  </span>
                </figcaption>
              </motion.figure>
            </AnimatePresence>
          </div>

          {/* Controls */}
          <div className="mt-8 flex items-center justify-center gap-5">
            <button
              type="button"
              aria-label="Previous story"
              onClick={() =>
                setIndex((i) => (i - 1 + testimonials.length) % testimonials.length)
              }
              className="grid h-10 w-10 place-items-center rounded-full border border-ink-200 bg-white text-ink-600 transition hover:border-ink-400 hover:text-ink-950 focus-energy active:scale-95"
            >
              <CaretLeft size={14} weight="bold" aria-hidden />
            </button>

            <div className="flex items-center gap-2" role="tablist" aria-label="Stories">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  aria-label={`Story ${i + 1}`}
                  onClick={() => setIndex(i)}
                  className={cn(
                    "h-2 rounded-full transition-all focus-energy",
                    i === index ? "w-8 bg-energy-gradient-x bg-ink-900" : "w-2 bg-ink-200 hover:bg-ink-300"
                  )}
                />
              ))}
            </div>

            <button
              type="button"
              aria-label="Next story"
              onClick={() => setIndex((i) => (i + 1) % testimonials.length)}
              className="grid h-10 w-10 place-items-center rounded-full border border-ink-200 bg-white text-ink-600 transition hover:border-ink-400 hover:text-ink-950 focus-energy active:scale-95"
            >
              <CaretRight size={14} weight="bold" aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

/** "Gupta Digital Point, Nagpur" → ["Gupta Digital Point", "Nagpur"] */
function splitRole(role: string): [string, string | null] {
  const i = role.lastIndexOf(",");
  if (i === -1) return [role, null];
  return [role.slice(0, i).trim(), role.slice(i + 1).trim()];
}
