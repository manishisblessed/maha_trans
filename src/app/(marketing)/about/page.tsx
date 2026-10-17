import type { Metadata } from "next";
import Link from "next/link";
import type { Icon as PhosphorIcon } from "@phosphor-icons/react";
import {
  ArrowRight,
  ArrowUpRight,
  Eye,
  Lightning,
  Quotes,
  Storefront,
  WifiHigh
} from "@phosphor-icons/react/dist/ssr";
import { Container, Section } from "@/components/ui/Container";
import { PageHero } from "@/components/PageHero";
import { SectionIntro } from "@/components/marketing/SectionIntro";
import { Button } from "@/components/ui/Button";
import { IconTile, type IconTone } from "@/components/ui/Icon";
import { Reveal, Stagger, StaggerItem } from "@/components/motion";
import { company, heroStats } from "@/lib/data";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Company",
  description:
    "TRANSPE turns neighbourhood retail shops into bank counters. Here is why we exist, the numbers that matter and what we stand for."
};

const milestones = [
  {
    when: "Jan 2026",
    title: "The idea",
    text: "Two hundred shop visits across Maharashtra and Western India. Same answer everywhere: the nearest bank is far, the customer is right here."
  },
  {
    when: "Mar 2026",
    title: "First 1,000 shops",
    text: "AePS and money transfer go live for pilot retailers in Pune, Nashik and Kolhapur."
  },
  {
    when: "Jun 2026",
    title: "NPCI rails live",
    text: "UPI, BBPS and AePS certified directly on NPCI. Bills and recharges join the counter."
  },
  {
    when: "Oct 2026",
    title: "72K shops",
    text: "Payment gateway, POS and QR roll out. The distributor programme opens across 28 states."
  }
];

const values: {
  icon: PhosphorIcon;
  tone: IconTone;
  title: string;
  text: string;
}[] = [
  {
    icon: Storefront,
    tone: "brand",
    title: "Retailer first",
    text: "Every screen is designed on a real shop counter, for one person, with a queue waiting."
  },
  {
    icon: Eye,
    tone: "accent",
    title: "Every rupee visible",
    text: "You see the fee and your commission before you press confirm. No PDFs, no surprises."
  },
  {
    icon: Lightning,
    tone: "coral",
    title: "Fast beats fancy",
    text: "Thirty seconds per transaction is the bar. If a feature slows you down, it does not ship."
  },
  {
    icon: WifiHigh,
    tone: "royal",
    title: "Built for weak networks",
    text: "Works on a 2G signal during a power cut. Offline queueing and smart retries are standard."
  }
];

const team = ["AS", "AI", "RM", "PN", "VB", "SK"];

export default function AboutPage() {
  return (
    <>
      <PageHero
        variant="dark"
        eyebrow="Company"
        breadcrumbs={[{ label: "Company", href: "/about" }]}
        title={
          <>
            The trust is yours.
            <br className="hidden md:block" /> The rails are ours.
          </>
        }
        description="TRANSPE is a fintech distribution platform from Pune. We give neighbourhood retail shops the rails of a bank branch: cash withdrawal, money transfer, bills, recharges, payments and travel — all from one counter."
        actions={
          <>
            <Link href="/register" className="rounded-2xl focus-energy">
              <Button size="lg" tabIndex={-1}>
                Start earning
                <ArrowRight size={16} weight="bold" aria-hidden />
              </Button>
            </Link>
            <Link href="/contact" className="rounded-2xl focus-energy">
              <Button
                size="lg"
                variant="outline"
                tabIndex={-1}
                className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              >
                Talk to us
              </Button>
            </Link>
          </>
        }
      >
        {/* Founders' note — full-width band under the headline */}
        <div className="grain relative overflow-hidden rounded-4xl border border-white/10 bg-white/[0.04] backdrop-blur-sm">
          <div className="grid gap-8 p-7 md:grid-cols-[auto_1fr_auto] md:items-center md:p-10">
            <Quotes size={44} weight="fill" aria-hidden className="text-accent-400/50" />
            <blockquote className="font-display text-2xl font-semibold leading-[1.18] tracking-[-0.02em] text-white md:text-3xl">
              If a shopkeeper can&rsquo;t finish a transaction in thirty
              seconds, on a weak signal, in their own language — we have
              failed.
            </blockquote>
            <div className="flex items-center gap-3 md:flex-col md:items-end md:gap-2">
              <div className="flex -space-x-2">
                {team.slice(0, 3).map((m, i) => (
                  <span
                    key={m}
                    className={cn(
                      "grid h-9 w-9 place-items-center rounded-full font-display text-[10px] font-semibold text-white ring-2 ring-ink-950",
                      ["bg-brand-600", "bg-royal-600", "bg-accent-600"][i]
                    )}
                  >
                    {m}
                  </span>
                ))}
              </div>
              <span className="text-xs text-white/55">
                Founders&rsquo; note · Pune, {company.incorporated}
              </span>
            </div>
          </div>
        </div>
      </PageHero>

      {/* Why we exist — centered manifesto */}
      <Section className="bg-white">
        <Container>
          <Reveal className="mx-auto max-w-4xl text-center">
            <span className="inline-flex items-center gap-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-royal-700">
              <span className="brand-dot" aria-hidden /> Why we exist
            </span>
            <p className="mt-6 font-display text-4xl font-semibold leading-[1.04] tracking-[-0.02em] text-ink-950 md:text-6xl">
              The bank is <span className="gradient-text">15 km</span> away.
              <br className="hidden md:block" />
              Your shop is 50 metres away.
            </p>
          </Reveal>

          <Stagger className="mx-auto mt-14 grid max-w-5xl gap-6 md:grid-cols-3">
            {[
              "For 400 million Indians, the nearest branch means a bus ride, a lost half-day and a queue. The shop at the corner is open 14 hours a day and already knows every customer by name.",
              "TRANSPE turns that shop into the branch. Withdraw cash on a fingerprint, send money anywhere in seconds, clear a pending bill, book a bus home. The shopkeeper earns on every single transaction.",
              "Zero joining fee. Transparent charges on every screen. Same-day settlement straight to your bank. That is the TRANSPE promise."
            ].map((p, i) => (
              <StaggerItem
                key={i}
                className={cn(
                  "rounded-3xl p-7 text-[15px] leading-relaxed",
                  i === 2
                    ? "grain bg-ink-950 font-medium text-white"
                    : "border border-ink-100 bg-ink-50/50 text-ink-600"
                )}
              >
                <span
                  className={cn(
                    "mb-4 block font-display text-xs font-bold tracking-[0.2em]",
                    i === 2 ? "text-accent-300" : "text-royal-400"
                  )}
                >
                  0{i + 1}
                </span>
                {p}
              </StaggerItem>
            ))}
          </Stagger>
        </Container>
      </Section>

      {/* Numbers — stat ledger rows */}
      <Section className="grain relative overflow-hidden bg-ink-950 text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-40 top-0 h-[520px] w-[520px] rounded-full bg-brand-600/20 blur-3xl"
        />
        <Container className="relative z-10">
          <SectionIntro
            dark
            eyebrow="Numbers that matter"
            title="Small shops. Serious volume."
            description="Updated every quarter, audited every year."
          />
          <Stagger className="divide-y divide-white/[0.08] border-y border-white/[0.08]">
            {heroStats.map((s, i) => (
              <StaggerItem
                key={s.label}
                className="group flex flex-col gap-2 py-8 transition hover:bg-white/[0.03] sm:flex-row sm:items-baseline sm:justify-between sm:px-4"
              >
                <div className="flex items-baseline gap-5">
                  <span className="font-display text-xs font-bold tracking-[0.2em] text-white/30">
                    0{i + 1}
                  </span>
                  <span className="text-sm font-medium uppercase tracking-[0.14em] text-white/60">
                    {s.label}
                  </span>
                </div>
                <span className="font-display text-5xl font-semibold leading-none tracking-[-0.03em] text-white transition group-hover:text-accent-300 md:text-7xl">
                  {s.value}
                </span>
              </StaggerItem>
            ))}
          </Stagger>
        </Container>
      </Section>

      {/* Journey — sticky year rail */}
      <Section className="bg-white">
        <Container>
          <SectionIntro
            eyebrow="Our journey"
            title="One year. Four turning points."
            description="From a notebook full of shop visits to a network across 28 states."
          />
          <div className="mx-auto max-w-4xl space-y-4">
            {milestones.map((m, i) => (
              <Reveal key={m.when} delay={i * 0.06}>
                <div className="group grid gap-4 rounded-3xl border border-ink-100 bg-white p-6 transition hover:border-royal-200 hover:shadow-energy-sm sm:grid-cols-[140px_1fr] md:p-8">
                  <div>
                    <p className="inline-flex rounded-full bg-royal-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-royal-700">
                      {m.when}
                    </p>
                  </div>
                  <div>
                    <h3 className="font-display text-xl font-semibold tracking-[-0.01em] text-ink-950 md:text-2xl">
                      {m.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-ink-600 md:text-[15px]">
                      {m.text}
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>

      {/* Values — split list */}
      <Section className="bg-ink-50/60">
        <Container>
          <div className="grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <SectionIntro
                eyebrow="What we stand for"
                title="Four rules we don't bend."
                className="mb-0 lg:sticky lg:top-32"
              />
            </div>
            <Stagger className="space-y-4 lg:col-span-8">
              {values.map((v, i) => (
                <StaggerItem
                  key={v.title}
                  className="gradient-ring group flex items-start gap-5 rounded-3xl border border-ink-100 bg-white p-6 transition hover:-translate-y-0.5 hover:shadow-energy-sm md:p-7"
                >
                  <IconTile tone={v.tone} size="lg">
                    <v.icon size={24} weight="duotone" aria-hidden />
                  </IconTile>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display text-lg font-semibold tracking-[-0.01em] text-ink-950 md:text-xl">
                      {v.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{v.text}</p>
                  </div>
                  <span className="hidden font-display text-4xl font-semibold leading-none text-ink-100 transition group-hover:text-royal-100 sm:block">
                    0{i + 1}
                  </span>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </Container>
      </Section>

      {/* Meet the team CTA */}
      <Section className="bg-white">
        <Container>
          <Reveal>
            <Link
              href="/team"
              className="gradient-ring group relative flex flex-col gap-8 overflow-hidden rounded-4xl border border-ink-100 bg-ink-50/60 p-8 transition hover:shadow-energy-sm md:flex-row md:items-center md:justify-between md:p-12 focus-energy"
              data-active="true"
            >
              <div className="relative z-10">
                <span className="inline-flex items-center gap-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-royal-700">
                  <span className="brand-dot" aria-hidden /> The people
                </span>
                <p className="mt-3 font-display text-3xl font-semibold leading-[1.05] tracking-[-0.02em] text-ink-950 md:text-5xl">
                  Meet the team behind your counter.
                </p>
                <p className="mt-3 max-w-xl text-sm text-ink-600 md:text-base">
                  Payments, field sales, compliance and design. Most of us have
                  stood behind a shop counter ourselves.
                </p>
              </div>
              <div className="relative z-10 flex items-center gap-4">
                <div className="flex -space-x-3">
                  {team.map((m, i) => (
                    <span
                      key={m}
                      className={cn(
                        "grid h-12 w-12 place-items-center rounded-2xl font-display text-xs font-semibold text-white ring-2 ring-white transition group-hover:-translate-y-1",
                        [
                          "bg-brand-600",
                          "bg-royal-600",
                          "bg-coral-500",
                          "bg-accent-600",
                          "bg-amber-500",
                          "bg-ink-700"
                        ][i]
                      )}
                      style={{ transitionDelay: `${i * 40}ms` }}
                    >
                      {m}
                    </span>
                  ))}
                </div>
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-ink-950 text-white transition group-hover:bg-energy-gradient">
                  <ArrowUpRight size={18} weight="bold" aria-hidden />
                </span>
              </div>
            </Link>
          </Reveal>
        </Container>
      </Section>
    </>
  );
}
