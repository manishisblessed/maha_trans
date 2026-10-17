import { MapPinArea, Translate } from "@phosphor-icons/react/dist/ssr";
import { Reveal, Stagger, StaggerItem } from "@/components/motion";
import { coverageZones, indiaMissions, languagesSupported } from "@/lib/data";
import { SectionHeading } from "./_shared/SectionHeading";
import { CountUp } from "./_shared/CountUp";

/**
 * Coverage + Bharat missions as one editorial block: zone ledger on the left,
 * numbered mission list on the right, language band underneath.
 */
export function BharatGrid() {
  return (
    <section className="section bg-white" id="bharat">
      <div className="container-x">
        <SectionHeading
          eyebrow="Built for India"
          title="From metro high streets to Gram Panchayats"
          sub="Wherever there is a counter and a customer, TRANSPE runs — in nine languages, across every zone of the country."
        />

        <div className="mt-12 grid gap-10 lg:grid-cols-12">
          {/* Zone ledger */}
          <div className="lg:col-span-7">
            <Stagger className="overflow-hidden rounded-3xl border border-ink-100">
              {coverageZones.map((z, i) => (
                <StaggerItem
                  key={z.zone}
                  className="group grid grid-cols-[auto_1fr_auto] items-center gap-4 border-b border-ink-100 bg-white px-6 py-5 transition last:border-b-0 hover:bg-ink-50/60 sm:grid-cols-[auto_1fr_auto_auto]"
                >
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-royal-50 text-royal-700">
                    <MapPinArea size={20} weight="duotone" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="font-display text-base font-semibold text-ink-950">
                      {z.zone} zone
                      <span className="ml-2 text-xs font-sans font-medium text-ink-400">
                        {z.states} states
                      </span>
                    </p>
                    <p className="mt-0.5 truncate text-xs text-ink-500">
                      {z.topCities.join(" · ")}
                    </p>
                  </div>
                  <div className="hidden text-right sm:block">
                    <p className="font-display text-xl font-semibold tabular-nums text-ink-950">
                      <CountUp value={z.retailers} />
                    </p>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">
                      counters
                    </p>
                  </div>
                  <span
                    aria-hidden
                    className="h-8 w-1 rounded-full bg-energy-gradient opacity-0 transition group-hover:opacity-100"
                  />
                </StaggerItem>
              ))}
            </Stagger>

            {/* Languages */}
            <Reveal className="mt-6 flex flex-wrap items-center gap-2 rounded-3xl border border-ink-100 bg-ink-50/60 px-5 py-4">
              <span className="mr-1 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em] text-ink-500">
                <Translate size={15} weight="duotone" aria-hidden />
                Speaks your language
              </span>
              {languagesSupported.map((l) => (
                <span
                  key={l}
                  className="rounded-full border border-ink-200 bg-white px-3 py-1 text-xs font-medium text-ink-700"
                >
                  {l}
                </span>
              ))}
            </Reveal>
          </div>

          {/* Missions */}
          <div className="lg:col-span-5">
            <ol className="space-y-5">
              {indiaMissions.map((m, i) => (
                <Reveal as="li" key={m.code} delay={i * 0.07} direction="left">
                  <div className="rounded-3xl border border-ink-100 bg-white p-6 transition hover:shadow-energy-sm">
                    <div className="flex items-baseline justify-between gap-4">
                      <span className="font-display text-xs font-bold tracking-[0.2em] text-royal-400">
                        {m.code}
                      </span>
                      <span className="text-right">
                        <span className="font-display text-lg font-semibold text-ink-950">
                          <CountUp value={m.stat} />
                        </span>
                      </span>
                    </div>
                    <h3 className="mt-2 font-display text-lg font-semibold tracking-[-0.01em] text-ink-950">
                      {m.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{m.body}</p>
                    <p className="mt-2 text-[11px] font-medium uppercase tracking-wider text-ink-400">
                      {m.statLabel}
                    </p>
                  </div>
                </Reveal>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
