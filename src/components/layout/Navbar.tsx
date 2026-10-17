"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Airplane,
  ArrowRight,
  ArrowUpRight,
  CaretDown,
  Fingerprint,
  Headset,
  List,
  PaperPlaneTilt,
  Phone,
  QrCode,
  Receipt,
  SealCheck,
  SquaresFour,
  X,
  type Icon as PhosphorIcon
} from "@phosphor-icons/react";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/Button";
import { IconTile, type IconTone } from "@/components/ui/Icon";
import { company, mainNav, type NavLink } from "@/lib/data";
import { cn } from "@/lib/utils";

const easeOut = [0.22, 1, 0.36, 1] as const;

/** Routes whose first section is dark & full-bleed. Pages can also opt in by
 *  emitting `data-nav-theme="dark"` on their first section. */
const DARK_ROUTES = new Set(["/"]);

/** Mega-menu metadata for the "Services" children (keyed by href). */
const serviceMeta: Record<
  string,
  { icon: PhosphorIcon; tone: IconTone; desc: string }
> = {
  "/services#aadhaar-pay": {
    icon: Fingerprint,
    tone: "brand",
    desc: "Cash out, balance check and mini statement on a fingerprint."
  },
  "/services#money-transfer": {
    icon: PaperPlaneTilt,
    tone: "accent",
    desc: "Send money to any bank account, 24x7, settled in seconds."
  },
  "/services#upi": {
    icon: QrCode,
    tone: "royal",
    desc: "Collect on UPI and pay from your wallet without a POS."
  },
  "/services#bills": {
    icon: Receipt,
    tone: "coral",
    desc: "Recharges plus 1,200+ billers on BBPS, with commission on each."
  },
  "/services#travel": {
    icon: Airplane,
    tone: "amber",
    desc: "Flights, buses and hotels at agent rates from your counter."
  }
};

function useIsActive(pathname: string) {
  return React.useCallback(
    (href: string) =>
      pathname === href || (href !== "/" && !href.startsWith("/#") && pathname.startsWith(href)),
    [pathname]
  );
}

/**
 * TRANSPE public navigation — an anchored, full-width two-deck header:
 *
 *  · Deck 1: utility strip (support line + compliance note). Collapses away
 *    the moment you scroll.
 *  · Deck 2: main bar — logo left, tabs centre, CTAs right. Transparent over
 *    dark heroes, frosted white once scrolled. Active tab is marked by a
 *    gradient underline that glides between links.
 *  · "Services" opens a full-width mega panel, not a floating card.
 *  · Mobile: right-hand slide-in drawer.
 */
export function Navbar() {
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const isActive = useIsActive(pathname);

  const [scrolled, setScrolled] = React.useState(false);
  const [darkHero, setDarkHero] = React.useState(DARK_ROUTES.has(pathname));
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [megaOpen, setMegaOpen] = React.useState(false);
  const [hovered, setHovered] = React.useState<string | null>(null);

  const closeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const headerRef = React.useRef<HTMLElement>(null);

  /* Scroll state */
  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* Detect whether the page under the (transparent) bar is dark. The page
     transition mounts the new page late, so probe a few times. */
  React.useEffect(() => {
    let cancelled = false;
    const probe = () => {
      if (cancelled) return;
      const el = document.querySelector('[data-nav-theme="dark"]');
      setDarkHero(Boolean(el) || DARK_ROUTES.has(pathname));
    };
    probe();
    const timers = [120, 450, 900].map((ms) => setTimeout(probe, ms));
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [pathname]);

  /* Close everything on route change */
  React.useEffect(() => {
    setMobileOpen(false);
    setMegaOpen(false);
    setHovered(null);
  }, [pathname]);

  /* Escape closes overlays; lock body scroll while the drawer is open */
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileOpen(false);
        setMegaOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  React.useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  /* Close the mega-menu when focus leaves the header */
  React.useEffect(() => {
    if (!megaOpen) return;
    const onFocus = (e: FocusEvent) => {
      if (
        headerRef.current &&
        e.target instanceof Node &&
        !headerRef.current.contains(e.target)
      ) {
        setMegaOpen(false);
      }
    };
    document.addEventListener("focusin", onFocus);
    return () => document.removeEventListener("focusin", onFocus);
  }, [megaOpen]);

  const openMega = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setMegaOpen(true);
  };
  const scheduleCloseMega = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setMegaOpen(false), 140);
  };

  const solid = scrolled || megaOpen;
  const onDark = darkHero && !solid;
  const servicesItem = mainNav.find((i) => i.children);

  return (
    <>
      <header
        ref={headerRef}
        className="fixed inset-x-0 top-0 z-50"
        onMouseLeave={() => {
          setHovered(null);
          scheduleCloseMega();
        }}
      >
        {/* ── Deck 1 · utility strip ── */}
        <AnimatePresence initial={false}>
          {!scrolled && (
            <motion.div
              initial={reduce ? false : { height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={reduce ? undefined : { height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: easeOut }}
              className={cn(
                "hidden overflow-hidden text-[11px] font-medium lg:block",
                onDark
                  ? "border-b border-white/[0.08] text-white/55"
                  : "border-b border-ink-100 bg-ink-950 text-white/60"
              )}
            >
              <div className="container-x flex h-8 items-center justify-between">
                <p className="inline-flex items-center gap-1.5">
                  <SealCheck size={12} weight="duotone" className="text-accent-400" aria-hidden />
                  Regulated partner rails · T+1 settlement · 99.98% uptime
                </p>
                <div className="flex items-center gap-5">
                  <a
                    href={`tel:+91${company.phone}`}
                    className="inline-flex items-center gap-1.5 transition hover:text-white"
                  >
                    <Phone size={12} weight="duotone" aria-hidden />
                    +91 {company.phone}
                  </a>
                  <span className="inline-flex items-center gap-1.5">
                    <Headset size={12} weight="duotone" aria-hidden />
                    Mon–Sat · 10 AM–6 PM IST
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Deck 2 · main bar ── */}
        <motion.div
          initial={false}
          animate={{
            backgroundColor: solid ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0)",
            boxShadow: solid
              ? "0 1px 0 0 rgba(15,23,42,0.07), 0 12px 32px -20px rgba(15,23,42,0.25)"
              : "0 0 0 0 rgba(15,23,42,0)",
            backdropFilter: solid ? "saturate(180%) blur(16px)" : "blur(0px)"
          }}
          transition={{ duration: reduce ? 0 : 0.3, ease: easeOut }}
          style={{
            WebkitBackdropFilter: solid ? "saturate(180%) blur(16px)" : undefined
          }}
        >
          <div className="container-x flex h-[70px] items-center justify-between gap-6">
            <Logo size="md" variant={onDark ? "light" : "dark"} className="shrink-0" />

            {/* Centre tabs (lg+) */}
            <nav aria-label="Primary" className="hidden lg:block">
              <ul className="flex items-center gap-1">
                {mainNav.map((item) => {
                  const active = isActive(item.href);
                  const marked = hovered ? hovered === item.label : active;
                  const hasChildren = Boolean(item.children);
                  return (
                    <li
                      key={item.label}
                      className="relative"
                      onMouseEnter={() => {
                        setHovered(item.label);
                        if (hasChildren) openMega();
                        else scheduleCloseMega();
                      }}
                    >
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        aria-haspopup={hasChildren ? "menu" : undefined}
                        aria-expanded={hasChildren ? megaOpen : undefined}
                        aria-controls={hasChildren ? "services-mega-menu" : undefined}
                        onFocus={() => {
                          setHovered(item.label);
                          if (hasChildren) openMega();
                        }}
                        onKeyDown={(e) => {
                          if (hasChildren && e.key === "ArrowDown") {
                            e.preventDefault();
                            openMega();
                            requestAnimationFrame(() => {
                              document
                                .querySelector<HTMLAnchorElement>("#services-mega-menu a")
                                ?.focus();
                            });
                          }
                        }}
                        className={cn(
                          "relative inline-flex h-[70px] items-center gap-1 whitespace-nowrap px-3.5 text-sm font-semibold transition-colors focus-energy",
                          onDark
                            ? marked
                              ? "text-white"
                              : "text-white/70 hover:text-white"
                            : marked
                              ? "text-ink-950"
                              : "text-ink-600 hover:text-ink-950"
                        )}
                      >
                        {item.label}
                        {hasChildren && (
                          <CaretDown
                            size={11}
                            weight="bold"
                            aria-hidden
                            className={cn(
                              "transition-transform duration-300",
                              megaOpen && "rotate-180"
                            )}
                          />
                        )}
                        {marked && (
                          <motion.span
                            layoutId="nav-underline"
                            aria-hidden
                            className={cn(
                              "absolute inset-x-3 bottom-0 h-[3px] rounded-t-full",
                              onDark ? "bg-accent-400" : "bg-energy-gradient-x"
                            )}
                            transition={{ type: "spring", stiffness: 480, damping: 40 }}
                          />
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* Right CTAs (lg+) */}
            <div className="hidden items-center gap-2 lg:flex">
              <Link href="/login" className="rounded-2xl focus-energy">
                <Button
                  variant="ghost"
                  size="sm"
                  tabIndex={-1}
                  className={cn(
                    onDark && "text-white/85 hover:bg-white/10 hover:text-white"
                  )}
                >
                  Partner login
                </Button>
              </Link>
              <Link href="/register" className="rounded-2xl focus-energy">
                <Button size="sm" tabIndex={-1} className="px-5">
                  Open your counter
                  <ArrowRight size={14} weight="bold" aria-hidden />
                </Button>
              </Link>
            </div>

            {/* Hamburger (mobile) */}
            <button
              type="button"
              aria-label="Open menu"
              aria-expanded={mobileOpen}
              aria-controls="mobile-menu"
              onClick={() => setMobileOpen(true)}
              className={cn(
                "inline-flex h-11 w-11 items-center justify-center rounded-2xl transition focus-energy active:scale-95 lg:hidden",
                onDark
                  ? "bg-white/10 text-white hover:bg-white/20"
                  : "bg-ink-950 text-white hover:bg-ink-800"
              )}
            >
              <List size={20} weight="bold" aria-hidden />
            </button>
          </div>
        </motion.div>

        {/* ── Mega panel (full-width) ── */}
        <AnimatePresence>
          {megaOpen && servicesItem?.children && (
            <MegaPanel
              item={servicesItem}
              reduce={Boolean(reduce)}
              onEnter={openMega}
              onLeave={scheduleCloseMega}
            />
          )}
        </AnimatePresence>
      </header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <MobileDrawer
            reduce={Boolean(reduce)}
            onClose={() => setMobileOpen(false)}
            isActive={isActive}
          />
        )}
      </AnimatePresence>
    </>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Full-width mega panel
   ────────────────────────────────────────────────────────────────────────── */
function MegaPanel({
  item,
  reduce,
  onEnter,
  onLeave
}: {
  item: NavLink;
  reduce: boolean;
  onEnter: () => void;
  onLeave: () => void;
}) {
  return (
    <motion.div
      id="services-mega-menu"
      role="menu"
      aria-label="Services"
      initial={{ opacity: 0, y: reduce ? 0 : -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: reduce ? 0 : -8 }}
      transition={{ duration: reduce ? 0 : 0.22, ease: easeOut }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      className="hidden border-b border-ink-100 bg-white/95 shadow-soft backdrop-blur-xl lg:block"
    >
      <div className="container-x grid gap-6 py-8 lg:grid-cols-[1fr_280px]">
        <div className="grid grid-cols-2 gap-1 xl:grid-cols-3">
          {item.children!.map((child) => {
            const meta = serviceMeta[child.href];
            return (
              <Link
                key={child.href}
                href={child.href}
                role="menuitem"
                className="group flex items-start gap-3.5 rounded-2xl p-4 transition hover:bg-ink-50 focus-energy"
              >
                <IconTile icon={meta?.icon ?? SquaresFour} tone={meta?.tone ?? "brand"} size="md" />
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 font-display text-[15px] font-semibold tracking-[-0.01em] text-ink-950">
                    {child.label}
                    <ArrowUpRight
                      size={12}
                      weight="bold"
                      aria-hidden
                      className="-translate-x-1 opacity-0 transition group-hover:translate-x-0 group-hover:opacity-60"
                    />
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-ink-500">
                    {meta?.desc ?? "Open this service."}
                  </span>
                </span>
              </Link>
            );
          })}
          <Link
            href={item.href}
            role="menuitem"
            className="group flex items-center gap-3.5 rounded-2xl border border-dashed border-ink-200 p-4 text-sm font-semibold text-ink-600 transition hover:border-royal-300 hover:text-royal-800 focus-energy"
          >
            See all 60+ services
            <ArrowRight size={14} weight="bold" aria-hidden className="transition group-hover:translate-x-0.5" />
          </Link>
        </div>

        {/* Dashboard CTA rail */}
        <Link
          href="/dashboard"
          role="menuitem"
          className="grain group relative flex flex-col justify-between overflow-hidden rounded-3xl bg-ink-950 p-6 text-white transition hover:shadow-energy focus-energy"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -right-14 -top-14 h-40 w-40 rounded-full bg-energy-gradient opacity-60 blur-2xl transition group-hover:opacity-90"
          />
          <div className="relative z-10">
            <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">
              <span className="brand-dot" aria-hidden /> Already a partner?
            </span>
            <p className="mt-3 font-display text-xl font-semibold leading-tight tracking-[-0.02em]">
              Open the dashboard
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-white/60">
              Wallet, settlements and every service in one place.
            </p>
          </div>
          <span className="relative z-10 mt-6 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-ink-950 transition group-hover:bg-accent-400">
            <ArrowUpRight size={16} weight="bold" aria-hidden />
          </span>
        </Link>
      </div>
    </motion.div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Mobile right-hand drawer
   ────────────────────────────────────────────────────────────────────────── */
function MobileDrawer({
  reduce,
  onClose,
  isActive
}: {
  reduce: boolean;
  onClose: () => void;
  isActive: (href: string) => boolean;
}) {
  const closeRef = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    closeRef.current?.focus();
  }, []);

  return (
    <div id="mobile-menu" role="dialog" aria-modal="true" aria-label="Site menu" className="fixed inset-0 z-[60] lg:hidden">
      {/* Backdrop */}
      <motion.button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reduce ? 0 : 0.2 }}
        className="absolute inset-0 bg-ink-950/50 backdrop-blur-sm"
      />

      {/* Panel */}
      <motion.div
        initial={reduce ? false : { x: "100%" }}
        animate={{ x: 0 }}
        exit={reduce ? undefined : { x: "100%" }}
        transition={{ duration: reduce ? 0 : 0.35, ease: easeOut }}
        className="absolute inset-y-0 right-0 flex w-[88%] max-w-sm flex-col overflow-y-auto rounded-l-[2rem] bg-white shadow-glow"
      >
        <div className="flex items-center justify-between px-6 pt-5">
          <Logo size="sm" />
          <button
            ref={closeRef}
            type="button"
            aria-label="Close menu"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-ink-100 text-ink-700 transition hover:bg-ink-200 focus-energy active:scale-95"
          >
            <X size={18} weight="bold" aria-hidden />
          </button>
        </div>

        <nav aria-label="Primary" className="flex-1 px-4 py-6">
          <ul className="space-y-0.5">
            {mainNav.map((item, i) => {
              const active = isActive(item.href);
              return (
                <motion.li
                  key={item.label}
                  initial={reduce ? false : { opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    duration: reduce ? 0 : 0.35,
                    delay: reduce ? 0 : 0.08 + i * 0.05,
                    ease: easeOut
                  }}
                >
                  <Link
                    href={item.href}
                    onClick={onClose}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center justify-between rounded-2xl px-4 py-3.5 font-display text-xl font-semibold tracking-[-0.01em] transition focus-energy",
                      active
                        ? "pill-active text-royal-900"
                        : "text-ink-800 hover:bg-ink-50"
                    )}
                  >
                    {item.label}
                    <ArrowRight size={16} weight="bold" aria-hidden className="text-ink-300" />
                  </Link>
                  {item.children && (
                    <ul className="mb-2 mt-1 flex flex-wrap gap-1.5 px-4">
                      {item.children.map((c) => (
                        <li key={c.href}>
                          <Link
                            href={c.href}
                            onClick={onClose}
                            className="inline-flex items-center rounded-full border border-ink-200 bg-ink-50 px-3 py-1.5 text-xs font-medium text-ink-700 transition hover:border-ink-300 hover:text-ink-950 focus-energy"
                          >
                            {c.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </motion.li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-ink-100 px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5">
          <div className="grid gap-2">
            <Link href="/register" onClick={onClose} className="rounded-2xl focus-energy">
              <Button size="lg" tabIndex={-1} className="w-full">
                Open your counter
                <ArrowRight size={16} weight="bold" aria-hidden />
              </Button>
            </Link>
            <Link href="/login" onClick={onClose} className="rounded-2xl focus-energy">
              <Button variant="outline" size="lg" tabIndex={-1} className="w-full">
                Partner login
              </Button>
            </Link>
          </div>
          <p className="mt-4 text-center text-[11px] text-ink-400">
            Free to join · KYC in under five minutes · +91 {company.phone}
          </p>
        </div>
      </motion.div>
    </div>
  );
}
