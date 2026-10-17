import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check } from "@phosphor-icons/react/dist/ssr";
import { Container, Section } from "@/components/ui/Container";
import { PageHero } from "@/components/PageHero";
import { SectionIntro } from "@/components/marketing/SectionIntro";
import { ProductMock, type ProductMockVariant } from "@/components/marketing/ProductMock";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Reveal } from "@/components/motion";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Platform",
  description:
    "Payment Gateway, POS terminals, QR Collect and Virtual Accounts. Accept every payment your customer wants to make, settled to your bank."
};

type Product = {
  id: ProductMockVariant;
  index: string;
  name: string;
  headline: string;
  text: string;
  specs: string[];
  href: string;
  cta: string;
  badge?: string;
};

const products: Product[] = [
  {
    id: "pg",
    index: "01",
    name: "Payment Gateway",
    headline: "Take payments online without writing a line of code.",
    text: "Send a payment link on WhatsApp or drop a checkout on your website. UPI, cards, net banking and wallets, with tracking you can read at a glance.",
    specs: [
      "0% MDR on UPI · cards from 0.95%",
      "T+1 settlement to any bank account",
      "Payment links, hosted checkout and APIs"
    ],
    href: "/dashboard/pg",
    cta: "Open Payment Gateway",
    badge: "New"
  },
  {
    id: "pos",
    index: "02",
    name: "POS Terminals",
    headline: "A card machine that pays for itself in a week.",
    text: "Android terminals on monthly rental. Card, UPI, BharatQR and tap-to-pay on one device, with every sale in your TRANSPE wallet by next morning.",
    specs: [
      "Rental from ₹499 a month, no deposit",
      "Cards, UPI, BharatQR and Tap & Pay",
      "Replacement within 48 hours if it fails"
    ],
    href: "/dashboard/pos",
    cta: "Order a terminal"
  },
  {
    id: "qr",
    index: "03",
    name: "QR Collect",
    headline: "Your own QR. Your own name on every receipt.",
    text: "Static QR for the counter, dynamic QR for a specific bill. The customer scans, you hear the alert, the money is yours the same day.",
    specs: [
      "0% MDR · ₹0 setup",
      "Voice alerts and instant settlement reports",
      "Unlimited static and dynamic codes"
    ],
    href: "/dashboard/qr",
    cta: "Create your QR",
    badge: "New"
  },
  {
    id: "va",
    index: "04",
    name: "Virtual Account",
    headline: "A bank account number that fills your wallet by itself.",
    text: "Share one account number and IFSC with distributors and customers. Every IMPS, NEFT or UPI credit lands in your wallet, named and reconciled.",
    specs: [
      "Unique account number + IFSC in minutes",
      "Instant credit to your TRANSPE wallet",
      "Zero charge on incoming transfers"
    ],
    href: "/dashboard/virtual-account",
    cta: "Open a Virtual Account",
    badge: "New"
  }
];

const comparison: { label: string; values: string[] }[] = [
  { label: "Settlement", values: ["T+1", "T+1", "Same day", "Instant"] },
  {
    label: "MDR",
    values: ["UPI 0% · Cards from 0.95%", "UPI 0% · Cards from 1.10%", "0%", "₹0 per credit"]
  },
  { label: "Setup fee", values: ["₹0", "₹499 / month rental", "₹0", "₹0"] },
  {
    label: "Best for",
    values: [
      "Online orders & payment links",
      "Counter sales with cards",
      "Any shop counter",
      "Collecting from distributors"
    ]
  }
];

export default function ProductsPage() {
  return (
    <>
      <PageHero
        variant="dark"
        eyebrow="Platform"
        breadcrumbs={[{ label: "Platform", href: "/products" }]}
        title={
          <>
            Every way to get paid.
            <br className="hidden md:block" /> One wallet to collect it.
          </>
        }
        description="Four acceptance products, one TRANSPE wallet. Pick what fits your counter today; switch the rest on from the dashboard when you grow."
        stats={[
          { value: "4", label: "Ways to get paid" },
          { value: "0%", label: "MDR on UPI" },
          { value: "T+1", label: "Settlement" },
          { value: "₹0", label: "Setup fee" }
        ]}
        actions={
          <>
            <Link href="/register" className="rounded-2xl focus-energy">
              <Button size="lg" tabIndex={-1}>
                Start earning
                <ArrowRight size={16} weight="bold" aria-hidden />
              </Button>
            </Link>
            <a href="#compare" className="rounded-2xl focus-energy">
              <Button
                size="lg"
                variant="outline"
                tabIndex={-1}
                className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              >
                Compare products
              </Button>
            </a>
          </>
        }
      />

      {/* Quick-jump rail */}
      <div className="sticky top-[70px] z-30 border-b border-ink-100 bg-white/85 backdrop-blur-lg">
        <Container className="scrollbar-none flex items-center gap-1 overflow-x-auto py-2.5">
          {products.map((p) => (
            <a
              key={p.id}
              href={`#${p.id}`}
              className="whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-semibold text-ink-600 transition hover:bg-ink-50 hover:text-ink-950 focus-energy"
            >
              <span className="mr-1.5 text-ink-300">{p.index}</span>
              {p.name}
            </a>
          ))}
          <a
            href="#compare"
            className="ml-auto hidden whitespace-nowrap rounded-full bg-ink-950 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-ink-800 focus-energy sm:block"
          >
            Compare all
          </a>
        </Container>
      </div>

      {/* Product slabs */}
      <Section className="bg-ink-50/60">
        <Container className="space-y-10">
          {products.map((p, i) => {
            const dark = i % 2 === 1;
            return (
              <Reveal key={p.id} amount={0.15}>
                <article
                  id={p.id}
                  className={cn(
                    "relative scroll-mt-36 overflow-hidden rounded-5xl p-8 md:p-12",
                    dark
                      ? "grain bg-ink-950 text-white"
                      : "border border-ink-100 bg-white shadow-soft"
                  )}
                >
                  {/* Watermark numeral */}
                  <span
                    aria-hidden
                    className={cn(
                      "pointer-events-none absolute -top-10 right-4 select-none font-display text-[12rem] font-bold leading-none tracking-tighter md:text-[16rem]",
                      dark ? "text-white/[0.04]" : "text-ink-950/[0.04]"
                    )}
                  >
                    {p.index}
                  </span>

                  <div className="relative z-10 grid items-center gap-10 lg:grid-cols-12 lg:gap-14">
                    <div className="lg:col-span-5">
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            "text-xs font-semibold uppercase tracking-[0.18em]",
                            dark ? "text-accent-300" : "text-royal-700"
                          )}
                        >
                          {p.name}
                        </span>
                        {p.badge && (
                          <Badge variant="energy" size="sm" dot>
                            {p.badge}
                          </Badge>
                        )}
                      </div>
                      <h2
                        className={cn(
                          "mt-4 font-display text-3xl font-semibold leading-[1.05] tracking-[-0.02em] md:text-4xl",
                          dark ? "text-white" : "text-ink-950"
                        )}
                      >
                        {p.headline}
                      </h2>
                      <p
                        className={cn(
                          "mt-4 text-base leading-relaxed",
                          dark ? "text-white/65" : "text-ink-600"
                        )}
                      >
                        {p.text}
                      </p>
                      <ul className="mt-6 space-y-2.5">
                        {p.specs.map((s) => (
                          <li
                            key={s}
                            className={cn(
                              "flex items-start gap-3 text-sm",
                              dark ? "text-white/80" : "text-ink-800"
                            )}
                          >
                            <span
                              className={cn(
                                "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full",
                                dark
                                  ? "bg-accent-400/15 text-accent-300"
                                  : "bg-accent-50 text-accent-700 ring-1 ring-inset ring-accent-100"
                              )}
                            >
                              <Check size={12} weight="bold" aria-hidden />
                            </span>
                            {s}
                          </li>
                        ))}
                      </ul>
                      <div className="mt-8 flex flex-wrap gap-3">
                        <Link href={p.href} className="rounded-2xl focus-energy">
                          <Button tabIndex={-1}>
                            {p.cta}
                            <ArrowUpRight size={16} weight="bold" aria-hidden />
                          </Button>
                        </Link>
                        <Link href="/contact" className="rounded-2xl focus-energy">
                          <Button
                            variant="ghost"
                            tabIndex={-1}
                            className={cn(dark && "text-white/80 hover:bg-white/10 hover:text-white")}
                          >
                            Talk to sales
                          </Button>
                        </Link>
                      </div>
                    </div>

                    <div className="lg:col-span-7">
                      <ProductMock variant={p.id} />
                    </div>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </Container>
      </Section>

      {/* Comparison */}
      <Section id="compare" className="scroll-mt-28 bg-white">
        <Container>
          <SectionIntro
            eyebrow="Compare"
            title="Pick the one that fits your counter."
            description="All four pay into the same TRANSPE wallet. Start with one, add the rest from the dashboard."
          />
          <Reveal>
            <div className="overflow-hidden rounded-3xl border border-ink-100 shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                  <caption className="sr-only">Comparison of TRANSPE payment products</caption>
                  <thead>
                    <tr className="border-b-2 border-ink-950">
                      <th
                        scope="col"
                        className="bg-white px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-400"
                      >
                        &nbsp;
                      </th>
                      {products.map((p) => (
                        <th
                          key={p.id}
                          scope="col"
                          className="bg-white px-5 py-4 font-display text-base font-semibold tracking-[-0.01em] text-ink-950"
                        >
                          <span className="mr-2 text-xs font-bold text-royal-400">{p.index}</span>
                          {p.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100">
                    {comparison.map((row) => (
                      <tr key={row.label} className="transition hover:bg-ink-50/60">
                        <th
                          scope="row"
                          className="px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-500"
                        >
                          {row.label}
                        </th>
                        {row.values.map((v, i) => (
                          <td key={`${row.label}-${i}`} className="px-5 py-4 align-top text-ink-800">
                            {v}
                          </td>
                        ))}
                      </tr>
                    ))}
                    <tr>
                      <td className="px-5 py-4" />
                      {products.map((p) => (
                        <td key={`cta-${p.id}`} className="px-5 py-4">
                          <Link
                            href={p.href}
                            className="inline-flex items-center gap-1 text-sm font-semibold text-royal-700 hover:text-royal-900 focus-energy"
                          >
                            Open <ArrowUpRight size={14} weight="bold" aria-hidden />
                          </Link>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </Reveal>
        </Container>
      </Section>
    </>
  );
}
