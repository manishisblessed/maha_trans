"use client";

import { ArrowRight, DeviceMobile, GooglePlayLogo } from "@phosphor-icons/react";
import { Reveal } from "@/components/motion";
import { cn } from "@/lib/utils";

export function AppDownloadBanner() {
  return (
    <section
      className="bg-white py-16 md:py-20"
      aria-labelledby="app-heading"
    >
      <div className="container-x">
        <Reveal>
          <div className="grain relative overflow-hidden rounded-4xl bg-ink-950 text-white">
            <div
              aria-hidden
              className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-energy-gradient opacity-40 blur-3xl"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-gradient-to-br from-brand-600 to-royal-600 opacity-30 blur-3xl"
            />

            <div className="relative z-10 grid items-center gap-10 p-8 md:grid-cols-12 md:gap-6 md:p-12">
              {/* Copy */}
              <div className="md:col-span-7">
                <span className="inline-flex items-center gap-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-white/55">
                  <span className="brand-dot" aria-hidden />
                  Mobile app
                </span>
                <h2
                  id="app-heading"
                  className="mt-4 font-display text-3xl font-semibold leading-[1.05] tracking-[-0.02em] md:text-5xl"
                >
                  Your entire counter, in your pocket.
                </h2>
                <p className="mt-4 max-w-lg text-sm text-white/60 md:text-base">
                  The TRANSPE app gives you the full dashboard on your phone.
                  Process transactions, track earnings, manage your network
                  and withdraw commissions — anywhere, anytime.
                </p>

                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <a
                    href="#"
                    className={cn(
                      "btn-shine focus-energy inline-flex h-12 items-center gap-2.5 rounded-2xl px-6",
                      "bg-white text-ink-950 font-semibold text-sm shadow-energy-sm",
                      "transition hover:-translate-y-0.5 hover:shadow-energy"
                    )}
                  >
                    <GooglePlayLogo size={20} weight="fill" aria-hidden />
                    Download on Google Play
                  </a>
                  <a
                    href="#"
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-white/80 transition hover:text-white focus-energy"
                  >
                    <DeviceMobile size={16} weight="duotone" aria-hidden />
                    Get APK directly
                    <ArrowRight size={14} weight="bold" aria-hidden />
                  </a>
                </div>
              </div>

              {/* Phone preview */}
              <div className="flex justify-center md:col-span-5">
                <div className="relative w-48 md:w-56">
                  <div
                    aria-hidden
                    className="absolute -inset-6 rounded-[3rem] bg-energy-gradient opacity-25 blur-2xl"
                  />
                  <div className="relative rounded-[2rem] border border-white/10 bg-ink-900 p-2 shadow-2xl ring-1 ring-white/5">
                    <div className="overflow-hidden rounded-[1.5rem] bg-[#0b1020]">
                      <div className="flex items-center justify-between px-4 py-3 text-[10px] text-white/50">
                        <span>9:41</span>
                        <span className="font-display font-semibold tracking-tight text-white/80">
                          TRANSPE
                        </span>
                      </div>

                      <div className="space-y-3 px-3 pb-5">
                        <div className="rounded-2xl bg-energy-gradient p-3 text-white">
                          <p className="text-[9px] font-semibold uppercase tracking-wider text-white/70">
                            Today&apos;s earnings
                          </p>
                          <p className="mt-1 font-display text-2xl font-semibold tabular-nums">
                            ₹2,340
                          </p>
                        </div>

                        <div className="grid grid-cols-4 gap-1.5">
                          {["AePS", "Send", "Bills", "QR"].map((s) => (
                            <div
                              key={s}
                              className="flex flex-col items-center gap-0.5 rounded-lg bg-white/[0.05] py-2 text-white/60"
                            >
                              <div className="h-3 w-3 rounded-full bg-white/20" />
                              <span className="text-[8px] font-medium">{s}</span>
                            </div>
                          ))}
                        </div>

                        {[1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className="flex items-center gap-2 rounded-xl bg-white/[0.04] p-2 ring-1 ring-white/5"
                          >
                            <div className="h-7 w-7 rounded-lg bg-white/10" />
                            <div className="flex-1 space-y-1">
                              <div className="h-2 w-3/4 rounded-full bg-white/15" />
                              <div className="h-1.5 w-1/2 rounded-full bg-white/8" />
                            </div>
                            <span className="text-[9px] font-bold text-accent-400">
                              +₹{[6, 8, 4][i - 1]}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
