import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Coins } from "@phosphor-icons/react/dist/ssr";
import { Container, Section } from "@/components/ui/Container";
import { PageHero } from "@/components/PageHero";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { IconTile, type IconTone } from "@/components/ui/Icon";
import { Reveal, Stagger, StaggerItem } from "@/components/motion";
import { services, type ServiceItem } from "@/lib/data";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Cash withdrawal, money transfer, UPI, recharges, 1,200+ billers and travel. Every service your customers walk in for, from one TRANSPE counter."
};

type Category = ServiceItem["category"];

const categoryMeta: {
  id: Category;
  label: string;
  hint: string;
  tone: IconTone;
  blurb: string;
  commission: string;
}[] = [
  {
    id: "banking",
    label: "Banking",
    hint: "Cash, transfers, payments",
    tone: "brand",
    blurb:
      "The services that make your shop a bank counter. Cash on a fingerprint, money sent home in seconds, payments accepted every way a customer can pay.",
    commission: "Earn up to ₹6 per AePS withdrawal · 0.40% on money transfer"
  },
  {
    id: "recharge",
    label: "Top-ups",
    hint: "Mobile, DTH, broadband",
    tone: "accent",
    blurb:
      "Prepaid recharges for every operator. Instant confirmation, cashback on select plans, and a reason for customers to come back every month.",
    commission: "Earn 0.5% – 3% per recharge, credited instantly"
  },
  {
    id: "bills",
    label: "Bills",
    hint: "1,200+ billers on BBPS",
    tone: "coral",
    blurb:
      "Electricity, water, gas, credit cards, school fees, insurance. One BBPS connection, 1,200+ billers, receipts the customer can trust.",
    commission: "Earn ₹2 – ₹15 per bill · ₹0 convenience fee on most billers"
  },
  {
    id: "travel",
    label: "Travel",
    hint: "Flights, buses, hotels",
    tone: "royal",
    blurb:
      "Book flights, buses and hotels at agent rates. Higher ticket sizes, higher margins, and customers who stop going to the travel agent down the road.",
    commission: "Earn 0.5% – 4% per booking by route"
  }
];

const heroStats = [
  { value: "60+", label: "Services live" },
  { value: "1,200+", label: "BBPS billers" },
  { value: "T+0", label: "AePS settlement" },
  { value: "24x7", label: "Money transfer" }
];

export default function ServicesPage() {
  const grouped = categoryMeta.map((c) => ({
    ...c,
    items: services.filter((s) => s.category === c.id)
  }));

  return (
    <>
      <PageHero
        variant="dark"
        eyebrow="Services"
        breadcrumbs={[{ label: "Services", href: "/services" }]}
        title={
          <>
            Everything a customer
            <br className="hidden md:block" /> walks in for.
          </>
        }
        description="Banking, top-ups, bills and travel from one login and one wallet. Every service shows the fee and your commission before you confirm."
        stats={heroStats}
        actions={
          <>
            <Link href="/register" className="rounded-2xl focus-energy">
              <Button size="lg" tabIndex={-1}>
                Start earning
                <ArrowRight size={16} weight="bold" aria-hidden />
              </Button>
            </Link>
            <Link href="/legal/charges" className="rounded-2xl focus-energy">
              <Button
                size="lg"
                variant="outline"
                tabIndex={-1}
                className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              >
                See all charges
              </Button>
            </Link>
          </>
        }
      />

      {/* Category jump strip */}
      <div className="sticky top-[70px] z-30 border-b border-ink-100 bg-white/85 backdrop-blur-lg">
        <Container className="scrollbar-none flex items-center gap-1 overflow-x-auto py-2.5">
          {grouped.map((c, i) => (
            <a
              key={c.id}
              href={`#${c.id}`}
              className="whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-semibold text-ink-600 transition hover:bg-ink-50 hover:text-ink-950 focus-energy"
            >
              <span className="mr-1.5 text-ink-300">0{i + 1}</span>
              {c.label}
              <span className="ml-1.5 text-ink-400">({c.items.length})</span>
            </a>
          ))}
        </Container>
      </div>

      {/* Category ledgers */}
      <Section className="bg-white">
        <Container className="space-y-20 md:space-y-28">
          {grouped.map((cat, idx) => (
            <section
              key={cat.id}
              id={cat.id}
              aria-labelledby={`${cat.id}-heading`}
              className="scroll-mt-40"
            >
              <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
                {/* Sticky summary panel */}
                <Reveal className="lg:col-span-4">
                  <div
                    className={cn(
                      "rounded-4xl p-8 lg:sticky lg:top-36",
                      toneSurface[cat.tone]
                    )}
                  >
                    <span className="font-display text-xs font-bold tracking-[0.22em] opacity-60">
                      0{idx + 1} · {cat.items.length} SERVICES
                    </span>
                    <h2
                      id={`${cat.id}-heading`}
                      className="mt-4 font-display text-3xl font-semibold leading-[1.05] tracking-[-0.02em] md:text-4xl"
                    >
                      {cat.label}
                    </h2>
                    <p className="mt-1 text-sm font-medium opacity-70">{cat.hint}</p>
                    <p className="mt-5 text-sm leading-relaxed opacity-80">{cat.blurb}</p>
                    <p className="mt-6 flex items-start gap-2 rounded-2xl bg-white/60 px-4 py-3 text-sm font-semibold">
                      <Coins size={17} weight="duotone" aria-hidden className="mt-0.5 shrink-0" />
                      {cat.commission}
                    </p>
                  </div>
                </Reveal>

                {/* Service rows */}
                <Stagger className="divide-y divide-ink-100 overflow-hidden rounded-3xl border border-ink-100 lg:col-span-8">
                  {cat.items.map((s) => (
                    <StaggerItem key={s.slug} id={s.slug} className="scroll-mt-40">
                      <ServiceRow service={s} tone={cat.tone} commission={cat.commission} />
                    </StaggerItem>
                  ))}
                </Stagger>
              </div>
            </section>
          ))}
        </Container>
      </Section>

      {/* Closing band */}
      <Section className="bg-ink-50/60">
        <Container>
          <Reveal>
            <div className="grain relative overflow-hidden rounded-5xl bg-energy-gradient p-8 text-white md:p-12">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-20 [background:radial-gradient(60%_80%_at_50%_0%,rgba(255,255,255,0.5),transparent_70%)]"
              />
              <div className="relative z-10 flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
                <div className="max-w-2xl">
                  <p className="font-display text-3xl font-semibold leading-[1.05] tracking-[-0.02em] md:text-5xl">
                    Every service. One wallet. Commission on each.
                  </p>
                  <p className="mt-3 text-sm text-white/75 md:text-base">
                    Open your counter today. No joining fee, KYC in under five minutes.
                  </p>
                </div>
                <Link href="/register" className="shrink-0 rounded-2xl focus-energy">
                  <Button
                    size="xl"
                    tabIndex={-1}
                    className="bg-white from-white to-white text-ink-950 hover:shadow-glow"
                  >
                    Start earning
                    <ArrowRight size={18} weight="bold" aria-hidden />
                  </Button>
                </Link>
              </div>
            </div>
          </Reveal>
        </Container>
      </Section>
    </>
  );
}

/** Per-service commission hints shown on rows. Falls back to the first
 *  clause of the category commission line for services not listed here. */
const serviceHints: Record<string, string> = {
  "payment-gateway": "0% MDR on UPI · T+1 settlement",
  pos: "Low MDR on cards · monthly rental, no buying",
  "qr-payments": "₹0 on UPI collections · instant alerts",
  "aadhaar-pay": "Earn up to ₹6 per AePS withdrawal",
  "money-transfer": "Earn 0.40% on every transfer",
  upi: "₹0 up to ₹2,000 · 0.10% above",
  wallet: "Instant top-ups · zero holding fee",
  "virtual-account": "Auto-credit to wallet · ₹0 setup",
  "credit-card": "Earn ₹2 – ₹15 per bill",
  "mobile-recharge": "Earn 0.5% – 3% per recharge",
  dth: "Earn up to 3.5% per recharge",
  broadband: "Earn on every renewal, monthly repeat",
  electricity: "Earn on every bill · 84+ boards",
  water: "Earn ₹2 – ₹15 per bill",
  gas: "Earn on every cylinder & gas bill",
  education: "Earn on every fee collection",
  insurance: "Earn on every premium paid",
  "broadband-bill": "Earn ₹2 – ₹15 per bill",
  flight: "Earn 0.5% – 4% per ticket",
  hotel: "Agent rates on 50,000+ hotels",
  bus: "Earn up to 5% per seat"
};

const toneSurface: Record<IconTone, string> = {
  brand: "bg-brand-50 text-brand-900 ring-1 ring-inset ring-brand-100",
  accent: "bg-accent-50 text-accent-900 ring-1 ring-inset ring-accent-100",
  royal: "bg-royal-50 text-royal-900 ring-1 ring-inset ring-royal-100",
  coral: "bg-coral-50 text-coral-900 ring-1 ring-inset ring-coral-100",
  amber: "bg-amber-50 text-amber-900 ring-1 ring-inset ring-amber-100",
  ink: "bg-ink-100 text-ink-900 ring-1 ring-inset ring-ink-200",
  energy: "bg-energy-gradient text-white"
};

function ServiceRow({
  service,
  tone,
  commission
}: {
  service: ServiceItem;
  tone: IconTone;
  commission: string;
}) {
  const Icon = service.icon;
  const hint = serviceHints[service.slug] ?? commission.split("·")[0].trim();

  return (
    <Link
      href={service.href}
      className="group grid grid-cols-[auto_1fr_auto] items-center gap-4 bg-white px-5 py-5 transition hover:bg-ink-50/60 focus-energy md:px-7"
    >
      <IconTile tone={tone} size="lg">
        <Icon className="h-6 w-6" strokeWidth={1.75} aria-hidden />
      </IconTile>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-display text-base font-semibold tracking-[-0.01em] text-ink-950 md:text-lg">
            {service.title}
          </h3>
          {service.badge && (
            <Badge variant="energy" size="sm" dot>
              {service.badge}
            </Badge>
          )}
        </div>
        <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-ink-500">
          {service.description}
        </p>
        <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-accent-700">
          <Coins size={13} weight="duotone" aria-hidden />
          {hint}
        </p>
      </div>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-ink-200 text-ink-400 transition group-hover:border-transparent group-hover:bg-energy-gradient group-hover:text-white">
        <ArrowUpRight size={16} weight="bold" aria-hidden />
      </span>
    </Link>
  );
}
