import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, LinkedinLogo } from "@phosphor-icons/react/dist/ssr";
import { Container, Section } from "@/components/ui/Container";
import { PageHero } from "@/components/PageHero";
import { SectionIntro } from "@/components/marketing/SectionIntro";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Reveal, Stagger, StaggerItem } from "@/components/motion";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Team",
  description:
    "The people behind the TRANSPE counter: payments, field sales, compliance and design, most of whom have run a shop themselves."
};

const team = [
  {
    name: "Nikhil Deshmukh",
    role: "Co-founder & CEO",
    bio: "Former payments head at a top private bank. On a mission to make every shop a financial touchpoint."
  },
  {
    name: "Kavita Rao",
    role: "Co-founder & COO",
    bio: "12 years scaling retail distribution networks. Relentless about retailer success."
  },
  {
    name: "Siddharth Kulkarni",
    role: "CTO",
    bio: "Distributed systems veteran. Happiest when latency drops and uptime holds."
  },
  {
    name: "Tanvi Patil",
    role: "VP Product",
    bio: "Crafts simple flows for first-time smartphone users across India."
  },
  {
    name: "Arjun Deshpande",
    role: "VP Engineering",
    bio: "Scaled payment platforms processing billions of rupees. Loves clean architecture."
  },
  {
    name: "Ritu Menon",
    role: "Head of Compliance",
    bio: "Veteran banking-compliance examiner. Ensures every transaction stays safe and compliant."
  },
  {
    name: "Deepak Pawar",
    role: "Head of Sales",
    bio: "Built channel partner networks spanning 24 states from scratch."
  },
  {
    name: "Ananya Bhatt",
    role: "Head of Design",
    bio: "Designs interfaces that work in every Indian language and literacy level."
  }
];

const tiles = [
  "from-brand-500 to-brand-700",
  "from-royal-500 to-royal-700",
  "from-coral-400 to-coral-600",
  "from-accent-500 to-accent-700",
  "from-amber-400 to-amber-600",
  "from-ink-700 to-ink-900",
  "from-brand-600 to-royal-600",
  "from-royal-600 to-coral-500"
];

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");
}

export default function TeamPage() {
  const founders = team.slice(0, 2);
  const leads = team.slice(2);

  return (
    <>
      <PageHero
        variant="light"
        eyebrow="Team"
        breadcrumbs={[{ label: "Team", href: "/team" }]}
        title={
          <>
            The people behind
            <br className="hidden md:block" /> your counter.
          </>
        }
        description="Payments, field sales, compliance and design. A small team from Pune with people in shops across 28 states."
        stats={[
          { value: String(team.length), label: "Leadership team" },
          { value: "85+", label: "Teammates" },
          { value: "9", label: "Languages spoken" },
          { value: "28", label: "States visited" }
        ]}
        actions={
          <Link href="/career" className="rounded-2xl focus-energy">
            <Button size="lg" tabIndex={-1}>
              Join the team
              <ArrowRight size={16} weight="bold" aria-hidden />
            </Button>
          </Link>
        }
      />

      {/* Founders — full-width feature panels */}
      <Section className="bg-ink-50/60">
        <Container>
          <SectionIntro
            eyebrow="Founders"
            title="Meet the people who pick up when you call."
            description="No stock photos. Just names, roles and what each of us is responsible for."
          />
          <Stagger className="grid gap-6 md:grid-cols-2">
            {founders.map((m, i) => (
              <StaggerItem
                key={m.name}
                className="grain group relative overflow-hidden rounded-4xl bg-ink-950 p-8 text-white transition hover:shadow-energy md:p-10"
              >
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-energy-gradient opacity-40 blur-3xl transition group-hover:opacity-70"
                />
                <div className="relative z-10 flex items-start justify-between">
                  <span
                    className={cn(
                      "grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br font-display text-2xl font-semibold text-white shadow-energy-sm transition group-hover:scale-105",
                      tiles[i % tiles.length]
                    )}
                    aria-hidden
                  >
                    {initials(m.name)}
                  </span>
                  <a
                    href="#"
                    aria-label={`${m.name} on LinkedIn`}
                    className="grid h-10 w-10 place-items-center rounded-full border border-white/15 text-white/60 transition hover:border-white/40 hover:bg-white/10 hover:text-white focus-energy"
                  >
                    <LinkedinLogo size={17} weight="duotone" aria-hidden />
                  </a>
                </div>
                <h3 className="relative z-10 mt-7 font-display text-2xl font-semibold tracking-[-0.02em] md:text-3xl">
                  {m.name}
                </h3>
                <p className="relative z-10 mt-1 text-sm font-semibold text-accent-300">{m.role}</p>
                <p className="relative z-10 mt-4 max-w-md text-sm leading-relaxed text-white/65">
                  {m.bio}
                </p>
              </StaggerItem>
            ))}
          </Stagger>

          {/* Leads — roster rows */}
          <Stagger className="mt-6 grid gap-4 md:grid-cols-2">
            {leads.map((m, i) => (
              <StaggerItem
                key={m.name}
                className="gradient-ring group flex items-start gap-5 rounded-3xl border border-ink-100 bg-white p-6 transition hover:-translate-y-0.5 hover:shadow-energy-sm"
              >
                <span
                  className={cn(
                    "grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br font-display text-base font-semibold text-white shadow-soft transition group-hover:scale-105",
                    tiles[(i + 2) % tiles.length]
                  )}
                  aria-hidden
                >
                  {initials(m.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-display text-lg font-semibold tracking-[-0.01em] text-ink-950">
                      {m.name}
                    </h3>
                    <a
                      href="#"
                      aria-label={`${m.name} on LinkedIn`}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-ink-100 text-ink-400 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 focus-energy"
                    >
                      <LinkedinLogo size={14} weight="duotone" aria-hidden />
                    </a>
                  </div>
                  <div className="mt-1.5">
                    <Badge variant="royal" size="sm">
                      {m.role}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-ink-600">{m.bio}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </Container>
      </Section>

      <Section className="bg-white pt-0">
        <Container>
          <Reveal>
            <div className="flex flex-col items-start gap-6 rounded-4xl border border-ink-100 bg-ink-50/60 p-8 md:flex-row md:items-center md:justify-between md:p-10">
              <div>
                <p className="font-display text-2xl font-semibold tracking-[-0.02em] text-ink-950 md:text-3xl">
                  85 more of us are in the field right now.
                </p>
                <p className="mt-2 max-w-xl text-sm text-ink-600 md:text-base">
                  Onboarding shops, fixing devices, answering calls in nine languages. Want in?
                </p>
              </div>
              <Link href="/career" className="shrink-0 rounded-2xl focus-energy">
                <Button size="lg" tabIndex={-1}>
                  See open roles
                  <ArrowRight size={16} weight="bold" aria-hidden />
                </Button>
              </Link>
            </div>
          </Reveal>
        </Container>
      </Section>
    </>
  );
}
