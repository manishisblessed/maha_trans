"use client";

import { useCallback, useEffect, useState } from "react";
import { Save, AlertCircle, CheckCircle2, Rocket, RefreshCw, Copy, Check } from "lucide-react";

const PLATFORM_DOMAIN = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN ?? "transpe.in";
import { Globe, Headset, LockKey, PaintBrush, WifiHigh, Info } from "@phosphor-icons/react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/Button";
import { FloatingInput, Input, Label } from "@/components/ui/Input";
import { IconTile } from "@/components/ui/Icon";
import { EmptyState, FadeIn, SectionCard, StatusChip } from "@/components/dashboard/patterns";

type Profile = {
  brandName: string;
  tagline: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  accentColor: string;
  supportEmail: string | null;
  supportPhone: string | null;
  subdomain: string | null;
  customDomain: string | null;
  status: string;
  updatedAt?: string;
};

const EMPTY: Profile = {
  brandName: "",
  tagline: "",
  logoUrl: "",
  faviconUrl: "",
  primaryColor: "#185df5",
  accentColor: "#f97606",
  supportEmail: "",
  supportPhone: "",
  subdomain: "",
  customDomain: "",
  status: "DRAFT",
};

type DnsVerifyResult = {
  type: "subdomain" | "customDomain";
  host: string;
  ok: boolean;
  resolved?: string[];
  expectedCname?: string;
  cnameMatches?: boolean;
  error?: string;
};

export default function WhitelabelPage() {
  const [profile, setProfile] = useState<Profile>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<"brand" | "dns">("brand");
  const [verifying, setVerifying] = useState(false);
  const [dnsResults, setDnsResults] = useState<DnsVerifyResult[]>([]);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/platform/whitelabel");
      if (res.status === 403) {
        setForbidden(true);
        return;
      }
      const data = await res.json();
      if (res.ok && data.profile) setProfile({ ...EMPTY, ...data.profile });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function set<K extends keyof Profile>(key: K, value: Profile[K]) {
    setProfile((p) => ({ ...p, [key]: value }));
    setSaved(false);
  }

  async function save(goLive?: boolean) {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const body = {
        brandName: profile.brandName.trim(),
        tagline: profile.tagline?.trim() || null,
        logoUrl: profile.logoUrl?.trim() || null,
        faviconUrl: profile.faviconUrl?.trim() || null,
        primaryColor: profile.primaryColor,
        accentColor: profile.accentColor,
        supportEmail: profile.supportEmail?.trim() || null,
        supportPhone: profile.supportPhone?.trim() || null,
        subdomain: profile.subdomain?.trim().toLowerCase() || null,
        customDomain: profile.customDomain?.trim().toLowerCase() || null,
        ...(goLive ? { status: "LIVE" as const } : {}),
      };
      const res = await fetch("/api/platform/whitelabel", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Check the highlighted fields and try again");
      }
      setProfile({ ...EMPTY, ...data.profile });
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (forbidden) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Platform · Brand" title="White-label portal" description="Run the platform under your own brand." />
        <EmptyState
          bordered
          icon={LockKey}
          tone="amber"
          title="White-label is for Master & Super Distributors"
          description={
            <>
              This feature is available to <strong>Master Distributor</strong> and <strong>Super Distributor</strong> accounts.
              Contact your upline to upgrade.
            </>
          }
        />
      </div>
    );
  }

  async function verifyDns() {
    setVerifying(true);
    setDnsResults([]);
    try {
      const res = await fetch("/api/platform/whitelabel/verify-domain", { method: "POST" });
      const data = await res.json();
      setDnsResults(data.results ?? []);
    } finally {
      setVerifying(false);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const canSave = profile.brandName.trim().length >= 2 && !saving && !loading;
  const canGoLive = canSave && Boolean(profile.subdomain?.trim() || profile.customDomain?.trim());
  const previewHost =
    profile.customDomain?.trim() ||
    (profile.subdomain?.trim() ? `${profile.subdomain.trim()}.${PLATFORM_DOMAIN}` : `your-brand.${PLATFORM_DOMAIN}`);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Platform · Brand"
        title="White-label portal"
        description="Run the platform under your own brand, domain and colors."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusChip
              status={profile.status}
              label={profile.status === "LIVE" ? "Live" : profile.status === "SUSPENDED" ? "Suspended" : "Draft"}
            />
            <Button variant="secondary" onClick={() => save()} disabled={!canSave}>
              <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save draft"}
            </Button>
            {profile.status !== "LIVE" && (
              <Button onClick={() => save(true)} disabled={!canGoLive}>
                <Rocket className="h-4 w-4" /> Go live
              </Button>
            )}
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 rounded-2xl bg-ink-100 p-1 w-fit">
        {(["brand", "dns"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              activeTab === tab ? "bg-white text-ink-900 shadow-soft" : "text-ink-500 hover:text-ink-700"
            }`}
          >
            {tab === "brand" ? "Brand & Domains" : "DNS & Verification"}
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-inset ring-rose-200">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}
      {saved && !error && (
        <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ring-1 ring-inset ring-emerald-200">
          <CheckCircle2 className="h-4 w-4 shrink-0" /> Profile saved.
        </div>
      )}

      {/* ── DNS & Verification tab ──────────────────────────────── */}
      {activeTab === "dns" && (
        <div className="space-y-6">
          {/* Subdomain guide */}
          <SectionCard
            icon={<IconTile icon={WifiHigh} tone="brand" size="sm" />}
            title="Subdomain setup"
            description={`Your portal will be live at ${profile.subdomain?.trim() ? `${profile.subdomain.trim()}.${PLATFORM_DOMAIN}` : `<subdomain>.${PLATFORM_DOMAIN}`} — no DNS changes required.`}
          >
            <div className="rounded-2xl bg-ink-50 p-4">
              <p className="text-sm text-ink-600">
                Subdomain portals are managed by us and go live as soon as you click{" "}
                <strong>Go live</strong>. No DNS record needs to be added on your end.
              </p>
            </div>
          </SectionCard>

          {/* Custom domain guide */}
          <SectionCard
            icon={<IconTile icon={Globe} tone="accent" size="sm" />}
            title="Custom domain setup"
            description="Point your own domain to this platform with a CNAME record."
          >
            <ol className="space-y-4 text-sm text-ink-700">
              <li className="flex gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">1</span>
                <div>
                  <p className="font-semibold text-ink-900">Log in to your domain registrar</p>
                  <p className="text-ink-500 mt-0.5">GoDaddy, Namecheap, Cloudflare, BigRock, etc.</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">2</span>
                <div>
                  <p className="font-semibold text-ink-900">Create a CNAME record</p>
                  <div className="mt-2 overflow-x-auto rounded-xl border border-ink-200 bg-white">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-ink-100 bg-ink-50">
                          <th className="px-4 py-2 text-left font-semibold text-ink-600">Type</th>
                          <th className="px-4 py-2 text-left font-semibold text-ink-600">Name / Host</th>
                          <th className="px-4 py-2 text-left font-semibold text-ink-600">Value / Target</th>
                          <th className="px-4 py-2 text-left font-semibold text-ink-600">TTL</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="px-4 py-2.5 font-mono font-semibold text-brand-700">CNAME</td>
                          <td className="px-4 py-2.5 font-mono">
                            {profile.customDomain?.trim() || "yourdomain.in"}
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <code className="font-mono text-ink-900">{PLATFORM_DOMAIN}</code>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(PLATFORM_DOMAIN)}
                                className="rounded p-0.5 text-ink-400 hover:text-ink-700"
                              >
                                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 font-mono text-ink-500">3600</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">3</span>
                <div>
                  <p className="font-semibold text-ink-900">Wait for DNS propagation</p>
                  <p className="text-ink-500 mt-0.5">Usually 15 minutes to 48 hours. Use the checker below to confirm.</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">4</span>
                <div>
                  <p className="font-semibold text-ink-900">SSL is automatic</p>
                  <p className="text-ink-500 mt-0.5">Once the CNAME propagates, TLS/HTTPS is provisioned automatically. No manual certificate work needed.</p>
                </div>
              </li>
            </ol>
          </SectionCard>

          {/* DNS verifier */}
          <SectionCard
            icon={<IconTile icon={WifiHigh} tone="royal" size="sm" />}
            title="Verify propagation"
            description="Check if your domain is resolving correctly."
          >
            <Button variant="secondary" onClick={verifyDns} disabled={verifying || (!profile.subdomain && !profile.customDomain)}>
              <RefreshCw className={`h-4 w-4 ${verifying ? "animate-spin" : ""}`} />
              {verifying ? "Checking…" : "Check DNS now"}
            </Button>
            {!profile.subdomain && !profile.customDomain && (
              <p className="mt-3 text-sm text-ink-400 flex items-center gap-1.5">
                <Info size={14} /> Save a subdomain or custom domain first.
              </p>
            )}
            {dnsResults.length > 0 && (
              <div className="mt-4 space-y-3">
                {dnsResults.map((r) => (
                  <div
                    key={r.host}
                    className={`rounded-2xl border p-4 ${
                      r.ok ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {r.ok ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
                      )}
                      <span className="font-mono text-sm font-semibold">{r.host}</span>
                      <span className={`text-xs font-semibold ${r.ok ? "text-emerald-700" : "text-rose-700"}`}>
                        {r.ok ? "Propagated ✓" : "Not yet propagated"}
                      </span>
                    </div>
                    {r.resolved && r.resolved.length > 0 && (
                      <p className="text-xs text-ink-600">Resolved to: {r.resolved.join(", ")}</p>
                    )}
                    {r.expectedCname && (
                      <p className="text-xs text-ink-600">
                        Expected CNAME target: <code>{r.expectedCname}</code>
                        {r.cnameMatches === false && " — CNAME not matching yet"}
                      </p>
                    )}
                    {r.error && <p className="text-xs text-rose-600 mt-1">{r.error}</p>}
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {activeTab === "brand" && <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <SectionCard
            icon={<IconTile icon={PaintBrush} tone="royal" size="sm" />}
            title="Brand identity"
            description="Name, tagline, colours and logo your network will see."
          >
            <div className="grid gap-5 md:grid-cols-2">
              <FloatingInput label="Brand name *" value={profile.brandName} onChange={(e) => set("brandName", e.target.value)} placeholder="KapoorPay" />
              <FloatingInput label="Tagline" value={profile.tagline ?? ""} onChange={(e) => set("tagline", e.target.value)} placeholder="Your own payments brand" />
              <div>
                <Label htmlFor="wl-primary">Primary color</Label>
                <div className="flex items-center gap-2">
                  <input
                    id="wl-primary"
                    type="color"
                    value={profile.primaryColor}
                    onChange={(e) => set("primaryColor", e.target.value)}
                    className="h-11 w-12 cursor-pointer rounded-2xl border border-ink-200 p-1"
                  />
                  <Input value={profile.primaryColor} onChange={(e) => set("primaryColor", e.target.value)} className="font-mono uppercase" aria-label="Primary color hex" />
                </div>
              </div>
              <div>
                <Label htmlFor="wl-accent">Accent color</Label>
                <div className="flex items-center gap-2">
                  <input
                    id="wl-accent"
                    type="color"
                    value={profile.accentColor}
                    onChange={(e) => set("accentColor", e.target.value)}
                    className="h-11 w-12 cursor-pointer rounded-2xl border border-ink-200 p-1"
                  />
                  <Input value={profile.accentColor} onChange={(e) => set("accentColor", e.target.value)} className="font-mono uppercase" aria-label="Accent color hex" />
                </div>
              </div>
              <FloatingInput label="Logo URL" value={profile.logoUrl ?? ""} onChange={(e) => set("logoUrl", e.target.value)} placeholder="https://cdn.yourbrand.in/logo.svg" />
              <FloatingInput label="Favicon URL" value={profile.faviconUrl ?? ""} onChange={(e) => set("faviconUrl", e.target.value)} placeholder="https://cdn.yourbrand.in/favicon.svg" />
            </div>
          </SectionCard>

          <SectionCard
            icon={<IconTile icon={Globe} tone="brand" size="sm" />}
            title="Domain"
            description="Where your branded portal lives."
          >
            <div className="grid gap-5 md:grid-cols-2">
              <div className="flex items-center gap-2">
                <FloatingInput
                  label="Subdomain"
                  className="flex-1"
                  value={profile.subdomain ?? ""}
                  onChange={(e) => set("subdomain", e.target.value)}
                  placeholder="kapoorpay"
                />
                <span className="whitespace-nowrap text-sm font-medium text-ink-500">.{PLATFORM_DOMAIN}</span>
              </div>
              <FloatingInput
                label="Custom domain"
                hint="Point a CNAME at the platform before going live."
                value={profile.customDomain ?? ""}
                onChange={(e) => set("customDomain", e.target.value)}
                placeholder="kapoorpay.in"
              />
            </div>
          </SectionCard>

          <SectionCard
            icon={<IconTile icon={Headset} tone="accent" size="sm" />}
            title="Support contact"
            description="Shown in the portal footer and on receipts."
          >
            <div className="grid gap-5 md:grid-cols-2">
              <FloatingInput label="Support email" value={profile.supportEmail ?? ""} onChange={(e) => set("supportEmail", e.target.value)} placeholder="hello@kapoorpay.in" />
              <FloatingInput label="Support phone (10 digits)" value={profile.supportPhone ?? ""} onChange={(e) => set("supportPhone", e.target.value)} placeholder="9876543210" maxLength={10} />
            </div>
          </SectionCard>
        </div>

        <div className="space-y-4">
          <FadeIn>
            <SectionCard padding="none" eyebrow="Live preview" title={previewHost}>
              <div
                className="relative overflow-hidden p-6 text-white"
                style={{ background: `linear-gradient(135deg, ${profile.primaryColor}, ${profile.accentColor})` }}
              >
                <div className="grain pointer-events-none absolute inset-0 opacity-20" aria-hidden />
                <p className="relative text-[11px] font-bold uppercase tracking-[0.18em] opacity-80">{profile.brandName || "Your brand"}</p>
                <p className="relative mt-3 font-display text-2xl font-semibold tracking-[-0.02em]">{profile.tagline || "Your tagline here"}</p>
                <p className="relative mt-1 text-sm text-white/85">60+ services · Pan-India · Built on TRANSPE</p>
                <button type="button" className="relative mt-4 rounded-full bg-white px-4 py-1.5 text-sm font-semibold" style={{ color: profile.primaryColor }}>
                  Login
                </button>
              </div>
            </SectionCard>
          </FadeIn>

          <SectionCard tone="accent" padding="sm">
            <p className="text-sm text-ink-800">
              <strong className="font-semibold text-ink-900">Powered by TRANSPE.</strong> Footer attribution is required on all white-labels.
            </p>
          </SectionCard>
        </div>
      </div>}
    </div>
  );
}
