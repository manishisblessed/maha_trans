import { heroStats } from "@/lib/data";
import { Reveal } from "@/components/motion";
import { CountUp } from "./_shared/CountUp";

/**
 * Thin proof band directly under the hero — the four headline network
 * numbers, separated by gradient keylines. Replaces the old in-hero stat row.
 */
export function ImpactStrip() {
  return (
    <section className="relative border-b border-ink-100 bg-white">
      <div className="container-x">
        <div className="grid grid-cols-2 lg:grid-cols-4">
          {heroStats.map((s, i) => (
            <Reveal
              key={s.label}
              delay={i * 0.08}
              className="relative px-2 py-8 text-center md:py-10"
            >
              {i > 0 && (
                <span
                  aria-hidden
                  className="absolute inset-y-6 left-0 hidden w-px bg-gradient-to-b from-transparent via-ink-200 to-transparent lg:block"
                />
              )}
              <p className="font-display text-3xl font-semibold tracking-[-0.02em] text-ink-950 md:text-4xl">
                <CountUp value={s.value} />
              </p>
              <p className="mt-1.5 text-xs font-medium uppercase tracking-[0.12em] text-ink-500">
                {s.label}
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
