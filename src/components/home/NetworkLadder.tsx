"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Buildings,
  CheckCircle,
  Crown,
  Globe,
  Storefront
} from "@phosphor-icons/react";
import { IconTile, type IconTone } from "@/components/ui/Icon";
import { Reveal } from "@/components/motion";
import { commissionSlabs } from "@/lib/data";
import { cn } from "@/lib/utils";
import { SectionHeading } from "./_shared/SectionHeading";
import { ButtonLink } from "./_shared/ButtonLink";

const easeOut = [0.22, 1, 0.36, 1] as const;

type RoleKey = "retailer" | "distributor" | "master" | "super";

const ROLES: {
  key: RoleKey;
  label: string;
  icon: React.ComponentProps<typeof IconTile>["icon"];
  tone: IconTone;
  headline: string;
  body: string;
  points: string[];
  cta: string;
  slabCol: (s: (typeof commissionSlabs)[number]) => string;
}[] = [
  {
    key: "retailer",
    label: "Retailer",
    icon: Storefront,
    tone: "brand",
    headline: "Your shop, upgraded to a bank point",
    body: "Serve walk-in customers with cash-out, transfers, bills and travel. You earn the full retailer slab on every transaction — credited live.",
    points: [
      "60+ services from day one",
      "Real-time wallet credits",
      "Voice alerts on every payment",
      "WhatsApp-first support"
    ],
    cta: "Join as a retailer",
    slabCol: (s) => s.retailer
  },
  {
    key: "distributor",
    label: "Distributor",
    icon: Buildings,
    tone: "royal",
    headline: "Build a network, earn on every counter",
    body: "Onboard retailers in your area and collect an override on each transaction they process — your income compounds with your network.",
    points: [
      "Recruit & manage retailers",
      "Override on every network txn",
      "Float management tools",
      "Dedicated account manager"
    ],
    cta: "Become a distributor",
    slabCol: (s) => s.distributor
  },
  {
    key: "master",
    label: "Master distributor",
    icon: Crown,
    tone: "accent",
    headline: "Run the region. Own the rails.",
    body: "Appoint distributors, set your own margins within the band, and operate a white-labelled network with full API access.",
    points: [
      "Multi-level override income",
      "White-label branded app",
      "Full developer API access",
      "Priority settlement window"
    ],
    cta: "Talk to our team",
    slabCol: (s) => s.master
  },
  {
    key: "super",
    label: "Super distributor",
    icon: Globe,
    tone: "coral",
    headline: "Sit at the top. Earn on every rung.",
    body: "Appoint master distributors across states and collect an override on every transaction in the entire tree — the deepest income layer on the platform.",
    points: [
      "Appoint & manage master distributors",
      "Override across all four tiers",
      "State-level exclusivity options",
      "Direct line to the TRANSPE leadership desk"
    ],
    cta: "Apply for super distributor",
    slabCol: (s) => s.superDistributor
  }
];

/**
 * The four-tier network explained as a switchable "ladder" — role tabs on
 * top, a split panel (pitch + live slab table) below.
 */
export function NetworkLadder() {
  const [role, setRole] = useState<RoleKey>("retailer");
  const reduce = useReducedMotion();
  const active = ROLES.find((r) => r.key === role)!;

  return (
    <section className="section bg-white" id="network">
      <div className="container-x">
        <SectionHeading
          align="center"
          eyebrow="Four ways in"
          title="Pick your rung on the ladder"
          sub="Same platform, four business models. Switch tiers anytime as your network grows."
        />

        {/* Role tabs */}
        <div
          role="tablist"
          aria-label="Partner roles"
          className="mx-auto mt-10 flex w-fit max-w-full flex-wrap justify-center gap-1 rounded-full border border-ink-150 border-ink-200 bg-ink-50 p-1.5"
        >
          {ROLES.map((r) => {
            const selected = role === r.key;
            return (
              <button
                key={r.key}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setRole(r.key)}
                className={cn(
                  "relative rounded-full px-5 py-2.5 text-sm font-semibold transition focus-energy",
                  selected ? "text-white" : "text-ink-600 hover:text-ink-900"
                )}
              >
                {selected && (
                  <motion.span
                    layoutId="role-pill"
                    aria-hidden
                    className="absolute inset-0 rounded-full bg-ink-950"
                    transition={{ type: "spring", stiffness: 400, damping: 34 }}
                  />
                )}
                <span className="relative z-10">{r.label}</span>
              </button>
            );
          })}
        </div>

        {/* Panel */}
        <div className="mx-auto mt-10 max-w-5xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={role}
              initial={reduce ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -12 }}
              transition={{ duration: 0.35, ease: easeOut }}
              className="grid overflow-hidden rounded-4xl border border-ink-100 shadow-soft md:grid-cols-2"
            >
              {/* Pitch */}
              <div className="flex flex-col justify-between bg-white p-8 md:p-10">
                <div>
                  <IconTile icon={active.icon} tone={active.tone} size="xl" />
                  <h3 className="mt-6 font-display text-2xl font-semibold tracking-[-0.02em] text-ink-950 md:text-3xl">
                    {active.headline}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-ink-500 md:text-base">
                    {active.body}
                  </p>
                  <ul className="mt-6 space-y-2.5">
                    {active.points.map((p) => (
                      <li key={p} className="flex items-center gap-2.5 text-sm text-ink-700">
                        <CheckCircle size={16} weight="fill" className="shrink-0 text-accent-500" aria-hidden />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
                <ButtonLink href="/register" size="lg" linkClassName="mt-8 w-fit">
                  {active.cta}
                  <ArrowRight size={16} weight="bold" aria-hidden />
                </ButtonLink>
              </div>

              {/* Slab table */}
              <div className="grain bg-ink-950 p-8 text-white md:p-10">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">
                  Published {active.label.toLowerCase()} slabs
                </p>
                <ul className="mt-5 divide-y divide-white/[0.07]">
                  {commissionSlabs.slice(0, 6).map((s) => (
                    <li key={s.service} className="flex items-center justify-between gap-4 py-3">
                      <span className="text-sm text-white/70">{s.service}</span>
                      <span className="font-display text-sm font-semibold tabular-nums text-accent-300">
                        {active.slabCol(s)}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-5 text-[11px] leading-relaxed text-white/40">
                  Full slab sheet visible inside your dashboard before you
                  activate any service. Revisions carry 7 days notice.
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
