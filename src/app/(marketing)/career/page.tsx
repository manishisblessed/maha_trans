import type { Metadata } from "next";
import type { Icon as PhosphorIcon } from "@phosphor-icons/react";
import {
  ArrowRight,
  ArrowUpRight,
  ChartLineUp,
  Clock,
  Envelope,
  FirstAid,
  GraduationCap,
  House,
  MapPin
} from "@phosphor-icons/react/dist/ssr";
import { Container, Section } from "@/components/ui/Container";
import { PageHero } from "@/components/PageHero";
import { SectionIntro } from "@/components/marketing/SectionIntro";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { IconTile, type IconTone } from "@/components/ui/Icon";
import { Reveal, Stagger, StaggerItem } from "@/components/motion";
import { company } from "@/lib/data";

export const metadata: Metadata = {
  title: "Careers",
  description:
    "Build the counter that brings banking to every Indian shop. Open roles at TRANSPE across engineering, design, sales, operations and compliance."
};

const openings = [
  {
    title: "Senior Backend Engineer (Payments)",
    team: "Engineering",
    location: "Bengaluru / Remote",
    type: "Full-time"
  },
  {
    title: "Product Designer (Retailer App)",
    team: "Design",
    location: "Pune",
    type: "Full-time"
  },
  {
    title: "Regional Sales Manager",
    team: "Sales",
    location: "Lucknow",
    type: "Full-time"
  },
  {
    title: "Customer Success Lead",
    team: "Operations",
    location: "Pune",
    type: "Full-time"
  },
  {
    title: "Compliance Manager (Regulatory)",
    team: "Compliance",
    location: "Mumbai",
    type: "Full-time"
  },
  {
    title: "Growth Marketing Intern",
    team: "Marketing",
    location: "Remote",
    type: "Internship"
  }
];

const perks: { icon: PhosphorIcon; tone: IconTone; title: string; text: string }[] = [
  {
    icon: ChartLineUp,
    tone: "brand",
    title: "Salary plus ESOPs",
    text: "Own a piece of what you build. Every full-time role comes with equity."
  },
  {
    icon: FirstAid,
    tone: "coral",
    title: "Health cover for your family",
    text: "You, your partner, kids and parents. Day one, no waiting period."
  },
  {
    icon: House,
    tone: "royal",
    title: "Remote-first, field-often",
    text: "Work from where you work best. Visit shops with the team every quarter."
  },
  {
    icon: GraduationCap,
    tone: "accent",
    title: "Learning budget every quarter",
    text: "Courses, books, conferences. Spend it on anything that makes you better."
  }
];

const hiring = [
  {
    step: "01",
    title: "Send a note",
    text: "Email us your CV or portfolio with the role in the subject line. A human reads every one."
  },
  {
    step: "02",
    title: "Intro call",
    text: "Thirty minutes with the hiring manager. We tell you about the work; you tell us what you want."
  },
  {
    step: "03",
    title: "Work sample",
    text: "A small, paid task that looks like the real job. No whiteboard puzzles."
  },
  {
    step: "04",
    title: "Offer within a week",
    text: "Meet two more people from the team, then a decision. Start when you are ready."
  }
];

export default function CareerPage() {
  return (
    <>
      <PageHero
        variant="dark"
        eyebrow="Careers"
        breadcrumbs={[{ label: "Careers", href: "/career" }]}
        title={
          <>
            Do the best work
            <br className="hidden md:block" /> of your career, for India.
          </>
        }
        description="We are a small team in Pune with people in the field across India. Engineers, designers, salespeople and compliance folks who have all stood behind a shop counter."
        stats={[
          { value: String(openings.length), label: "Open roles" },
          { value: "5", label: "Teams hiring" },
          { value: "28", label: "States we work in" },
          { value: "1 week", label: "Decision time" }
        ]}
        actions={
          <a href="#roles" className="rounded-2xl focus-energy">
            <Button size="lg" tabIndex={-1}>
              See open roles
              <ArrowRight size={16} weight="bold" aria-hidden />
            </Button>
          </a>
        }
      />

      {/* Culture statement — light, centered */}
      <Section className="bg-white">
        <Container>
          <Reveal className="mx-auto max-w-4xl text-center">
            <span className="inline-flex items-center gap-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-royal-700">
              <span className="brand-dot" aria-hidden /> How we work
            </span>
            <p className="mt-6 font-display text-3xl font-semibold leading-[1.06] tracking-[-0.02em] text-ink-950 md:text-5xl">
              Move fast, stay honest,{" "}
              <span className="gradient-text">put the shopkeeper first.</span>{" "}
              Everything else follows.
            </p>
          </Reveal>
          <div className="mx-auto mt-10 grid max-w-3xl gap-6 text-left text-base leading-relaxed text-ink-600 md:grid-cols-2 md:text-lg">
            <Reveal>
              <p>
                The people we build for run businesses with razor-thin margins
                and a queue forming at the counter. Every product decision
                starts with what that person needs right now.
              </p>
            </Reveal>
            <Reveal delay={0.08}>
              <p>
                Compact teams, clear ownership, no meetings that could be
                messages. You will see your code serving real shops within
                weeks of joining.
              </p>
            </Reveal>
          </div>
        </Container>
      </Section>

      {/* Perks — joined two-column panel */}
      <Section className="bg-ink-50/60">
        <Container>
          <SectionIntro
            eyebrow="What you get"
            title="Four things we take care of so you can do the work."
          />
          <Stagger className="grid gap-px overflow-hidden rounded-4xl border border-ink-100 bg-ink-100 md:grid-cols-2">
            {perks.map((p) => (
              <StaggerItem
                key={p.title}
                className="group flex items-start gap-5 bg-white p-7 transition hover:bg-ink-50/70 md:p-9"
              >
                <IconTile tone={p.tone} size="lg">
                  <p.icon size={24} weight="duotone" aria-hidden />
                </IconTile>
                <div>
                  <h3 className="font-display text-xl font-semibold tracking-[-0.02em] text-ink-950">
                    {p.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-600">{p.text}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </Container>
      </Section>

      {/* Open roles — grouped list */}
      <Section id="roles" className="scroll-mt-28 bg-white">
        <Container>
          <SectionIntro
            eyebrow="Open roles"
            title="Where we need you."
            description="We reply to every application within five working days."
            aside={
              <a href={`mailto:${company.email}?subject=Open%20application`} className="rounded-2xl focus-energy">
                <Button variant="outline" tabIndex={-1}>
                  <Envelope size={16} weight="duotone" aria-hidden />
                  Open application
                </Button>
              </a>
            }
          />
          <Stagger className="space-y-3">
            {openings.map((job, i) => {
              const mailto = `mailto:${company.email}?subject=${encodeURIComponent(
                `Application: ${job.title}`
              )}`;
              return (
                <StaggerItem key={job.title} distance={12}>
                  <a
                    href={mailto}
                    className="gradient-ring group flex flex-col gap-4 rounded-3xl border border-ink-100 bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-energy-sm focus-energy sm:flex-row sm:items-center sm:justify-between md:px-7"
                  >
                    <div className="flex items-start gap-5">
                      <span className="mt-1 hidden font-display text-sm font-bold tabular-nums text-royal-300 sm:block">
                        0{i + 1}
                      </span>
                      <div>
                        <p className="font-display text-lg font-semibold tracking-[-0.01em] text-ink-950 transition group-hover:text-royal-800">
                          {job.title}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <Badge variant="royal" size="sm">
                            {job.team}
                          </Badge>
                          <Badge size="sm">
                            <MapPin size={11} weight="duotone" aria-hidden />
                            {job.location}
                          </Badge>
                          <Badge
                            variant={job.type === "Internship" ? "accent" : "default"}
                            size="sm"
                          >
                            <Clock size={11} weight="duotone" aria-hidden />
                            {job.type}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <span className="inline-flex h-10 shrink-0 items-center gap-1.5 self-start rounded-full bg-ink-950 px-5 text-sm font-semibold text-white transition group-hover:bg-energy-gradient sm:self-auto">
                      Apply
                      <ArrowUpRight size={14} weight="bold" aria-hidden />
                    </span>
                  </a>
                </StaggerItem>
              );
            })}
          </Stagger>
        </Container>
      </Section>

      {/* How we hire — vertical steps + sticky note */}
      <Section className="grain relative overflow-hidden bg-ink-950 text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-40 bottom-0 h-[420px] w-[420px] rounded-full bg-accent-500/10 blur-3xl"
        />
        <Container className="relative z-10">
          <div className="grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <SectionIntro
                dark
                eyebrow="How we hire"
                title="Four steps. One week."
                className="mb-0 lg:sticky lg:top-32"
                description="No panel interviews, no take-homes that eat your weekend. A paid work sample and a fast, honest decision."
              />
            </div>
            <div className="lg:col-span-7">
              <ol className="space-y-4">
                {hiring.map((h) => (
                  <Reveal as="li" key={h.step} delay={Number(h.step) * 0.05}>
                    <div className="flex items-start gap-5 rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur transition hover:bg-white/[0.07]">
                      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-energy-gradient font-display text-sm font-semibold text-white shadow-energy-sm">
                        {h.step}
                      </span>
                      <div>
                        <h3 className="font-display text-lg font-semibold tracking-[-0.01em]">
                          {h.title}
                        </h3>
                        <p className="mt-1.5 text-sm leading-relaxed text-white/60">{h.text}</p>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </ol>
              <Reveal className="mt-6">
                <div className="flex flex-col items-start gap-4 rounded-3xl border border-dashed border-white/15 p-6 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-display text-lg font-semibold tracking-[-0.01em]">
                      Don&rsquo;t see your role?
                    </p>
                    <p className="mt-1 text-sm text-white/60">
                      Tell us what you would build for a shopkeeper. We make room for good people.
                    </p>
                  </div>
                  <a
                    href={`mailto:${company.email}?subject=Open%20application`}
                    className="shrink-0 rounded-2xl focus-energy"
                  >
                    <Button tabIndex={-1}>
                      Write to us
                      <ArrowRight size={16} weight="bold" aria-hidden />
                    </Button>
                  </a>
                </div>
              </Reveal>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
