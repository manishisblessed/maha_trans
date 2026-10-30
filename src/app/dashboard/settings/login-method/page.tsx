"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ShieldCheck,
  KeyRound,
  HelpCircle,
  Loader2,
  Check,
  Lock,
} from "lucide-react";
import { Key, ShieldWarning, Fingerprint } from "@phosphor-icons/react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { IconTile } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/Badge";
import { EmptyState, SectionCard, FadeIn } from "@/components/dashboard/patterns";
import { cn } from "@/lib/utils";

type Preferred = "authenticator" | "tpin" | null;

type State = {
  selfManageable: boolean;
  twoFactorEnabled: boolean;
  hasTxnPin: boolean;
  hasCompletedAuthenticator: boolean;
  pinLoginEnabled: boolean;
  riskAccepted: boolean;
  canChoose: boolean;
  preferred: Preferred;
};

const OPTIONS: {
  id: Exclude<Preferred, null> | "ask";
  label: string;
  desc: string;
  icon: typeof ShieldCheck;
  accent: string;
}[] = [
  {
    id: "ask",
    label: "Ask me every time",
    desc: "Show the chooser at each login so you can pick on the spot.",
    icon: HelpCircle,
    accent: "bg-ink-100 text-ink-600",
  },
  {
    id: "authenticator",
    label: "Authenticator app",
    desc: "Skip the chooser and go straight to your 6-digit TOTP code. Most secure.",
    icon: ShieldCheck,
    accent: "bg-accent-50 text-accent-700",
  },
  {
    id: "tpin",
    label: "Transaction PIN",
    desc: "Skip the chooser and sign in with your TPIN. Quick and convenient.",
    icon: KeyRound,
    accent: "bg-brand-50 text-brand-700",
  },
];

export default function LoginMethodSettingsPage() {
  const [state, setState] = useState<State | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch("/api/security/login-method");
      const data = await res.json();
      if (res.ok) setState(data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function choose(id: (typeof OPTIONS)[number]["id"]) {
    const preferred: Preferred = id === "ask" ? null : id;
    setBusy(`pref-${id}`);
    try {
      const res = await fetch("/api/security/login-method", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setPreference", preferred }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Something went wrong");
      setState(data);
      toast.success("Login preference saved.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  }

  const current: (typeof OPTIONS)[number]["id"] = state?.preferred ?? "ask";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        eyebrow="Account · Security"
        title="Login method"
        description="Choose how you verify your identity when you sign in."
        actions={
          <Link href="/dashboard/settings" className="text-sm font-semibold text-ink-500 hover:text-ink-900">
            ← Back to settings
          </Link>
        }
      />

      {loading ? (
        <SectionCard className="grid place-items-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-brand-600" />
        </SectionCard>
      ) : !state ? (
        <EmptyState
          bordered
          tone="coral"
          icon={ShieldWarning}
          title="Couldn't load your login settings"
          description="Please refresh and try again."
        />
      ) : !state.selfManageable ? (
        <SectionCard tone="amber">
          <div className="flex items-start gap-3">
            <IconTile icon={ShieldWarning} tone="amber" size="sm" />
            <div>
              <p className="font-semibold text-ink-900">
                PIN login isn&apos;t available for this account
              </p>
              <p className="mt-1 text-sm text-ink-600">
                For security, admin and master-admin accounts must always sign in
                with an authenticator app.
              </p>
            </div>
          </div>
        </SectionCard>
      ) : (
        <FadeIn className="space-y-6">
          {/* ── TPIN login status ──────────────────────────────────────── */}
          <SectionCard
            icon={<IconTile icon={Key} tone="brand" size="sm" />}
            title="Sign in with your transaction PIN"
            description="Use your TPIN as a quick alternative to the authenticator app."
            action={
              state.pinLoginEnabled
                ? <Badge variant="success" dot>Available</Badge>
                : <Badge>Not available</Badge>
            }
          >
            {state.pinLoginEnabled ? (
              <p className="text-sm text-ink-600">
                TPIN login is available. At sign-in you&apos;ll be able to choose
                between your authenticator app and your transaction PIN.
              </p>
            ) : !state.hasTxnPin ? (
              <div className="flex items-start gap-3 rounded-2xl bg-amber-50 p-4 ring-1 ring-inset ring-amber-200">
                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <div className="text-sm text-amber-800">
                  Set up a transaction PIN to unlock TPIN login.{" "}
                  <Link
                    href="/dashboard/settings/txn-pin"
                    className="font-semibold text-brand-700 hover:underline"
                  >
                    Set a transaction PIN
                  </Link>
                  .
                </div>
              </div>
            ) : !state.hasCompletedAuthenticator ? (
              <div className="flex items-start gap-3 rounded-2xl bg-amber-50 p-4 ring-1 ring-inset ring-amber-200">
                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <div className="text-sm text-amber-800">
                  Complete your authenticator app setup first. TPIN login becomes
                  available automatically after your first sign-in with the
                  authenticator.{" "}
                  <Link
                    href="/dashboard/settings/security"
                    className="font-semibold text-brand-700 hover:underline"
                  >
                    Set up authenticator
                  </Link>
                  .
                </div>
              </div>
            ) : null}
          </SectionCard>

          {/* ── Preferred method (only when TPIN is available) ─────────── */}
          {state.pinLoginEnabled && (
            <SectionCard
              icon={<IconTile icon={Fingerprint} tone="royal" size="sm" />}
              title="Preferred method at login"
              description={
                state.canChoose
                  ? "Pick a default — you can always switch during login."
                  : "You'll sign in with your transaction PIN. Set up an authenticator app to be able to choose between the two."
              }
            >
              {state.canChoose ? (
                <div className="space-y-3" role="radiogroup" aria-label="Preferred login method">
                  {OPTIONS.map((o) => {
                    const Icon = o.icon;
                    const active = current === o.id;
                    const isBusy = busy === `pref-${o.id}`;
                    return (
                      <button
                        key={o.id}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        disabled={busy !== null}
                        onClick={() => choose(o.id)}
                        className={cn(
                          "flex w-full items-center gap-4 rounded-2xl p-4 text-left ring-1 ring-inset transition-[box-shadow,background-color] focus-energy",
                          active
                            ? "pill-active ring-royal-200 shadow-energy-sm"
                            : "bg-white ring-ink-100 hover:ring-brand-300"
                        )}
                      >
                        <span
                          className={cn(
                            "grid h-11 w-11 shrink-0 place-items-center rounded-xl",
                            o.accent
                          )}
                        >
                          <Icon className="h-5 w-5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-ink-900">
                            {o.label}
                          </span>
                          <span className="block text-xs text-ink-500">{o.desc}</span>
                        </span>
                        {isBusy ? (
                          <Loader2 className="h-5 w-5 shrink-0 animate-spin text-brand-600" />
                        ) : active ? (
                          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-energy-gradient text-white">
                            <Check className="h-4 w-4" />
                          </span>
                        ) : (
                          <span className="h-6 w-6 shrink-0 rounded-full ring-1 ring-inset ring-ink-200" />
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-start gap-3 rounded-2xl bg-ink-50/70 p-4 text-sm text-ink-600 ring-1 ring-inset ring-ink-100">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>
                    Want the choice at login?{" "}
                    <Link
                      href="/dashboard/settings/security"
                      className="font-semibold text-brand-700 hover:underline"
                    >
                      Set up an authenticator app
                    </Link>{" "}
                    and you&apos;ll be able to pick either method.
                  </span>
                </div>
              )}
            </SectionCard>
          )}
        </FadeIn>
      )}
    </div>
  );
}
