import {
  AppleLogo,
  ArrowRight,
  DeviceMobileCamera,
  GooglePlayLogo
} from "@phosphor-icons/react/dist/ssr";
import { Reveal } from "@/components/motion";
import { ButtonLink } from "./_shared/ButtonLink";

/**
 * Final conversion slab — one giant gradient panel that merges the closing
 * CTA with the app download row. Replaces two separate sections.
 */
export function ClosingSlab() {
  return (
    <section className="section bg-white" id="get-app">
      <div className="container-x">
        <Reveal>
          <div className="grain relative overflow-hidden rounded-5xl bg-energy-gradient px-6 py-16 text-center text-white md:px-16 md:py-20">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-20 [background:radial-gradient(60%_80%_at_50%_0%,rgba(255,255,255,0.5),transparent_70%)]"
            />

            <p className="relative z-10 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-white/85 backdrop-blur">
              <DeviceMobileCamera size={14} weight="duotone" aria-hidden />
              Web · Android · iOS
            </p>

            <h2 className="relative z-10 mx-auto mt-6 max-w-3xl font-display text-4xl font-semibold leading-[1.04] tracking-[-0.025em] md:text-6xl">
              The queue outside your shop is a revenue line.
            </h2>
            <p className="relative z-10 mx-auto mt-5 max-w-xl text-sm text-white/75 md:text-base">
              Join before 10 AM and most partners complete their first paid
              transaction the same day. Free to start, nothing to install at
              the counter.
            </p>

            <div className="relative z-10 mt-9 flex flex-wrap items-center justify-center gap-3">
              <ButtonLink
                href="/register"
                size="xl"
                variant="accent"
                className="bg-white from-white to-white text-ink-950 hover:shadow-glow"
              >
                Create free account
                <ArrowRight size={16} weight="bold" aria-hidden />
              </ButtonLink>
              <ButtonLink
                href="/login"
                size="xl"
                variant="outline"
                className="border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white"
              >
                Partner login
              </ButtonLink>
            </div>

            {/* Store badges */}
            <div className="relative z-10 mt-10 flex flex-wrap items-center justify-center gap-3">
              {[
                { icon: GooglePlayLogo, top: "Get it on", store: "Google Play" },
                { icon: AppleLogo, top: "Download on the", store: "App Store" }
              ].map((b) => {
                const BIcon = b.icon;
                return (
                  <span
                    key={b.store}
                    className="inline-flex cursor-default items-center gap-3 rounded-2xl border border-white/20 bg-ink-950/40 px-5 py-2.5 text-left backdrop-blur transition hover:bg-ink-950/60"
                  >
                    <BIcon size={24} weight="fill" aria-hidden />
                    <span>
                      <span className="block text-[9px] font-semibold uppercase tracking-wider text-white/60">
                        {b.top}
                      </span>
                      <span className="block font-display text-sm font-semibold">
                        {b.store}
                      </span>
                    </span>
                  </span>
                );
              })}
              <span className="w-full text-[11px] text-white/55 sm:w-auto">
                Mobile apps launching soon — join the waitlist from your dashboard.
              </span>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
