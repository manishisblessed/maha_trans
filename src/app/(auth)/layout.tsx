import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle,
  Fingerprint,
  Lifebuoy,
  PaperPlaneTilt,
  QrCode,
  Receipt,
  ShieldCheck
} from "@phosphor-icons/react/dist/ssr";
import { Logo } from "@/components/layout/Logo";
import { heroStats, company, services } from "@/lib/data";
import { RotatingQuote } from "@/components/auth/RotatingQuote";

const COMPLIANCE_CHIPS = [
  "Authorised partner banks",
  "NPCI certified",
  "PCI-DSS v4.0",
  "ISO 27001:2022"
];

/** Static preview rows for the brand-panel console card. */
const CONSOLE_ROWS = [
  { icon: Fingerprint, label: "AePS withdrawal", amount: "₹2,500", fee: "+₹6.00" },
  { icon: PaperPlaneTilt, label: "Money transfer", amount: "₹10,000", fee: "+₹8.00" },
  { icon: QrCode, label: "UPI collect", amount: "₹1,250", fee: "+₹2.50" },
  { icon: Receipt, label: "Electricity bill", amount: "₹1,840", fee: "+₹14.70" }
];

/**
 * Auth shell — split screen, forms first.
 *
 * Left: light canvas with a slim top bar and the centered form area.
 * Right (≥ lg): the "counter in motion" brand panel — deep navy base with an
 * energy-gradient wash, a frozen console card, rotating retailer quote and
 * the compliance row. Server component; the only client piece is the quote.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const stats = heroStats.slice(0, 3);
  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-[#f6f7fb] lg:grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      {/* ── Form canvas (first in DOM and on screen) ────────────────── */}
      <div className="flex min-h-screen flex-col">
        {/* Compact brand strip (< lg) */}
        <div className="grain relative overflow-hidden bg-ink-950 text-white lg:hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-28 h-60 w-60 rounded-full bg-energy-gradient opacity-40 blur-3xl"
          />
          <div className="relative z-10 flex items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
            <Logo variant="light" size="sm" />
            <p className="hidden text-xs font-semibold text-white/70 sm:flex sm:items-center sm:gap-1.5">
              <CheckCircle size={14} weight="fill" className="text-accent-400" aria-hidden />
              60+ services · one counter
            </p>
          </div>
        </div>

        <header className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-10">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="focus-energy group inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium text-ink-600 transition hover:bg-white hover:text-ink-900 hover:shadow-soft"
            >
              <ArrowLeft
                size={16}
                weight="bold"
                className="transition-transform group-hover:-translate-x-0.5"
                aria-hidden
              />
              Back to home
            </Link>
            <span className="hidden lg:block">
              <Logo size="sm" className="ml-2" />
            </span>
          </div>
          <Link
            href="/contact"
            className="focus-energy inline-flex items-center gap-1.5 rounded-2xl px-3 py-2 text-xs font-semibold text-ink-500 transition hover:bg-white hover:text-ink-900"
          >
            <Lifebuoy size={15} weight="duotone" aria-hidden />
            Need help?
          </Link>
        </header>

        <main className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
          {children}
        </main>

        <footer className="px-4 py-5 text-center text-xs text-ink-400 sm:px-6 lg:px-10">
          <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
            <span>
              © {year} {company.brand} · {company.jurisdiction}
            </span>
            <span aria-hidden>·</span>
            <Link href="/legal/privacy" className="hover:text-ink-700">
              Privacy
            </Link>
            <span aria-hidden>·</span>
            <Link href="/legal/terms" className="hover:text-ink-700">
              Terms
            </Link>
          </p>
        </footer>
      </div>

      {/* ── Brand panel (≥ lg) ─────────────────────────────────────── */}
      <aside className="grain relative hidden overflow-hidden bg-ink-950 text-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:self-start">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -right-32 -top-40 h-[32rem] w-[32rem] rounded-full bg-energy-gradient opacity-25 blur-3xl" />
          <div className="absolute -bottom-48 -left-32 h-[28rem] w-[28rem] rounded-full bg-accent-500/20 blur-3xl" />
          <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-ink-950 to-transparent" />
        </div>

        <div className="relative z-10 flex h-full flex-col justify-between p-10 xl:p-12">
          <div className="flex items-center justify-between gap-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/45">
              The counter console
            </p>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/[0.06] px-3 py-1 text-xs font-semibold text-white/70 ring-1 ring-inset ring-white/10">
              <span className="brand-dot" aria-hidden />
              Welcome back
            </span>
          </div>

          {/* Frozen console preview */}
          <div className="py-8">
            <div className="overflow-hidden rounded-3xl border border-white/10 bg-ink-900/70 shadow-energy backdrop-blur">
              <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
                    Counter wallet
                  </p>
                  <p className="mt-0.5 font-display text-2xl font-semibold tracking-[-0.02em]">
                    ₹24,860
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-accent-400/30 bg-accent-400/10 px-2.5 py-1 text-[10px] font-semibold text-accent-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent-400" aria-hidden />
                  Live
                </span>
              </div>
              <ul className="space-y-1 px-3 py-3">
                {CONSOLE_ROWS.map((r) => {
                  const RIcon = r.icon;
                  return (
                    <li
                      key={r.label}
                      className="flex items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.04] px-3 py-2.5"
                    >
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/[0.07] text-accent-300">
                        <RIcon size={15} weight="duotone" aria-hidden />
                      </span>
                      <span className="flex-1 truncate text-xs font-semibold text-white">
                        {r.label}
                      </span>
                      <span className="text-right">
                        <span className="block text-xs font-semibold tabular-nums">{r.amount}</span>
                        <span className="block text-[10px] font-semibold tabular-nums text-accent-300">
                          {r.fee}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>

            <RotatingQuote className="mt-8 max-w-md" />
          </div>

          <div>
            <dl className="grid grid-cols-3 gap-6 border-t border-white/10 pt-7">
              {stats.map((s) => (
                <div key={s.label} className="flex flex-col-reverse">
                  <dt className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-white/45">
                    {s.label}
                  </dt>
                  <dd className="font-display text-2xl font-semibold tracking-[-0.02em] text-white xl:text-3xl">
                    {s.value}
                  </dd>
                </div>
              ))}
            </dl>
            <ul className="mt-7 flex flex-wrap gap-2" aria-label="Compliance">
              {COMPLIANCE_CHIPS.map((c) => (
                <li
                  key={c}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1 text-[11px] font-semibold text-white/70 ring-1 ring-inset ring-white/10"
                >
                  <ShieldCheck size={13} weight="duotone" className="text-accent-400" aria-hidden />
                  {c}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Service marquee along the bottom edge */}
        <div className="relative z-10 border-t border-white/[0.07] py-3">
          <div className="mask-fade-x overflow-hidden">
            <div className="flex w-max animate-marquee gap-7 pr-7 [animation-duration:45s]">
              {[...services.slice(0, 12), ...services.slice(0, 12)].map((s, i) => (
                <span
                  key={`${s.slug}-${i}`}
                  className="inline-flex items-center gap-2 whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35"
                >
                  <span className="h-1 w-1 rounded-full bg-accent-400" aria-hidden />
                  {s.title}
                </span>
              ))}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
