"use client";

import { useState, useEffect, useCallback } from "react";
import { Send, CheckCircle2, Copy, PackagePlus, AlertTriangle, Package } from "lucide-react";
import { LinkSimple, UserPlus, CheckCircle } from "@phosphor-icons/react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/Button";
import { FloatingInput } from "@/components/ui/Input";
import { IconTile } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/Badge";
import { FadeIn, SectionCard } from "@/components/dashboard/patterns";
import { type Role } from "@/lib/auth";
import { useAuth } from "@/lib/useAuth";
import Link from "next/link";

type AvailableKit = {
  id: string;
  userCode: string;
  kitType: string;
  purchasedAt: string;
};

type KitsResponse = {
  kits: AvailableKit[];
  total: number;
};

/** Roles that must select a kit before inviting */
const KIT_REQUIRED_ROLES: Role[] = ["super-distributor", "master-distributor", "distributor"];

export default function OnboardInvitePage() {
  const { session } = useAuth();
  const role: Role = session?.role ?? "retailer";

  const [done, setDone]           = useState(false);
  const [onboardingLink, setOnboardingLink] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState("");
  const [copied, setCopied]       = useState(false);

  const [form, setForm] = useState({ name: "", phone: "", email: "" });
  const [selectedKitId, setSelectedKitId] = useState("");

  // Available kits for kit-required roles
  const [availableKits, setAvailableKits]       = useState<AvailableKit[]>([]);
  const [kitsLoading, setKitsLoading]           = useState(false);
  const [kitsLoadError, setKitsLoadError]       = useState("");

  const needsKit = KIT_REQUIRED_ROLES.includes(role);

  const childLabel =
    role === "super-distributor"  ? "Master Distributor" :
    role === "master-distributor" ? "Distributor" :
    "Retailer";

  const kitLabel =
    role === "super-distributor"  ? "MD-Kit" :
    role === "master-distributor" ? "DT-Kit" :
    "RT-Kit";

  const loadAvailableKits = useCallback(async () => {
    if (!needsKit) return;
    setKitsLoading(true);
    setKitsLoadError("");
    try {
      const res = await fetch("/api/network/kits?status=AVAILABLE&limit=100");
      const data: KitsResponse = await res.json();
      if (!res.ok) {
        setKitsLoadError("Could not load available kits");
        return;
      }
      setAvailableKits(data.kits ?? []);
      // Auto-select the first available kit
      if (data.kits?.length > 0 && !selectedKitId) {
        setSelectedKitId(data.kits[0].id);
      }
    } catch {
      setKitsLoadError("Network error loading kits");
    } finally {
      setKitsLoading(false);
    }
  }, [needsKit, selectedKitId]);

  useEffect(() => {
    loadAvailableKits();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsKit]);

  function updateForm(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (needsKit && !selectedKitId) {
      setError("Please select a kit code before sending the invite.");
      return;
    }
    setSubmitting(true);
    setError("");

    try {
      const body: Record<string, unknown> = {
        name:  form.name || undefined,
        email: form.email,
        phone: form.phone.replace(/\s/g, ""),
      };
      if (needsKit && selectedKitId) {
        body.kitId = selectedKitId;
      }

      const res = await fetch("/api/admin/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to send invite");
        return;
      }

      setOnboardingLink(data.invite.onboardingLink);
      setDone(true);
    } catch {
      setError("Network error — please try again");
    } finally {
      setSubmitting(false);
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(onboardingLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Success screen ────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="mx-auto max-w-xl">
        <FadeIn>
          <SectionCard tone="accent" padding="lg" className="text-center">
            <IconTile icon={CheckCircle} tone="accent" size="xl" className="mx-auto" />
            <h2 className="mt-5 font-display text-2xl font-semibold tracking-[-0.02em] text-ink-900 md:text-3xl">
              Invite sent
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-ink-600">
              An onboarding link has gone to <strong>{form.email}</strong> and <strong>{form.phone}</strong>.
              They&apos;ll get an email and SMS with the registration link.
            </p>

            <div className="mt-6 rounded-2xl bg-white p-4 text-left ring-1 ring-inset ring-ink-100">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-ink-500">
                Onboarding link
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded-xl bg-ink-50 px-3 py-2 font-mono text-xs text-ink-700">
                  {onboardingLink}
                </code>
                <Button variant="outline" size="icon" onClick={copyLink} title="Copy link" aria-label="Copy onboarding link">
                  {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="mt-2 text-xs text-ink-500">
                You can also share this link manually before it expires.
              </p>
            </div>

            <div className="mt-6">
              <Button onClick={() => {
                setDone(false);
                setForm({ name: "", phone: "", email: "" });
                setSelectedKitId("");
                loadAvailableKits();
              }}>
                <Send className="h-4 w-4" /> Send another invite
              </Button>
            </div>
          </SectionCard>
        </FadeIn>
      </div>
    );
  }

  // ── No kits warning ───────────────────────────────────────────────────────
  const hasNoKits = needsKit && !kitsLoading && availableKits.length === 0 && !kitsLoadError;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Network · Invite"
        title={`Invite a ${childLabel}`}
        description={`Send an onboarding link via email and SMS. The ${childLabel.toLowerCase()} completes their own registration and KYC.`}
      />

      <div className="mx-auto grid max-w-4xl gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <SectionCard
            icon={<IconTile icon={UserPlus} tone="brand" size="sm" />}
            title="Invitee details"
            description="Just a name and how to reach them — they fill in the rest."
          >
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-inset ring-rose-200">
                  {error}
                </div>
              )}

              <FloatingInput
                label="Name (optional)"
                value={form.name}
                onChange={(e) => updateForm("name", e.target.value)}
              />
              <FloatingInput
                label="Mobile number *"
                required
                inputMode="tel"
                value={form.phone}
                onChange={(e) => updateForm("phone", e.target.value)}
                hint="10-digit mobile, e.g. 98765 43210"
              />
              <FloatingInput
                label="Email *"
                required
                type="email"
                value={form.email}
                onChange={(e) => updateForm("email", e.target.value)}
              />

              {/* ── Kit selector (SD/MD/DT only) ─────────────────────────── */}
              {needsKit && (
                <div className="rounded-2xl border border-ink-200 bg-ink-50 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-brand-600" />
                    <span className="text-sm font-semibold text-ink-800">
                      Select {kitLabel} Code <span className="text-rose-500">*</span>
                    </span>
                  </div>

                  {kitsLoading && (
                    <p className="text-sm text-ink-500">Loading available kits…</p>
                  )}

                  {kitsLoadError && (
                    <p className="text-sm text-rose-600">{kitsLoadError}</p>
                  )}

                  {hasNoKits && (
                    <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 space-y-2">
                      <div className="flex items-center gap-2 text-amber-700">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <span className="text-sm font-medium">No kits available</span>
                      </div>
                      <p className="text-xs text-amber-600">
                        You must purchase at least one {kitLabel} before you can invite a {childLabel}.
                      </p>
                      <Link href="/dashboard/network/kits">
                        <Button variant="outline" size="sm" className="mt-1">
                          <PackagePlus className="h-3.5 w-3.5" />
                          Buy {kitLabel}s
                        </Button>
                      </Link>
                    </div>
                  )}

                  {availableKits.length > 0 && (
                    <>
                      <select
                        value={selectedKitId}
                        onChange={(e) => setSelectedKitId(e.target.value)}
                        required
                        className="w-full rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      >
                        <option value="">— Select a kit code —</option>
                        {availableKits.map((kit) => (
                          <option key={kit.id} value={kit.id}>
                            {kit.userCode} · {kit.kitType.replace("_KIT", "-Kit")} · purchased {new Date(kit.purchasedAt).toLocaleDateString("en-IN")}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-ink-500">
                        {availableKits.length} kit{availableKits.length !== 1 ? "s" : ""} available ·{" "}
                        <Link href="/dashboard/network/kits" className="text-brand-600 underline underline-offset-2">
                          Buy more
                        </Link>
                      </p>
                    </>
                  )}
                </div>
              )}

              <Button
                type="submit"
                isLoading={submitting}
                disabled={needsKit && (hasNoKits || !selectedKitId)}
                className="w-full"
                size="lg"
              >
                <Send className="h-4 w-4" />
                Send onboarding invite
              </Button>
            </form>
          </SectionCard>
        </div>

        <div className="space-y-4 lg:col-span-2">
          <SectionCard tone="brand">
            <div className="flex items-start gap-3">
              <IconTile icon={LinkSimple} tone="brand" size="sm" />
              <p className="text-sm text-ink-700">
                An onboarding link is sent to the invitee. They register themselves — you don&apos;t
                need to enter their personal details.
              </p>
            </div>
          </SectionCard>

          <SectionCard title="Inviting as" padding="md">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-display text-lg font-semibold tracking-[-0.02em] text-ink-900">{childLabel}</p>
                <p className="text-xs text-ink-500">This person will be mapped under your network.</p>
              </div>
              <Badge variant="energy">Direct child</Badge>
            </div>
          </SectionCard>

          {needsKit && (
            <SectionCard title="Kit Code" padding="md">
              <p className="text-xs text-ink-600 leading-relaxed">
                A <strong>{kitLabel}</strong> code is pre-minted for the {childLabel.toLowerCase()}.
                It becomes their permanent user ID after admin approval.
                One kit = one onboarding slot.
              </p>
              <Link href="/dashboard/network/kits" className="mt-3 block">
                <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                  <PackagePlus className="h-4 w-4" />
                  Manage my kits
                </Button>
              </Link>
            </SectionCard>
          )}
        </div>
      </div>
    </div>
  );
}
