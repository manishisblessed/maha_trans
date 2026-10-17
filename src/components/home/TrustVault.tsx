import { SealCheck } from "@phosphor-icons/react/dist/ssr";
import { Reveal, Stagger, StaggerItem } from "@/components/motion";
import { certifications, footerCertifications } from "@/lib/data";
import { SectionHeading } from "./_shared/SectionHeading";

/**
 * Dark "vault" band — every licence, certification and audit laid out as
 * ledger rows, with a slow compliance marquee underneath.
 */
export function TrustVault() {
  return (
    <section className="grain relative overflow-hidden bg-ink-950 text-white" id="trust">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="conic-glow absolute -left-40 top-1/3 h-[480px] w-[480px] rounded-full" />
      </div>

      <div className="container-x section relative z-10">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <SectionHeading
              dark
              eyebrow="The vault"
              title="Regulated at every layer"
              sub="Money moves only on licensed rails. Here is the full paper trail — every authority, every audit, in the open."
            />
            <Reveal delay={0.15} className="mt-8 rounded-3xl border border-white/10 bg-white/[0.04] p-6">
              <p className="font-display text-5xl font-semibold tracking-[-0.02em] text-accent-300">
                8
              </p>
              <p className="mt-1 text-sm text-white/55">
                independent regulatory & security frameworks, verified annually
              </p>
            </Reveal>
          </div>

          <div className="lg:col-span-8">
            <Stagger className="grid gap-px overflow-hidden rounded-3xl border border-white/10 bg-white/10 sm:grid-cols-2">
              {certifications.map((c) => (
                <StaggerItem
                  key={c.code}
                  className="group bg-ink-950 p-6 transition hover:bg-ink-900"
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex rounded-lg border border-white/15 bg-white/[0.06] px-2.5 py-1 font-display text-xs font-bold tracking-wider text-white">
                      {c.code}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.14em] text-accent-400">
                      <SealCheck size={12} weight="fill" aria-hidden />
                      {c.status}
                    </span>
                  </div>
                  <h3 className="mt-4 font-display text-base font-semibold text-white">
                    {c.name}
                  </h3>
                  <p className="text-[11px] text-white/40">{c.authority}</p>
                  <p className="mt-2 text-xs leading-relaxed text-white/55">
                    {c.description}
                  </p>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </div>
      </div>

      {/* Compliance marquee */}
      <div className="relative z-10 border-t border-white/[0.07] py-5">
        <div className="mask-fade-x overflow-hidden">
          <div className="flex w-max animate-marquee gap-10 pr-10 [animation-duration:38s]">
            {[...footerCertifications, ...footerCertifications].map((c, i) => (
              <span
                key={`${c}-${i}`}
                className="inline-flex items-center gap-2 whitespace-nowrap text-xs font-semibold uppercase tracking-[0.14em] text-white/35"
              >
                <SealCheck size={14} weight="duotone" className="text-accent-400/70" aria-hidden />
                {c}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
