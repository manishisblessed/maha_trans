"use client";

import Link from "next/link";
import {
  ShieldCheck,
  Key,
  CaretRight,
  ArrowCounterClockwise,
  LockSimple,
  ArrowSquareOut,
} from "@phosphor-icons/react";
import { IconTile } from "@/components/ui/Icon";
import { AuthCardHeader, AuthLinksRow } from "@/components/auth/AuthCard";
import { cn } from "@/lib/utils";

export type LoginMethod = "2fa" | "pinlogin";

interface LoginMethodChoiceProps {
  userName: string;
  /**
   * Whether the TOTP authenticator is actually configured for this account.
   * When false the "Authenticator app" option is rendered as disabled and a
   * "Set up 2FA" CTA is shown so the user can enable it after logging in via TPIN.
   */
  canAuthenticator: boolean;
  /** Called with the factor the user picked. */
  onChoose: (method: LoginMethod) => void;
  onBack: () => void;
}

/**
 * Second-factor chooser — shown whenever TPIN login is enabled for an account,
 * regardless of whether the authenticator app is also configured. The user
 * makes a deliberate choice on every sign-in.
 *
 * - If both factors are available: both buttons are active.
 * - If only TPIN is available: authenticator button is disabled with a
 *   "Not set up" badge and a "Set up in Security settings" CTA.
 */
export function LoginMethodChoice({
  userName,
  canAuthenticator,
  onChoose,
  onBack,
}: LoginMethodChoiceProps) {
  return (
    <div className="space-y-6">
      <AuthCardHeader
        as="h2"
        eyebrow="Step 2 of 2"
        title="How do you want to verify?"
        description={
          <>
            Hi {userName || "there"} — pick the second factor you&apos;d like to use
            today.{" "}
            {canAuthenticator ? "You can switch any time." : "Set up your authenticator to unlock both options."}
          </>
        }
        icon={<IconTile icon={ShieldCheck} tone="energy" size="lg" />}
      />

      <div className="space-y-3">
        {/* ── Authenticator app ──────────────────────────────────────────── */}
        {canAuthenticator ? (
          <button
            type="button"
            onClick={() => onChoose("2fa")}
            className="gradient-ring focus-energy group flex w-full items-center gap-4 rounded-2xl bg-white p-4 text-left ring-1 ring-ink-100 transition hover:-translate-y-0.5 hover:shadow-energy-sm"
          >
            <IconTile icon={ShieldCheck} tone="accent" size="lg" />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="block text-sm font-semibold text-ink-900">Authenticator app</span>
                <span className="rounded-full bg-accent-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-700 ring-1 ring-inset ring-accent-200">
                  Most secure
                </span>
              </span>
              <span className="mt-0.5 block text-xs text-ink-500">
                Enter the 6-digit code from Google Authenticator, Authy, etc.
              </span>
            </span>
            <CaretRight
              size={18}
              weight="bold"
              className="shrink-0 text-ink-300 transition group-hover:translate-x-0.5 group-hover:text-accent-600"
              aria-hidden
            />
          </button>
        ) : (
          /* Authenticator not set up — show a disabled card with a setup CTA */
          <div
            aria-disabled="true"
            className={cn(
              "flex w-full items-center gap-4 rounded-2xl bg-ink-50/60 p-4 text-left",
              "ring-1 ring-ink-100 opacity-70"
            )}
          >
            <IconTile icon={LockSimple} tone="ink" size="lg" />
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="block text-sm font-semibold text-ink-500">Authenticator app</span>
                <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink-400 ring-1 ring-inset ring-ink-200">
                  Not set up
                </span>
              </span>
              <span className="mt-0.5 block text-xs text-ink-400">
                Sign in with your TPIN first, then enable 2FA in Security settings.
              </span>
            </span>
          </div>
        )}

        {/* ── Transaction PIN ────────────────────────────────────────────── */}
        <button
          type="button"
          onClick={() => onChoose("pinlogin")}
          className="gradient-ring focus-energy group flex w-full items-center gap-4 rounded-2xl bg-white p-4 text-left ring-1 ring-ink-100 transition hover:-translate-y-0.5 hover:shadow-energy-sm"
        >
          <IconTile icon={Key} tone="brand" size="lg" />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="block text-sm font-semibold text-ink-900">Transaction PIN</span>
              <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-700 ring-1 ring-inset ring-brand-200">
                Quick
              </span>
            </span>
            <span className="mt-0.5 block text-xs text-ink-500">
              Sign in with your 4–6 digit TPIN.
            </span>
          </span>
          <CaretRight
            size={18}
            weight="bold"
            className="shrink-0 text-ink-300 transition group-hover:translate-x-0.5 group-hover:text-brand-600"
            aria-hidden
          />
        </button>
      </div>

      {/* ── "Set up authenticator" nudge (only when TOTP isn't configured) ── */}
      {!canAuthenticator && (
        <p className="flex items-center justify-center gap-1.5 rounded-2xl bg-amber-50 px-4 py-3 text-xs text-amber-800 ring-1 ring-inset ring-amber-200">
          <ShieldCheck size={14} weight="duotone" className="shrink-0" aria-hidden />
          <span>
            For stronger security,{" "}
            <Link
              href="/dashboard/settings/security"
              className="font-semibold underline underline-offset-2 hover:text-amber-900"
            >
              set up an authenticator app
              <ArrowSquareOut size={11} weight="bold" className="ml-0.5 inline" aria-hidden />
            </Link>{" "}
            after signing in.
          </span>
        </p>
      )}

      <AuthLinksRow className="justify-end">
        <button
          type="button"
          onClick={onBack}
          className="focus-energy inline-flex items-center gap-1.5 rounded-lg font-medium text-ink-500 transition hover:text-ink-900"
        >
          <ArrowCounterClockwise size={13} weight="bold" aria-hidden />
          Start over
        </button>
      </AuthLinksRow>
    </div>
  );
}
