"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Package, RefreshCw, Loader2, Settings2, Save, ChevronDown, ChevronUp,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/Button";
import { FloatingInput } from "@/components/ui/Input";
import { SectionCard } from "@/components/dashboard/patterns";

// ── Types ────────────────────────────────────────────────────────────────────

type KitStatus = "AVAILABLE" | "RESERVED" | "ASSIGNED" | "ACTIVE" | "COOLING";

type AdminKit = {
  id: string;
  kitType: string;
  userCode: string;
  status: KitStatus;
  purchaseAmount: number;
  purchasedAt: string;
  reservedAt: string | null;
  registeredAt: string | null;
  activatedAt: string | null;
  coolingStartAt: string | null;
  coolingEndsAt: string | null;
  owner: { id: string; name: string; userCode: string | null; role: string };
  invite: { id: string; name: string | null; phone: string; email: string; role: string; status: string } | null;
  activatedFor: { id: string; name: string; userCode: string | null; role: string } | null;
};

type Counts = Partial<Record<KitStatus, number>>;
type KitsResponse = { kits: AdminKit[]; total: number; counts: Counts };
type Pricing = { price: number; label: string; description: string };
type PricingResponse = { pricing: Record<string, Pricing> };

// ── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<KitStatus, string> = {
  AVAILABLE: "text-emerald-700 bg-emerald-50 border-emerald-200",
  RESERVED:  "text-blue-700   bg-blue-50   border-blue-200",
  ASSIGNED:  "text-amber-700  bg-amber-50  border-amber-200",
  ACTIVE:    "text-indigo-700 bg-indigo-50 border-indigo-200",
  COOLING:   "text-slate-600  bg-slate-100 border-slate-200",
};

const STATUS_LABEL: Record<KitStatus, string> = {
  AVAILABLE: "Available",
  RESERVED:  "Reserved",
  ASSIGNED:  "Pending Approval",
  ACTIVE:    "Active",
  COOLING:   "Cooling",
};

function fmt(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

// ── Kit row ───────────────────────────────────────────────────────────────────

function AdminKitRow({ kit }: { kit: AdminKit }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-2xl border border-ink-100 bg-white overflow-hidden">
      <button
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-ink-50 text-left transition-colors"
      >
        <Package className="h-5 w-5 shrink-0 text-brand-400" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-bold text-ink-900 text-sm">{kit.userCode}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLOR[kit.status]}`}>
              {STATUS_LABEL[kit.status]}
            </span>
            <span className="text-xs text-ink-400">{kit.kitType.replace("_KIT", "-Kit")}</span>
          </div>
          <p className="text-xs text-ink-500 mt-0.5">
            Owner: <strong>{kit.owner.name}</strong> ({kit.owner.userCode ?? kit.owner.role})
            {kit.activatedFor && <> · Activated for: <strong>{kit.activatedFor.name}</strong></>}
            {!kit.activatedFor && kit.invite?.name && <> · Reserved for: <strong>{kit.invite.name}</strong></>}
          </p>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-ink-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-ink-400 shrink-0" />}
      </button>

      {expanded && (
        <div className="border-t border-ink-100 px-4 py-3 grid grid-cols-2 gap-x-6 gap-y-2 text-xs bg-ink-50/50">
          <div><span className="text-ink-500">Owner</span><p className="font-medium text-ink-800">{kit.owner.name} · {kit.owner.role}</p></div>
          <div><span className="text-ink-500">Purchase price</span><p className="font-medium text-ink-800">₹{Number(kit.purchaseAmount).toLocaleString("en-IN")}</p></div>
          <div><span className="text-ink-500">Purchased</span><p className="font-medium text-ink-800">{fmt(kit.purchasedAt)}</p></div>
          {kit.reservedAt   && <div><span className="text-ink-500">Reserved</span><p className="font-medium text-ink-800">{fmt(kit.reservedAt)}</p></div>}
          {kit.registeredAt && <div><span className="text-ink-500">Child registered</span><p className="font-medium text-ink-800">{fmt(kit.registeredAt)}</p></div>}
          {kit.activatedAt  && <div><span className="text-ink-500">Activated</span><p className="font-medium text-ink-800">{fmt(kit.activatedAt)}</p></div>}
          {kit.coolingEndsAt && (
            <div className="col-span-2">
              <span className="text-ink-500">Cooling period ends</span>
              <p className="font-medium text-amber-700">{fmt(kit.coolingEndsAt)}</p>
            </div>
          )}
          {kit.invite && (
            <div className="col-span-2">
              <span className="text-ink-500">Invite</span>
              <p className="font-medium text-ink-800">{kit.invite.name ?? "—"} · {kit.invite.phone} · {kit.invite.status}</p>
            </div>
          )}
          {kit.activatedFor && (
            <div className="col-span-2">
              <span className="text-ink-500">Activated for</span>
              <p className="font-medium text-ink-800">{kit.activatedFor.name} ({kit.activatedFor.userCode ?? "—"})</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Pricing form ──────────────────────────────────────────────────────────────

function PricingPanel() {
  const [pricing, setPricing]   = useState<Record<string, Pricing> | null>(null);
  const [form, setForm]         = useState({ MD_KIT: "", DT_KIT: "", RT_KIT: "" });
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [err, setErr]           = useState("");

  const loadPricing = useCallback(async () => {
    const res  = await fetch("/api/admin/kits/pricing");
    const data: PricingResponse = await res.json();
    if (res.ok) {
      setPricing(data.pricing);
      setForm({
        MD_KIT: String(data.pricing.MD_KIT?.price ?? ""),
        DT_KIT: String(data.pricing.DT_KIT?.price ?? ""),
        RT_KIT: String(data.pricing.RT_KIT?.price ?? ""),
      });
    }
  }, []);

  useEffect(() => { loadPricing(); }, [loadPricing]);

  async function handleSave() {
    setErr("");
    const body: Record<string, number> = {};
    if (form.MD_KIT) body.MD_KIT = parseFloat(form.MD_KIT);
    if (form.DT_KIT) body.DT_KIT = parseFloat(form.DT_KIT);
    if (form.RT_KIT) body.RT_KIT = parseFloat(form.RT_KIT);
    if (Object.keys(body).length === 0) { setErr("Enter at least one price"); return; }
    for (const v of Object.values(body)) {
      if (isNaN(v) || v <= 0) { setErr("All prices must be positive numbers"); return; }
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/kits/pricing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error ?? "Failed to save"); return; }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      loadPricing();
    } finally {
      setSaving(false);
    }
  }

  if (!pricing) return <div className="py-6 text-center text-sm text-ink-400">Loading pricing…</div>;

  return (
    <div className="space-y-5">
      {err && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2.5 text-sm text-rose-700">{err}</div>
      )}
      {saved && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2.5 text-sm text-emerald-700">
          Kit pricing saved successfully.
        </div>
      )}

      {(["MD_KIT", "DT_KIT", "RT_KIT"] as const).map((type) => (
        <div key={type} className="flex items-center gap-4">
          <div className="flex-1">
            <FloatingInput
              label={`${type.replace("_KIT", "-Kit")} Price (₹) — ${pricing[type]?.description ?? ""}`}
              value={form[type]}
              onChange={(e) => setForm((p) => ({ ...p, [type]: e.target.value }))}
              inputMode="numeric"
            />
          </div>
        </div>
      ))}

      <Button onClick={handleSave} isLoading={saving}>
        <Save className="h-4 w-4" /> Save Pricing
      </Button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

type TabFilter = "ALL" | KitStatus;
const TABS: { value: TabFilter; label: string }[] = [
  { value: "ALL",       label: "All" },
  { value: "AVAILABLE", label: "Available" },
  { value: "RESERVED",  label: "Reserved" },
  { value: "ASSIGNED",  label: "Pending" },
  { value: "ACTIVE",    label: "Active" },
  { value: "COOLING",   label: "Cooling" },
];

export default function AdminKitsPage() {
  const [tab, setTab]       = useState<TabFilter>("ALL");
  const [kits, setKits]     = useState<AdminKit[]>([]);
  const [counts, setCounts] = useState<Counts>({});
  const [loading, setLoading] = useState(false);
  const [showPricing, setShowPricing] = useState(false);

  const loadKits = useCallback(async (filter: TabFilter) => {
    setLoading(true);
    try {
      const qs = filter === "ALL" ? "" : `?status=${filter}`;
      const res  = await fetch(`/api/admin/kits${qs}&limit=100`);
      const data: KitsResponse = await res.json();
      if (res.ok) {
        setKits(data.kits ?? []);
        setCounts(data.counts ?? {});
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadKits(tab); }, [tab, loadKits]);

  const totalKits = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin · Kit System"
        title="Kit Audit & Pricing"
        description="View all User Kit records across the network and manage kit prices."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setShowPricing((p) => !p)}>
              <Settings2 className="h-4 w-4" /> Kit Pricing
            </Button>
            <Button variant="ghost" onClick={() => loadKits(tab)}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      {showPricing && (
        <SectionCard
          icon={<Settings2 className="h-5 w-5 text-brand-500" />}
          title="Kit Pricing"
          description="Set the wallet cost for each kit type. Changes apply to future purchases only."
        >
          <PricingPanel />
        </SectionCard>
      )}

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        <div className="rounded-2xl border border-ink-100 bg-white p-3 col-span-3 sm:col-span-1">
          <p className="text-2xl font-bold text-ink-900">{totalKits}</p>
          <p className="text-xs text-ink-500">Total kits</p>
        </div>
        {(["AVAILABLE", "RESERVED", "ASSIGNED", "ACTIVE", "COOLING"] as KitStatus[]).map((s) => (
          <button
            key={s}
            onClick={() => setTab(s)}
            className={`rounded-2xl border p-3 text-left transition-colors ${tab === s ? "border-brand-400 bg-brand-50" : "border-ink-100 bg-white hover:bg-ink-50"}`}
          >
            <p className={`text-2xl font-bold ${tab === s ? "text-brand-700" : "text-ink-900"}`}>{counts[s] ?? 0}</p>
            <p className={`text-xs mt-0.5 ${tab === s ? "text-brand-600" : "text-ink-500"}`}>{STATUS_LABEL[s]}</p>
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-ink-100">
        {TABS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === value
                ? "border-brand-500 text-brand-700"
                : "border-transparent text-ink-500 hover:text-ink-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Kit list */}
      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-ink-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading kits…</span>
        </div>
      ) : kits.length === 0 ? (
        <div className="py-16 text-center">
          <Package className="h-10 w-10 mx-auto text-ink-200 mb-3" />
          <p className="text-sm text-ink-500">No kit records found for this filter.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {kits.map((kit) => <AdminKitRow key={kit.id} kit={kit} />)}
        </div>
      )}
    </div>
  );
}
