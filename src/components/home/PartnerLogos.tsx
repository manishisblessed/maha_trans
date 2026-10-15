import { Reveal } from "@/components/motion";
import { integrations } from "@/lib/data";
import { cn } from "@/lib/utils";

const PARTNERS = integrations.slice(0, 10);

export function PartnerLogos() {
  const loop = [...PARTNERS, ...PARTNERS];
  return (
    <section
      aria-label="Our partners and rails"
      className="border-b border-ink-100 bg-white py-8 md:py-10"
    >
      <div className="container-x mb-5">
        <Reveal>
          <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">
            Powered by India&apos;s most trusted rails &amp; banking partners
          </p>
        </Reveal>
      </div>
      <div className="mask-fade-x overflow-hidden">
        <ul
          className="flex w-max gap-6 pr-6 animate-marquee motion-reduce:animate-none"
          style={{ animationDuration: "40s" }}
        >
          {loop.map((p, i) => (
            <li
              key={`${p.name}-${i}`}
              aria-hidden={i >= PARTNERS.length || undefined}
              className="flex items-center gap-3 whitespace-nowrap rounded-2xl border border-ink-100 bg-ink-50/60 px-5 py-3"
            >
              <span
                className={cn(
                  "grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br font-display text-[10px] font-bold tracking-wide text-white",
                  p.color
                )}
                aria-hidden
              >
                {p.initials}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink-900">{p.name}</p>
                <p className="text-[11px] text-ink-400">{p.category}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
