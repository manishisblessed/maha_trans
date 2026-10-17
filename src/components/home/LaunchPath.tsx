"use client";

import { useRef } from "react";
import { motion, useScroll, useSpring, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  IdentificationCard,
  Storefront,
  ToggleRight,
  Wallet
} from "@phosphor-icons/react";
import { IconTile, type IconTone } from "@/components/ui/Icon";
import { Reveal } from "@/components/motion";
import { cn } from "@/lib/utils";
import { SectionHeading } from "./_shared/SectionHeading";
import { ButtonLink } from "./_shared/ButtonLink";

const MILESTONES: {
  time: string;
  title: string;
  body: string;
  icon: React.ComponentProps<typeof IconTile>["icon"];
  tone: IconTone;
}[] = [
  {
    time: "Minute 0",
    title: "Register with PAN + Aadhaar",
    body: "Your mobile number is your login. No paperwork to courier, no joining fee, no agent visit needed.",
    icon: IdentificationCard,
    tone: "brand"
  },
  {
    time: "Minute 5",
    title: "e-KYC verified, counter approved",
    body: "OTP-based Aadhaar verification plus a live selfie. Most partners clear KYC before their chai goes cold.",
    icon: Storefront,
    tone: "royal"
  },
  {
    time: "Minute 10",
    title: "Switch on your first services",
    body: "Pick AePS, money transfer, bills or all sixty. Each service activates instantly with its commission slab shown upfront.",
    icon: ToggleRight,
    tone: "accent"
  },
  {
    time: "Same afternoon",
    title: "First commission in the wallet",
    body: "Serve your first customer and watch the credit land in real time. Withdraw to your bank 24×7 via IMPS.",
    icon: Wallet,
    tone: "coral"
  }
];

/**
 * Vertical scroll-driven timeline — the line fills as you scroll, milestones
 * alternate sides on desktop.
 */
export function LaunchPath() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.75", "end 0.6"]
  });
  const fill = useSpring(scrollYProgress, { stiffness: 120, damping: 28 });

  return (
    <section className="section bg-white">
      <div className="container-x">
        <SectionHeading
          align="center"
          eyebrow="From signup to first rupee"
          title="Live before lunch"
          sub="No franchise fee, no territory lock-in, no waiting period. This is the entire journey — timed."
        />

        <div ref={ref} className="relative mx-auto mt-16 max-w-4xl">
          {/* Spine */}
          <div
            aria-hidden
            className="absolute inset-y-0 left-5 w-px bg-ink-100 md:left-1/2 md:-translate-x-1/2"
          />
          <motion.div
            aria-hidden
            style={{ scaleY: reduce ? 1 : fill }}
            className="absolute inset-y-0 left-5 w-px origin-top bg-energy-gradient md:left-1/2 md:-translate-x-1/2"
          />

          <ol className="space-y-12 md:space-y-16">
            {MILESTONES.map((m, i) => {
              const left = i % 2 === 0;
              return (
                <li key={m.title} className="relative">
                  {/* Node */}
                  <span
                    aria-hidden
                    className="absolute left-5 top-7 z-10 -translate-x-1/2 md:left-1/2"
                  >
                    <span className="block h-3.5 w-3.5 rounded-full border-2 border-white bg-energy-gradient shadow-energy-sm" />
                  </span>

                  <Reveal
                    direction={left ? "right" : "left"}
                    className={cn(
                      "ml-12 md:ml-0 md:w-[calc(50%-2.5rem)]",
                      left ? "md:mr-auto" : "md:ml-auto"
                    )}
                  >
                    <div className="card-base">
                      <div className="flex items-center justify-between gap-4">
                        <IconTile icon={m.icon} tone={m.tone} size="lg" />
                        <span className="rounded-full bg-ink-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-ink-500">
                          {m.time}
                        </span>
                      </div>
                      <h3 className="mt-4 font-display text-xl font-semibold tracking-[-0.01em] text-ink-950">
                        {m.title}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-ink-500">{m.body}</p>
                    </div>
                  </Reveal>
                </li>
              );
            })}
          </ol>
        </div>

        <Reveal className="mt-14 text-center">
          <ButtonLink href="/register" size="lg">
            Start the clock
            <ArrowRight size={16} weight="bold" aria-hidden />
          </ButtonLink>
        </Reveal>
      </div>
    </section>
  );
}
