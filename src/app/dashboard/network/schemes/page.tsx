"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  RefreshCw,
  Loader2,
  Users,
  X,
  Check,
  Layers,
  ChevronDown,
  Search,
} from "lucide-react";
import { Stack } from "@phosphor-icons/react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input, Select } from "@/components/ui/Input";
import { EmptyState, FilterBar, StatusChip } from "@/components/dashboard/patterns";
import { useAuth } from "@/lib/useAuth";

// ─── Types ───────────────────────────────────────────────────────────────────

type Scheme = {
  id: string;
  name: string;
  description: string | null;
  slabCount: number;
  mdrSlabCount: number;
};

type Child = {
  id: string;
  userCode: string | null;
  name: string;
  shop: string;
  role: string;
  city: string;
  state: string;
  status: string;
  schemeId: string | null;
  schemeName: string | null;
};

// ─── Role metadata ────────────────────────────────────────────────────────────

/** Maps the caller's display role to the child tier they assign schemes to. */
const CHILD_META: Record<
  string,
  { singular: string; plural: string; header: string }
> = {
  "super-distributor": {
    singular: "master distributor",
    plural: "master distributors",
    header: "Master Distributor",
  },
  "master-distributor": {
    singular: "distributor",
    plural: "distributors",
    header: "Distributor",
  },
  distributor: {
    singular: "retailer",
    plural: "retailers",
    header: "Retailer",
  },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NetworkSchemesPage() {
  const { session } = useAuth();
  const callerRole = session?.role ?? "";
  const meta = CHILD_META[callerRole];

  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  // Assignment modal state
  const [assignTarget, setAssignTarget] = useState<Child | null>(null);
  const [assignSchemeId, setAssignSchemeId] = useState<string>("");
  const [assigning, setAssigning] = useState(false);

  // Bulk assignment
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkSchemeId, setBulkSchemeId] = useState<string>("");
  const [bulkAssigning, setBulkAssigning] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [schemesRes, childrenRes] = await Promise.all([
        fetch("/api/network/schemes"),
        fetch("/api/network?pageSize=200"),
      ]);
      if (schemesRes.ok) {
        const d = await schemesRes.json();
        setSchemes(d.schemes ?? []);
      }
      if (childrenRes.ok) {
        const d = await childrenRes.json();
        setChildren(d.users ?? []);
      }
    } catch {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // ─── Filtered children ────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return children;
    return children.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        c.shop.toLowerCase().includes(term) ||
        (c.userCode ?? "").toLowerCase().includes(term) ||
        c.city.toLowerCase().includes(term)
    );
  }, [children, q]);

  // ─── Single assign ────────────────────────────────────────────────────────

  async function assignScheme(childId: string, schemeId: string | null) {
    const res = await fetch("/api/network/scheme", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schemeId, childIds: [childId] }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(typeof data?.error === "string" ? data.error : "Failed");
    return data;
  }

  async function handleAssign() {
    if (!assignTarget) return;
    setAssigning(true);
    try {
      await assignScheme(
        assignTarget.id,
        assignSchemeId || null
      );
      toast.success(
        assignSchemeId
          ? `Scheme assigned to ${assignTarget.name}.`
          : `Scheme removed from ${assignTarget.name}.`
      );
      setAssignTarget(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Assignment failed");
    } finally {
      setAssigning(false);
    }
  }

  // ─── Bulk assign ──────────────────────────────────────────────────────────

  async function handleBulkAssign() {
    if (selected.size === 0 || !bulkSchemeId) return;
    setBulkAssigning(true);
    try {
      const res = await fetch("/api/network/scheme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schemeId: bulkSchemeId,
          childIds: [...selected],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data?.error === "string" ? data.error : "Failed");
      toast.success(`Scheme assigned to ${data.updated} user(s).`);
      setSelected(new Set());
      setBulkSchemeId("");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Bulk assignment failed");
    } finally {
      setBulkAssigning(false);
    }
  }

  // ─── Select helpers ───────────────────────────────────────────────────────

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allSelected =
    filtered.length > 0 && filtered.every((c) => selected.has(c.id));
  const toggleAll = () =>
    setSelected(
      allSelected ? new Set() : new Set(filtered.map((c) => c.id))
    );

  // ─── Guard: wrong role ────────────────────────────────────────────────────

  if (!meta) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Network · Schemes"
          title="Scheme assignment"
          description="This page is not available for your role."
        />
        <EmptyState
          bordered
          tone="amber"
          icon={Layers}
          title="Not available"
          description="Scheme assignment is only available for Super Distributors, Master Distributors, and Distributors."
        />
      </div>
    );
  }

  const schemeOptions = schemes.map((s) => (
    <option key={s.id} value={s.id}>
      {s.name}
      {s.slabCount > 0 ? ` (${s.slabCount} slabs)` : ""}
    </option>
  ));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Network · Schemes"
        title={`Assign schemes to your ${meta.plural}`}
        description={`Select a scheme and assign it to your direct ${meta.singular} users. Each ${meta.singular} can have only one active scheme at a time.`}
        actions={
          <Button variant="outline" onClick={load} disabled={loading} aria-label="Refresh">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      {/* Bulk assignment bar */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-brand-50 px-4 py-3 ring-1 ring-inset ring-brand-200">
          <span className="text-sm font-semibold text-brand-800">
            {selected.size} user{selected.size === 1 ? "" : "s"} selected
          </span>
          <Select
            className="h-9 min-w-[200px] flex-1"
            value={bulkSchemeId}
            onChange={(e) => setBulkSchemeId(e.target.value)}
            aria-label="Select scheme for bulk assignment"
          >
            <option value="">Select a scheme…</option>
            {schemeOptions}
          </Select>
          <Button
            size="sm"
            onClick={handleBulkAssign}
            disabled={!bulkSchemeId || bulkAssigning}
          >
            {bulkAssigning ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            Assign to {selected.size}
          </Button>
          <button
            onClick={() => setSelected(new Set())}
            className="ml-auto rounded-lg p-1 text-brand-600 hover:bg-brand-100"
            title="Clear selection"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <FilterBar
        title={
          <span className="inline-flex items-center gap-2">
            <Users className="h-4 w-4 text-brand-600" />
            {meta.plural.replace(/\b\w/g, (c) => c.toUpperCase())}
          </span>
        }
        count={loading ? undefined : filtered.length}
      >
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Search ${meta.plural}…`}
            className="pl-10"
          />
        </div>
        <button
          onClick={toggleAll}
          className="rounded-xl border border-ink-200 bg-white px-3 py-2 text-xs font-medium text-ink-600 hover:bg-ink-50 transition-colors"
          title={allSelected ? "Deselect all" : "Select all visible"}
        >
          {allSelected ? "Deselect all" : "Select all"}
        </button>
      </FilterBar>

      {/* Children table */}
      <div className="overflow-hidden rounded-3xl bg-white ring-1 ring-ink-100 shadow-sm">
        {loading && children.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-sm text-ink-500">
            <Loader2 className="mr-2 h-4 w-4 animate-spin text-brand-600" />
            Loading {meta.plural}…
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            bordered={false}
            icon={Stack}
            title={`No ${meta.plural} found`}
            description={
              q
                ? "Try a different search term."
                : `Onboard your first ${meta.singular} to get started.`
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-ink-50/60 text-left text-[11px] uppercase tracking-[0.14em] text-ink-500">
                <tr>
                  <th className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
                      title={allSelected ? "Deselect all" : "Select all"}
                    />
                  </th>
                  <th className="px-4 py-3 font-semibold">{meta.header}</th>
                  <th className="px-4 py-3 font-semibold">Location</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Current Scheme</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100 text-ink-800">
                {filtered.map((child) => (
                  <ChildRow
                    key={child.id}
                    child={child}
                    schemes={schemes}
                    selected={selected.has(child.id)}
                    onToggle={() => toggleSelect(child.id)}
                    onAssignClick={() => {
                      setAssignTarget(child);
                      setAssignSchemeId(child.schemeId ?? "");
                    }}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Single-user assign modal */}
      {assignTarget && (
        <AssignModal
          child={assignTarget}
          schemes={schemes}
          schemeId={assignSchemeId}
          onSchemeChange={setAssignSchemeId}
          assigning={assigning}
          onClose={() => setAssignTarget(null)}
          onConfirm={handleAssign}
        />
      )}
    </div>
  );
}

// ─── Child row ────────────────────────────────────────────────────────────────

function ChildRow({
  child,
  schemes,
  selected,
  onToggle,
  onAssignClick,
}: {
  child: Child;
  schemes: Scheme[];
  selected: boolean;
  onToggle: () => void;
  onAssignClick: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr
        className={`transition-colors ${selected ? "bg-brand-50/50" : "hover:bg-ink-50/30"}`}
      >
        <td className="px-4 py-3">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggle}
            className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
          />
        </td>
        <td className="px-4 py-3">
          <div className="font-semibold text-ink-900">{child.name}</div>
          <div className="text-xs text-ink-500">
            {child.shop !== "—" ? child.shop : child.userCode ?? "—"}
          </div>
        </td>
        <td className="px-4 py-3 text-ink-600">
          {child.city}, {child.state}
        </td>
        <td className="px-4 py-3">
          <StatusChip status={child.status} label={child.status} size="sm" />
        </td>
        <td className="px-4 py-3">
          {child.schemeName ? (
            <Badge variant="brand">{child.schemeName}</Badge>
          ) : (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-200">
              No scheme
            </span>
          )}
        </td>
        <td className="px-4 py-3 text-right">
          <div className="flex items-center justify-end gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={onAssignClick}
            >
              <Layers className="h-3.5 w-3.5" />
              {child.schemeId ? "Change" : "Assign"}
            </Button>
            {schemes.length > 0 && (
              <button
                onClick={() => setExpanded((v) => !v)}
                className="grid h-8 w-8 place-items-center rounded-xl text-ink-500 ring-1 ring-inset ring-ink-200 hover:bg-ink-50 transition-colors"
                title="Quick assign"
                aria-label="Quick assign"
              >
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
                />
              </button>
            )}
          </div>
        </td>
      </tr>
      {expanded && (
        <QuickAssignRow child={child} schemes={schemes} onDone={() => setExpanded(false)} />
      )}
    </>
  );
}

// ─── Quick-assign inline row ──────────────────────────────────────────────────

function QuickAssignRow({
  child,
  schemes,
  onDone,
}: {
  child: Child;
  schemes: Scheme[];
  onDone: () => void;
}) {
  const [schemeId, setSchemeId] = useState(child.schemeId ?? "");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      const res = await fetch("/api/network/scheme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schemeId: schemeId || null,
          childIds: [child.id],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data?.error === "string" ? data.error : "Failed");
      toast.success(schemeId ? "Scheme assigned." : "Scheme removed.");
      onDone();
      // Refresh parent via full page reload is avoided — parent reloads on its own.
      // A full parent re-render would need a lift-up. We refresh the page instead.
      window.location.reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <tr className="bg-brand-50/30">
      <td />
      <td colSpan={4} className="px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={schemeId}
            onChange={(e) => setSchemeId(e.target.value)}
            className="h-9 min-w-[200px]"
          >
            <option value="">Remove scheme</option>
            {schemes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
          <Button size="sm" onClick={submit} disabled={busy}>
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            Apply
          </Button>
        </div>
      </td>
      <td />
    </tr>
  );
}

// ─── Assign modal ─────────────────────────────────────────────────────────────

function AssignModal({
  child,
  schemes,
  schemeId,
  onSchemeChange,
  assigning,
  onClose,
  onConfirm,
}: {
  child: Child;
  schemes: Scheme[];
  schemeId: string;
  onSchemeChange: (id: string) => void;
  assigning: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const current = schemes.find((s) => s.id === child.schemeId);
  const selected = schemes.find((s) => s.id === schemeId);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-ink-900/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-3xl bg-white ring-1 ring-ink-100 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
          <div>
            <h3 className="font-display text-base font-semibold text-ink-900">
              Assign scheme
            </h3>
            <p className="text-xs text-ink-500">
              {child.name} ·{" "}
              <span className="font-medium text-brand-600">
                {child.userCode ?? child.id.slice(0, 8)}
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-ink-500 hover:bg-ink-50"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 p-5">
          {current && (
            <div className="rounded-xl bg-ink-50 px-3 py-2 text-sm">
              <span className="text-ink-500">Current scheme: </span>
              <span className="font-semibold text-ink-900">{current.name}</span>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink-500">
              New scheme
            </label>
            <Select
              value={schemeId}
              onChange={(e) => onSchemeChange(e.target.value)}
              className="w-full"
            >
              <option value="">Remove scheme (unassign)</option>
              {schemes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.slabCount > 0 ? ` — ${s.slabCount} slabs` : ""}
                </option>
              ))}
            </Select>
          </div>

          {selected && selected.description && (
            <p className="rounded-xl bg-brand-50 px-3 py-2 text-xs text-brand-700">
              {selected.description}
            </p>
          )}

          {!schemeId && (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700 ring-1 ring-inset ring-amber-200">
              Removing the scheme will block this user from processing
              transactions (unless a platform default is configured).
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-ink-100 px-5 py-4">
          <Button variant="outline" onClick={onClose} disabled={assigning}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={assigning}>
            {assigning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            {schemeId ? "Assign scheme" : "Remove scheme"}
          </Button>
        </div>
      </div>
    </div>
  );
}
