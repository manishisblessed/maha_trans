import { ArrowRight, Check } from "@phosphor-icons/react/dist/ssr";
import { Reveal } from "@/components/motion";
import { pricingPlans } from "@/lib/data";
import { cn } from "@/lib/utils";
import { SectionHeading } from "./_shared/SectionHeading";
import { ButtonLink } from "./_shared/ButtonLink";

/**
 * Pricing as a single joined "board" — three columns sharing one border,
 * the highlighted plan rendered as a dark tower that breaks the row.
 */
export function PlansBoard() {
  return (
    <section className="section bg-ink-50/60" id="pricing">
      <div className="container-x">
        <SectionHeading
          align="center"
          eyebrow="Membership"
          title="Priced for the counter, not the boardroom"
          sub="Start free. Upgrade only when the commission you are leaving on the table costs more than the plan."
        />

        <div className="mx-auto mt-14 grid max-w-5xl gap-6 lg:grid-cols-3 lg:items-stretch">
          {pricingPlans.map((plan, i) => {
            const dark = Boolean(plan.highlighted);
            return (
              <Reveal
                key={plan.name}
                delay={i * 0.08}
                className={cn(dark && "lg:-my-5")}
              >
                <div
                  className={cn(
                    "flex h-full flex-col rounded-4xl p-8",
                    dark
                      ? "grain relative overflow-hidden bg-ink-950 text-white shadow-energy"
                      : "border border-ink-100 bg-white shadow-sm transition hover:shadow-energy-sm"
                  )}
                >
                  {dark && (
                    <div
                      aria-hidden
                      className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-energy-gradient opacity-50 blur-3xl"
                    />
                  )}

                  <div className="relative z-10 flex items-center justify-between">
                    <h3
                      className={cn(
                        "font-display text-lg font-semibold",
                        dark ? "text-white" : "text-ink-950"
                      )}
                    >
                      {plan.name}
                    </h3>
                    {dark && (
                      <span className="rounded-full bg-accent-400/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-accent-300">
                        Most chosen
                      </span>
                    )}
                  </div>

                  <p className={cn("relative z-10 mt-5", dark ? "text-white" : "text-ink-950")}>
                    <span className="font-display text-5xl font-semibold tracking-[-0.02em]">
                      {plan.price}
                    </span>
                    <span className={cn("ml-1.5 text-sm", dark ? "text-white/50" : "text-ink-400")}>
                      {plan.cadence}
                    </span>
                  </p>

                  <p
                    className={cn(
                      "relative z-10 mt-3 text-sm leading-relaxed",
                      dark ? "text-white/60" : "text-ink-500"
                    )}
                  >
                    {plan.description}
                  </p>

                  <ul className="relative z-10 mt-7 flex-1 space-y-3">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm">
                        <span
                          className={cn(
                            "mt-0.5 grid h-4.5 w-5 shrink-0 place-items-center rounded-full",
                            dark ? "text-accent-300" : "text-accent-600"
                          )}
                        >
                          <Check size={14} weight="bold" aria-hidden />
                        </span>
                        <span className={dark ? "text-white/80" : "text-ink-700"}>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <ButtonLink
                    href={plan.name === "Distributor" ? "/contact" : "/register"}
                    size="lg"
                    variant={dark ? "primary" : "outline"}
                    linkClassName="relative z-10 mt-8 w-full"
                    className="w-full"
                  >
                    {plan.cta}
                    <ArrowRight size={15} weight="bold" aria-hidden />
                  </ButtonLink>
                </div>
              </Reveal>
            );
          })}
        </div>

        <Reveal className="mt-10 text-center text-xs text-ink-400">
          All plans include the same security, settlement speed and support.
          GST extra on paid plans · 7-day cancellation window on first activation.
        </Reveal>
      </div>
    </section>
  );
}
