"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Package, PackagePlus, RefreshCw, Clock, CheckCircle2,
  Loader2, ChevronDown, ChevronUp, Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { SectionCard } from "@/components/dashboard/patterns";
import { useAuth } from "@/lib/useAuth";
import type { Role } from "@/lib/auth";

// ── Types ────────────────────────────────────────────────────────────────────

type KitStatus = "AVAILABLE" | "RESERVED" | "ASSIGNED" | "ACTIVE" | "COOLING";

type Kit = {
  id: string;
  kitType: string;
  userCode: string;
  status: KitStatus;
  purchaseAmount: number;
  purchasedAt: string;
  reservedAt: string | null;
  registeredAt: string | null;
  activatedAt: string | null;
  coolingEndsAt: string | null;
  invite?: { id: string; name: string | null; phone: string; email: string; role: string } | null;
  activatedFor?: { id: string; name: string; userCode: string | null; role: string } | null;
};

type KitCounts = Partial<Record<KitStatus, number>>;
type KitsResponse = { kits: Kit[]; total: number; counts: KitCounts };
type PriceResponse  = { kitType: string; label: string; childRole: string; price: number };

// ── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<KitStatus, string> = {
  AVAILABLE: "Available",
  RESERVED:  "Reserved",
  ASSIGNED:  "Pending Approval",
  ACTIVE:    "Active",
  COOLING:   "Cooling",
};

const STATUS_COLOR: Record<KitStatus, string> = {
  AVAILABLE: "text-emerald-700 bg-emerald-50 border-emerald-200",
  RESERVED:  "text-blue-700   bg-blue-50   border-blue-200",
  ASSIGNED:  "text-amber-700  bg-amber-50  border-amber-200",
  ACTIVE:    "text-brand-700  bg-brand-50  border-brand-200",
  COOLING:   "text-slate-600  bg-slate-100 border-slate-200",
};

function fmt(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function daysLeft(endsAt: string | null) {
  if (!endsAt) return null;
  const ms = new Date(endsAt).getTime() - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / 86_400_000);
}

// ── Buy modal ────────────────────────────────────────────────────────────────

function BuyModal({
  price, label, onClose, onSuccess,
}: {
  price: number; label: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [qty, setQty]       = useState(1);
  const [pin, setPin]       = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr]       = useState("");

  async function handleBuy() {
    if (!pin || pin.length < 4) { setErr("Enter your T-Pin"); return; }
    setLoading(true);
    setErr("");
    try {
      const res = await fetch("/api/network/kits", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-txn-pin": pin },
        body: JSON.stringify({ quantity: qty }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error ?? "Purchase failed"); return; }
      onSuccess();
    } catch {
      setErr("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold text-ink-900">Buy {label}s</h3>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-700">✕</button>
        </div>

        {err && (
          <div className="rounded-xl bg-rose-50 px-3 py-2.5 text-sm text-rose-700 border border-rose-200">
            {err}
          </div>
        )}

        <div>
          <label className="text-xs font-semibold text-ink-600 uppercase tracking-wide">
            Current price per kit
          </label>
          <p className="mt-1 text-2xl font-bold text-ink-900">
            ₹{price.toLocaleString("en-IN")}
          </p>
        </div>

        <div>
          <label className="text-xs font-semibold text-ink-600 uppercase tracking-wide mb-1 block">
            Quantity
          </label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="h-9 w-9 rounded-xl border border-ink-200 text-ink-600 hover:bg-ink-50 flex items-center justify-center font-bold"
            >
              −
            </button>
            <span className="w-10 text-center text-lg font-bold text-ink-900">{qty}</span>
            <button
              onClick={() => setQty((q) => Math.min(100, q + 1))}
              className="h-9 w-9 rounded-xl border border-ink-200 text-ink-600 hover:bg-ink-50 flex items-center justify-center font-bold"
            >
              +
            </button>
          </div>
        </div>

        <div className="rounded-xl bg-ink-50 px-4 py-3 space-y-1 text-sm">
          <div className="flex justify-between text-ink-600">
            <span>Total cost</span>
            <span className="font-bold text-ink-900">₹{(price * qty).toLocaleString("en-IN")}</span>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-ink-600 uppercase tracking-wide mb-1 block">
            Transaction PIN
          </label>
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            placeholder="Enter T-Pin"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            className="w-full rounded-xl border border-ink-200 px-3 py-2.5 text-sm text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={handleBuy} isLoading={loading} className="flex-1">
            <Wallet className="h-4 w-4" /> Confirm Purchase
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Kit row ───────────────────────────────────────────────────────────────────

function KitRow({ kit }: { kit: Kit }) {
  const [expanded, setExpanded] = useState(false);
  const days = daysLeft(kit.coolingEndsAt);

  return (
    <div className="rounded-2xl border border-ink-100 bg-white overflow-hidden">
      <button
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-ink-50 transition-colors text-left"
      >
        <Package className="h-5 w-5 shrink-0 text-brand-500" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-bold text-ink-900 text-sm">{kit.userCode}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLOR[kit.status]}`}>
              {STATUS_LABEL[kit.status]}
            </span>
          </div>
          <p className="text-xs text-ink-500 mt-0.5">
            Purchased {fmt(kit.purchasedAt)}
            {kit.status === "COOLING" && days !== null && (
              <> · <span className="text-amber-600 font-medium">Available in {days} day{days !== 1 ? "s" : ""}</span></>
            )}
            {kit.status === "ACTIVE" && kit.activatedFor && (
              <> · <span className="text-emerald-600">Activated for {kit.activatedFor.name}</span></>
            )}
            {(kit.status === "RESERVED" || kit.status === "ASSIGNED") && kit.invite?.name && (
              <> · <span className="text-blue-600">Reserved for {kit.invite.name}</span></>
            )}
          </p>
        </div>
        {expanded
          ? <ChevronUp   className="h-4 w-4 text-ink-400 shrink-0" />
          : <ChevronDown className="h-4 w-4 text-ink-400 shrink-0" />
        }
      </button>

      {expanded && (
        <div className="border-t border-ink-100 px-4 py-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs bg-ink-50/50">
          <div><span className="text-ink-500">Kit type</span><p className="font-medium text-ink-800">{kit.kitType.replace("_KIT", "-Kit")}</p></div>
          <div><span className="text-ink-500">Purchased</span><p className="font-medium text-ink-800">{fmt(kit.purchasedAt)}</p></div>
          {kit.reservedAt   && <div><span className="text-ink-500">Reserved</span><p className="font-medium text-ink-800">{fmt(kit.reservedAt)}</p></div>}
          {kit.registeredAt && <div><span className="text-ink-500">Child registered</span><p className="font-medium text-ink-800">{fmt(kit.registeredAt)}</p></div>}
          {kit.activatedAt  && <div><span className="text-ink-500">Activated</span><p className="font-medium text-ink-800">{fmt(kit.activatedAt)}</p></div>}
          {kit.coolingEndsAt && (
            <div className="col-span-2">
              <span className="text-ink-500">Cooling ends</span>
              <p className="font-medium text-amber-700">{fmt(kit.coolingEndsAt)} ({days} day{days !== 1 ? "s" : ""} left)</p>
            </div>
          )}
          {kit.invite && (
            <div className="col-span-2">
              <span className="text-ink-500">Invite linked to</span>
              <p className="font-medium text-ink-800">{kit.invite.name ?? "—"} · {kit.invite.phone} · {kit.invite.email}</p>
            </div>
          )}
          {kit.activatedFor && (
            <div className="col-span-2">
              <span className="text-ink-500">Activated for</span>
              <p className="font-medium text-ink-800">{kit.activatedFor.name} ({kit.activatedFor.userCode ?? "pending"})</p>
            </div>
          )}
          <div>
            <span className="text-ink-500">Purchase price</span>
            <p className="font-medium text-ink-800">₹{Number(kit.purchaseAmount).toLocaleString("en-IN")}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

type TabValue = "AVAILABLE" | "RESERVED" | "ASSIGNED" | "ACTIVE" | "COOLING";
const TABS: { value: TabValue; label: string }[] = [
  { value: "AVAILABLE", label: "Available" },
  { value: "RESERVED",  label: "Reserved" },
  { value: "ASSIGNED",  label: "Pending Approval" },
  { value: "ACTIVE",    label: "Active" },
  { value: "COOLING",   label: "Cooling" },
];

const KIT_REQUIRED_ROLES: Role[] = ["super-distributor", "master-distributor", "distributor"];

export default function KitManagerPage() {
  const { session } = useAuth();
  const role: Role  = session?.role ?? "retailer";

  const [tab, setTab]           = useState<TabValue>("AVAILABLE");
  const [kits, setKits]         = useState<Kit[]>([]);
  const [counts, setCounts]     = useState<KitCounts>({});
  const [loading, setLoading]   = useState(false);
  const [kitPrice, setKitPrice] = useState<PriceResponse | null>(null);
  const [showBuy, setShowBuy]   = useState(false);
  const [buySuccess, setBuySuccess] = useState(false);

  const isAllowed = KIT_REQUIRED_ROLES.includes(role);

  const loadKits = useCallback(async (status: TabValue) => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/network/kits?status=${status}&limit=50`);
      const data: KitsResponse = await res.json();
      if (res.ok) {
        setKits(data.kits ?? []);
        setCounts(data.counts ?? {});
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPrice = useCallback(async () => {
    const res  = await fetch("/api/network/kits/price");
    const data = await res.json();
    if (res.ok) setKitPrice(data);
  }, []);

  useEffect(() => {
    if (!isAllowed) return;
    loadKits(tab);
    loadPrice();
  }, [isAllowed, tab, loadKits, loadPrice]);

  if (!isAllowed) {
    return (
      <div className="mx-auto max-w-xl pt-16 text-center">
        <p className="text-ink-500">Kit Manager is only available for SD / MD / DT roles.</p>
      </div>
    );
  }

  const kitLabel = kitPrice?.label ?? "Kit";

  function handleBuySuccess() {
    setShowBuy(false);
    setBuySuccess(true);
    loadKits(tab);
    setTimeout(() => setBuySuccess(false), 4000);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Network · Kits"
        title="Kit Manager"
        description={`Purchase and manage ${kitLabel}s for onboarding your network members.`}
        actions={
          <Button onClick={() => setShowBuy(true)}>
            <PackagePlus className="h-4 w-4" />
            Buy {kitLabel}s
          </Button>
        }
      />

      {buySuccess && (
        <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Kits purchased successfully! They are now available in your kit inventory.
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {TABS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={`rounded-2xl border p-3 text-left transition-colors ${
              tab === value
                ? "border-brand-400 bg-brand-50"
                : "border-ink-100 bg-white hover:bg-ink-50"
            }`}
          >
            <p className={`text-2xl font-bold ${tab === value ? "text-brand-700" : "text-ink-900"}`}>
              {counts[value] ?? 0}
            </p>
            <p className={`text-xs mt-0.5 ${tab === value ? "text-brand-600" : "text-ink-500"}`}>{label}</p>
          </button>
        ))}
      </div>

      {/* Kit list */}
      <SectionCard
        icon={
          tab === "COOLING"
            ? <Clock className="h-5 w-5 text-slate-500" />
            : <Package className="h-5 w-5 text-brand-500" />
        }
        title={TABS.find((t) => t.value === tab)?.label ?? tab}
        actions={
          <button onClick={() => loadKits(tab)} className="text-ink-400 hover:text-brand-600">
            <RefreshCw className="h-4 w-4" />
          </button>
        }
      >
        {loading ? (
          <div className="flex items-center justify-center py-12 gap-2 text-ink-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading kits…</span>
          </div>
        ) : kits.length === 0 ? (
          <div className="py-12 text-center">
            <Package className="h-10 w-10 mx-auto text-ink-200 mb-3" />
            <p className="text-sm text-ink-500">
              {tab === "AVAILABLE"
                ? `No available kits. Purchase ${kitLabel}s to start onboarding.`
                : `No kits in ${STATUS_LABEL[tab as KitStatus]?.toLowerCase()} status.`}
            </p>
            {tab === "AVAILABLE" && (
              <Button variant="outline" size="sm" className="mt-4" onClick={() => setShowBuy(true)}>
                <PackagePlus className="h-4 w-4" />
                Buy {kitLabel}s
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {kits.map((kit) => <KitRow key={kit.id} kit={kit} />)}
          </div>
        )}
      </SectionCard>

      {showBuy && kitPrice && (
        <BuyModal
          price={kitPrice.price}
          label={kitLabel}
          onClose={() => setShowBuy(false)}
          onSuccess={handleBuySuccess}
        />
      )}
    </div>
  );
}
