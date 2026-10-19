"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import {
  RefreshCw,
  Loader2,
  ChevronRight,
  ChevronDown,
  Wallet,
  TrendingUp,
  Users,
  Activity,
  ArrowUpRight,
  Fingerprint,
  Smartphone,
  Send,
  Receipt,
  Landmark,
  QrCode,
  Monitor,
  Plane,
  CircleDollarSign,
  BookOpenCheck,
  ExternalLink,
  Wifi,
  WifiOff,
  Pause,
  Play,
  Search,
} from "lucide-react";
import {
  TreeStructure,
  Pulse,
  ChartBar,
  Notebook,
  WarningCircle,
  UsersThree,
  ArrowCircleUp,
  ArrowCircleDown,
} from "@phosphor-icons/react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PillTabs, type PillTab } from "@/components/dashboard/patterns/PillTabs";
import { StatCard } from "@/components/dashboard/StatCard";
import { Stagger, StaggerItem } from "@/components/dashboard/patterns";
import { EmptyState } from "@/components/dashboard/patterns/EmptyState";
import { SectionCard } from "@/components/dashboard/patterns/SectionCard";
import { IconTile } from "@/components/ui/Icon";
import { StatusChip } from "@/components/dashboard/patterns/StatusChip";
import { formatINR, formatNumber } from "@/lib/utils";
import { useAuth } from "@/lib/useAuth";
import type { LucideIcon } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Shared types
// ─────────────────────────────────────────────────────────────────────────────

type HierarchyNode = {
  id: string;
  parentId: string;
  name: string;
  role: string;       // "master-distributor" | "distributor" | "retailer"
  roleAbbr: string;   // "MD" | "DT" | "RT"
  roleRaw: string;    // "MASTER_DISTRIBUTOR" | etc.
  status: string;
  userCode: string | null;
  shop: string;
  city: string;
  state: string;
  walletBalance: number;
  volumeToday: number;
  txnToday: number;
  successToday: number;
  commissionToday: number;
};

type LiveEvent = {
  id: string;
  member: {
    name: string;
    roleAbbr: string;
    city: string;
    shop: string | null;
    userCode: string | null;
  };
  service: string;
  serviceLabel: string;
  amount: number;
  commission: number;
  status: "Success" | "Pending" | "Failed";
  createdAt: string;
};

type LedgerEntry = {
  id: string;
  createdAt: string;
  user: {
    name: string;
    userCode: string | null;
    shop: string | null;
    roleAbbr: string;
    roleRaw: string;
  } | null;
  walletType: string;
  direction: "CREDIT" | "DEBIT";
  reason: string;
  amount: number;
  balanceAfter: number | null;
  note: string | null;
  refType: string | null;
  refId: string | null;
};

type Tab = "tree" | "live" | "analytics" | "ledger";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const ROLE_COLORS: Record<string, { bg: string; text: string; ring: string; dot: string }> = {
  "super-distributor": { bg: "bg-violet-50",  text: "text-violet-700", ring: "ring-violet-200", dot: "bg-violet-500" },
  "master-distributor": { bg: "bg-brand-50",  text: "text-brand-700",  ring: "ring-brand-200",  dot: "bg-brand-500"  },
  distributor:          { bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-200", dot: "bg-emerald-500" },
  retailer:             { bg: "bg-amber-50",  text: "text-amber-700",  ring: "ring-amber-200",  dot: "bg-amber-500"  },
};

const LEVEL_GRADIENT: Record<string, string> = {
  "master-distributor": "from-brand-600 to-violet-600",
  distributor:          "from-emerald-600 to-teal-600",
  retailer:             "from-amber-500 to-orange-500",
};

const LEVEL_LABEL: Record<string, string> = {
  "master-distributor": "Master Distributors",
  distributor:          "Distributors",
  retailer:             "Retailers",
};

/** Returns the role levels that the current caller can see in the hierarchy */
function visibleLevels(callerRole: string): string[] {
  if (callerRole === "super-distributor") return ["master-distributor", "distributor", "retailer"];
  if (callerRole === "master-distributor") return ["distributor", "retailer"];
  return ["retailer"]; // distributor
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

const SERVICE_ICON: Record<string, LucideIcon> = {
  AEPS: Fingerprint,
  DMT: Send,
  RECHARGE: Smartphone,
  BILL: Receipt,
  PAYOUT: Landmark,
  UPI: QrCode,
  POS: Monitor,
  TRAVEL: Plane,
  PAN: CircleDollarSign,
};

function pickServiceIcon(service: string): LucideIcon {
  for (const [prefix, Icon] of Object.entries(SERVICE_ICON)) {
    if (service.startsWith(prefix)) return Icon;
  }
  return CircleDollarSign;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

const TABS: PillTab<Tab>[] = [
  { value: "tree",      label: "Hierarchy Tree",   icon: TreeStructure as unknown as LucideIcon },
  { value: "live",      label: "Live Feed",         icon: Pulse as unknown as LucideIcon },
  { value: "analytics", label: "Level Analytics",   icon: ChartBar as unknown as LucideIcon },
  { value: "ledger",    label: "Network Ledger",    icon: Notebook as unknown as LucideIcon },
];

export default function NetworkCommandCenterPage() {
  const { session } = useAuth();
  const [tab, setTab] = useState<Tab>("tree");

  const callerRole = session?.role ?? "";
  // Map DB role names to slug form
  const callerSlug =
    callerRole === "super-distributor" || callerRole === "SUPER_DISTRIBUTOR"
      ? "super-distributor"
      : callerRole === "master-distributor" || callerRole === "MASTER_DISTRIBUTOR"
      ? "master-distributor"
      : "distributor";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Network · Command Center"
        title="Network HQ"
        description="Real-time visibility into your entire downline — transactions, ledger flows, and business health across every level."
      />

      <PillTabs<Tab>
        tabs={TABS}
        value={tab}
        onChange={setTab}
        aria-label="Command center sections"
      />

      {tab === "tree"      && <HierarchyTreeTab  callerSlug={callerSlug} />}
      {tab === "live"      && <LiveFeedTab />}
      {tab === "analytics" && <LevelAnalyticsTab callerSlug={callerSlug} />}
      {tab === "ledger"    && <NetworkLedgerTab  callerSlug={callerSlug} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 1 — Hierarchy Tree
// ─────────────────────────────────────────────────────────────────────────────

function HierarchyTreeTab({ callerSlug }: { callerSlug: string }) {
  const [nodes, setNodes] = useState<HierarchyNode[]>([]);
  const [callerId, setCallerId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/network/hierarchy");
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Could not load hierarchy"); return; }
      setNodes(data.nodes ?? []);
      setCallerId(data.callerId ?? "");
      // Auto-expand direct children (first level)
      const directChildren = (data.nodes as HierarchyNode[]).filter(
        (n) => n.parentId === data.callerId
      );
      setExpandedIds(new Set(directChildren.map((n) => n.id)));
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Build adjacency map: parentId → children[]
  const childrenOf = useMemo(() => {
    const map = new Map<string, HierarchyNode[]>();
    for (const n of nodes) {
      const list = map.get(n.parentId) ?? [];
      list.push(n);
      map.set(n.parentId, list);
    }
    return map;
  }, [nodes]);

  const filteredNodes = useMemo(() => {
    if (!search.trim()) return nodes;
    const q = search.toLowerCase();
    return nodes.filter(
      (n) =>
        n.name.toLowerCase().includes(q) ||
        (n.userCode ?? "").toLowerCase().includes(q) ||
        n.city.toLowerCase().includes(q) ||
        n.shop.toLowerCase().includes(q)
    );
  }, [nodes, search]);

  // When searching, show a flat filtered list instead of tree
  const isSearching = search.trim().length > 0;
  const rootNodes = childrenOf.get(callerId) ?? [];

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => setExpandedIds(new Set(nodes.map((n) => n.id)));
  const collapseAll = () => {
    const directChildren = nodes.filter((n) => n.parentId === callerId);
    setExpandedIds(new Set(directChildren.map((n) => n.id)));
  };

  const totalNodes = nodes.length;
  const activeNodes = nodes.filter((n) => n.txnToday > 0).length;

  if (loading) {
    return (
      <SectionCard className="grid place-items-center py-16">
        <span className="inline-flex items-center gap-2 text-sm text-ink-500">
          <Loader2 className="h-5 w-5 animate-spin text-brand-600" /> Building your network tree…
        </span>
      </SectionCard>
    );
  }

  if (error) {
    return (
      <EmptyState
        bordered
        tone="coral"
        icon={WarningCircle}
        title="Couldn't load hierarchy"
        description={error}
        action={<Button variant="outline" onClick={load}>Try again</Button>}
      />
    );
  }

  if (nodes.length === 0) {
    return (
      <EmptyState
        bordered
        icon={UsersThree}
        tone="royal"
        title="No network members yet"
        description="Onboard your first member and they'll appear here."
        action={
          <Link href="/dashboard/network/onboard">
            <Button>Invite now</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, code, city…"
            className="h-10 w-full rounded-2xl bg-white pl-9 pr-4 text-sm text-ink-900 shadow-sm ring-1 ring-ink-100 outline-none transition focus:ring-2 focus:ring-brand-100"
          />
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="default">{totalNodes} members</Badge>
          {activeNodes > 0 && (
            <Badge variant="success" dot>{activeNodes} active today</Badge>
          )}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <Button variant="outline" size="sm" onClick={expandAll}>Expand all</Button>
          <Button variant="outline" size="sm" onClick={collapseAll}>Collapse</Button>
          <Button variant="outline" size="sm" onClick={load} disabled={loading} aria-label="Refresh">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Tree / flat list */}
      <div className="rounded-3xl border border-ink-100 bg-white shadow-sm overflow-hidden">
        {isSearching ? (
          // Flat filtered view
          <div>
            <div className="border-b border-ink-100 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-ink-400">
              Search results — {filteredNodes.length} match{filteredNodes.length === 1 ? "" : "es"}
            </div>
            {filteredNodes.length === 0 ? (
              <div className="py-12 text-center text-sm text-ink-400">No members match "{search}"</div>
            ) : (
              <ul className="divide-y divide-ink-50">
                {filteredNodes.map((node) => (
                  <TreeNodeRow
                    key={node.id}
                    node={node}
                    depth={0}
                    hasChildren={false}
                    expanded={false}
                    onToggle={() => {}}
                    callerSlug={callerSlug}
                  />
                ))}
              </ul>
            )}
          </div>
        ) : (
          // Recursive tree view
          <ul className="divide-y divide-ink-50">
            {rootNodes.length === 0 ? (
              <li className="py-12 text-center text-sm text-ink-400">Your network is empty.</li>
            ) : (
              rootNodes.map((node) => (
                <TreeNodeRecursive
                  key={node.id}
                  node={node}
                  depth={0}
                  childrenOf={childrenOf}
                  expandedIds={expandedIds}
                  onToggle={toggleExpand}
                  callerSlug={callerSlug}
                />
              ))
            )}
          </ul>
        )}
      </div>
    </div>
  );
}

function TreeNodeRecursive({
  node,
  depth,
  childrenOf,
  expandedIds,
  onToggle,
  callerSlug,
}: {
  node: HierarchyNode;
  depth: number;
  childrenOf: Map<string, HierarchyNode[]>;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  callerSlug: string;
}) {
  const children = childrenOf.get(node.id) ?? [];
  const hasChildren = children.length > 0;
  const expanded = expandedIds.has(node.id);

  return (
    <>
      <TreeNodeRow
        node={node}
        depth={depth}
        hasChildren={hasChildren}
        expanded={expanded}
        onToggle={onToggle}
        callerSlug={callerSlug}
        childCount={children.length}
      />
      {expanded && hasChildren && children.map((child) => (
        <TreeNodeRecursive
          key={child.id}
          node={child}
          depth={depth + 1}
          childrenOf={childrenOf}
          expandedIds={expandedIds}
          onToggle={onToggle}
          callerSlug={callerSlug}
        />
      ))}
    </>
  );
}

function TreeNodeRow({
  node,
  depth,
  hasChildren,
  expanded,
  onToggle,
  callerSlug: _callerSlug,
  childCount = 0,
}: {
  node: HierarchyNode;
  depth: number;
  hasChildren: boolean;
  expanded: boolean;
  onToggle: (id: string) => void;
  callerSlug: string;
  childCount?: number;
}) {
  const colors = ROLE_COLORS[node.role] ?? ROLE_COLORS.retailer;
  const isActive = node.txnToday > 0;

  return (
    <li
      className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-ink-50/50 md:px-6"
      style={{ paddingLeft: `${1.25 + depth * 1.5}rem` }}
    >
      {/* Expand/collapse icon */}
      <button
        onClick={() => hasChildren && onToggle(node.id)}
        disabled={!hasChildren}
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg transition-colors ${
          hasChildren
            ? "text-ink-400 hover:bg-ink-100 hover:text-ink-700 cursor-pointer"
            : "text-transparent cursor-default"
        }`}
        aria-label={expanded ? "Collapse" : "Expand"}
      >
        {hasChildren && (
          expanded
            ? <ChevronDown className="h-4 w-4" />
            : <ChevronRight className="h-4 w-4" />
        )}
      </button>

      {/* Live pulse dot */}
      <span className="relative shrink-0">
        <span
          className={`block h-2.5 w-2.5 rounded-full ${isActive ? colors.dot : "bg-ink-200"}`}
        />
        {isActive && (
          <span
            className={`absolute inset-0 -z-10 animate-ping rounded-full opacity-60 ${colors.dot}`}
          />
        )}
      </span>

      {/* Role badge */}
      <span
        className={`shrink-0 rounded-lg px-2 py-0.5 text-[11px] font-bold ring-1 ring-inset ${colors.bg} ${colors.text} ${colors.ring}`}
      >
        {node.roleAbbr}
      </span>

      {/* Name + info */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/dashboard/network/${node.id}`}
            className="text-sm font-semibold text-ink-900 hover:text-brand-700 hover:underline underline-offset-4 transition-colors"
          >
            {node.name}
          </Link>
          {node.userCode && (
            <span className="font-mono text-[10px] font-semibold text-brand-600">{node.userCode}</span>
          )}
          <StatusChip status={node.status} label={node.status} size="sm" />
          {hasChildren && (
            <span className="text-[10px] font-semibold text-ink-400">{childCount} direct</span>
          )}
        </div>
        <p className="text-xs text-ink-500 truncate">{node.shop} · {node.city}</p>
      </div>

      {/* Stats */}
      <div className="hidden lg:flex items-center gap-6 shrink-0 text-right">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">Wallet</p>
          <p className="text-sm font-semibold tabular-nums text-ink-900">{formatINR(node.walletBalance)}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">Today vol.</p>
          <p className={`text-sm font-semibold tabular-nums ${node.volumeToday > 0 ? "text-emerald-700" : "text-ink-400"}`}>
            {node.volumeToday > 0 ? formatINR(node.volumeToday) : "—"}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">Txns</p>
          <p className={`text-sm font-bold tabular-nums ${node.txnToday > 0 ? "text-brand-700" : "text-ink-400"}`}>
            {node.txnToday > 0 ? node.txnToday : "—"}
          </p>
        </div>
        <Link
          href={`/dashboard/network/${node.id}`}
          className="inline-flex items-center gap-1 text-ink-300 hover:text-brand-600 transition-colors"
          aria-label={`Open ${node.name}`}
        >
          <ExternalLink className="h-4 w-4" />
        </Link>
      </div>
    </li>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 2 — Live Feed
// ─────────────────────────────────────────────────────────────────────────────

const MAX_FEED_ENTRIES = 60;

function LiveFeedTab() {
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [status, setStatus] = useState<"connecting" | "live" | "paused" | "error">("connecting");
  const [paused, setPaused] = useState(false);
  const esRef = useRef<EventSource | null>(null);
  const pausedRef = useRef(false);
  const queueRef = useRef<LiveEvent[]>([]);

  const connect = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
    }
    setStatus("connecting");
    const es = new EventSource("/api/network/live-stream");
    esRef.current = es;

    es.onopen = () => setStatus(pausedRef.current ? "paused" : "live");

    es.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data) as { events?: LiveEvent[] };
        const incoming = payload.events ?? [];
        if (incoming.length === 0) return;

        if (pausedRef.current) {
          // Buffer while paused
          queueRef.current = [...incoming, ...queueRef.current];
          return;
        }

        setEvents((prev) => {
          const next = [...incoming.reverse(), ...prev].slice(0, MAX_FEED_ENTRIES);
          return next;
        });
      } catch {
        // ignore parse errors
      }
    };

    es.addEventListener("fatal", (e) => {
      try {
        const d = JSON.parse((e as MessageEvent).data) as { error?: string };
        console.warn("[live-stream] fatal:", d.error);
      } catch { /* */ }
      setStatus("error");
      es.close();
    });

    es.onerror = () => {
      setStatus("connecting");
      // EventSource auto-reconnects; we just update the status indicator
    };
  }, []);

  useEffect(() => {
    connect();
    return () => { esRef.current?.close(); };
  }, [connect]);

  const togglePause = () => {
    setPaused((prev) => {
      const next = !prev;
      pausedRef.current = next;
      if (!next) {
        // Resume — flush the queue
        const queued = queueRef.current;
        queueRef.current = [];
        if (queued.length > 0) {
          setEvents((curr) => [...queued, ...curr].slice(0, MAX_FEED_ENTRIES));
        }
        setStatus("live");
      } else {
        setStatus("paused");
      }
      return next;
    });
  };

  const statusColor =
    status === "live" ? "text-emerald-600" :
    status === "paused" ? "text-amber-600" :
    status === "error" ? "text-rose-600" :
    "text-ink-400";

  const statusLabel =
    status === "live" ? "Live" :
    status === "paused" ? "Paused" :
    status === "error" ? "Error" :
    "Connecting…";

  return (
    <div className="space-y-4">
      {/* Feed header controls */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span
            className={`block h-2.5 w-2.5 rounded-full ${
              status === "live" ? "animate-pulse bg-emerald-500" :
              status === "paused" ? "bg-amber-400" :
              status === "error" ? "bg-rose-500" :
              "animate-pulse bg-ink-300"
            }`}
          />
          <span className={`text-sm font-semibold ${statusColor}`}>{statusLabel}</span>
        </div>
        {events.length > 0 && (
          <Badge variant="default">{events.length} events</Badge>
        )}
        {queueRef.current.length > 0 && (
          <Badge variant="warning">{queueRef.current.length} queued</Badge>
        )}
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={togglePause}
            aria-label={paused ? "Resume feed" : "Pause feed"}
          >
            {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            {paused ? "Resume" : "Pause"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEvents([])}
            aria-label="Clear feed"
          >
            Clear
          </Button>
          {status === "error" && (
            <Button variant="outline" size="sm" onClick={connect}>
              <Wifi className="h-4 w-4" /> Reconnect
            </Button>
          )}
        </div>
      </div>

      {/* Feed list */}
      <div className="rounded-3xl border border-ink-100 bg-white shadow-sm overflow-hidden">
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20">
            {status === "connecting" ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-brand-400" />
                <p className="text-sm font-medium text-ink-500">Connecting to your network stream…</p>
              </>
            ) : status === "error" ? (
              <>
                <WifiOff className="h-8 w-8 text-rose-400" />
                <p className="text-sm font-medium text-ink-500">Stream disconnected. Click Reconnect to try again.</p>
              </>
            ) : (
              <>
                <Pulse className="h-8 w-8 text-ink-300" weight="thin" />
                <p className="text-sm font-medium text-ink-500">Waiting for transactions across your network…</p>
                <p className="text-xs text-ink-400">New transactions will appear here in real-time.</p>
              </>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-ink-50">
            {events.map((ev) => (
              <LiveEventRow key={ev.id} event={ev} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function LiveEventRow({ event }: { event: LiveEvent }) {
  const Icon = pickServiceIcon(event.service);
  const colors = ROLE_COLORS[
    event.member.roleAbbr === "MD" ? "master-distributor" :
    event.member.roleAbbr === "DT" ? "distributor" : "retailer"
  ] ?? ROLE_COLORS.retailer;

  const statusBorder =
    event.status === "Success" ? "border-emerald-400" :
    event.status === "Pending" ? "border-amber-400" :
    "border-rose-400";

  return (
    <li className={`flex items-center gap-4 border-l-4 px-5 py-3.5 transition-colors hover:bg-ink-50/40 md:px-6 ${statusBorder}`}>
      {/* Service icon */}
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-ink-50 text-ink-600 ring-1 ring-inset ring-ink-100">
        <Icon className="h-4 w-4" />
      </span>

      {/* Member info */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ring-1 ring-inset ${colors.bg} ${colors.text} ${colors.ring}`}
          >
            {event.member.roleAbbr}
          </span>
          <span className="text-sm font-semibold text-ink-900">{event.member.name}</span>
          {event.member.userCode && (
            <span className="font-mono text-[10px] text-ink-400">{event.member.userCode}</span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-ink-500">
          {event.serviceLabel} · {event.member.city}
        </p>
      </div>

      {/* Amount + status */}
      <div className="shrink-0 text-right">
        <p className={`text-sm font-bold tabular-nums ${
          event.status === "Success" ? "text-emerald-700" :
          event.status === "Failed" ? "text-rose-700" :
          "text-amber-700"
        }`}>
          {formatINR(event.amount)}
        </p>
        {event.commission > 0 && (
          <p className="text-[11px] text-ink-400 tabular-nums">+{formatINR(event.commission)} comm.</p>
        )}
      </div>

      {/* Status chip + time */}
      <div className="hidden sm:flex shrink-0 flex-col items-end gap-1">
        <StatusChip status={event.status} label={event.status} size="sm" />
        <span className="text-[10px] text-ink-400">{timeAgo(event.createdAt)}</span>
      </div>
    </li>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 3 — Level Analytics
// ─────────────────────────────────────────────────────────────────────────────

type LevelStat = {
  role: string;       // slug
  label: string;
  total: number;
  activeToday: number;
  volumeToday: number;
  commissionToday: number;
  totalWallet: number;
  top5: { name: string; volume: number; id: string }[];
};

function LevelAnalyticsTab({ callerSlug }: { callerSlug: string }) {
  const [nodes, setNodes] = useState<HierarchyNode[]>([]);
  const [callerId, setCallerId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/network/hierarchy");
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to load"); return; }
      setNodes(data.nodes ?? []);
      setCallerId(data.callerId ?? "");
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Aggregate per level
  const levelStats: LevelStat[] = useMemo(() => {
    const levels = visibleLevels(callerSlug);
    return levels.map((role) => {
      const matching = nodes.filter((n) => n.role === role);
      const active = matching.filter((n) => n.txnToday > 0);
      const sorted = [...matching].sort((a, b) => b.volumeToday - a.volumeToday);
      return {
        role,
        label: LEVEL_LABEL[role] ?? role,
        total: matching.length,
        activeToday: active.length,
        volumeToday: matching.reduce((s, n) => s + n.volumeToday, 0),
        commissionToday: matching.reduce((s, n) => s + n.commissionToday, 0),
        totalWallet: matching.reduce((s, n) => s + n.walletBalance, 0),
        top5: sorted.slice(0, 5).map((n) => ({
          name: n.name,
          volume: n.volumeToday,
          id: n.id,
        })),
      };
    });
  }, [nodes, callerSlug]);

  // Network-wide totals
  const totalVolume = levelStats.reduce((s, l) => s + l.volumeToday, 0);
  const totalComm = levelStats.reduce((s, l) => s + l.commissionToday, 0);
  const totalMembers = nodes.filter((n) => n.parentId === callerId).length;
  const totalActive = nodes.filter((n) => n.txnToday > 0).length;

  if (loading) {
    return (
      <SectionCard className="grid place-items-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
      </SectionCard>
    );
  }

  if (error) {
    return (
      <EmptyState bordered tone="coral" icon={WarningCircle} title="Couldn't load analytics" description={error}
        action={<Button variant="outline" onClick={load}>Retry</Button>}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Network-wide summary strip */}
      <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StaggerItem>
          <StatCard icon={Users} label="Total network" value={formatNumber(nodes.length)} accent="violet" />
        </StaggerItem>
        <StaggerItem>
          <StatCard icon={Activity} label="Active today" value={`${totalActive} / ${nodes.length}`} accent="brand" />
        </StaggerItem>
        <StaggerItem>
          <StatCard icon={TrendingUp} label="Today's volume" value={formatINR(totalVolume)} accent="emerald" />
        </StaggerItem>
        <StaggerItem>
          <StatCard icon={CircleDollarSign} label="Today's commission" value={formatINR(totalComm)} accent="accent" />
        </StaggerItem>
      </Stagger>

      {/* Per-level cards */}
      <div className={`grid gap-5 ${levelStats.length === 1 ? "lg:grid-cols-1 max-w-xl" : levelStats.length === 2 ? "lg:grid-cols-2" : "lg:grid-cols-3"}`}>
        {levelStats.map((lvl) => (
          <LevelCard key={lvl.role} stat={lvl} totalMembers={totalMembers} />
        ))}
      </div>

      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>
    </div>
  );
}

function LevelCard({ stat, totalMembers: _totalMembers }: { stat: LevelStat; totalMembers: number }) {
  const gradient = LEVEL_GRADIENT[stat.role] ?? "from-ink-600 to-ink-800";
  const maxVolume = Math.max(...stat.top5.map((m) => m.volume), 1);

  return (
    <div className="overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-sm">
      {/* Level header */}
      <div className={`bg-gradient-to-r ${gradient} px-6 py-5 text-white`}>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">{stat.label}</p>
        <div className="mt-2 flex items-end justify-between">
          <div>
            <p className="font-display text-3xl font-bold">{stat.total}</p>
            <p className="mt-0.5 text-sm text-white/80">total members</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-white/90">{stat.activeToday} active today</p>
            <p className="text-xs text-white/60">{stat.total > 0 ? Math.round((stat.activeToday / stat.total) * 100) : 0}% of tier</p>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 divide-x divide-ink-100 border-b border-ink-100">
        <div className="px-5 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">Today's Volume</p>
          <p className="mt-1 font-display text-lg font-bold tabular-nums text-ink-900">
            {stat.volumeToday > 0 ? formatINR(stat.volumeToday) : "—"}
          </p>
        </div>
        <div className="px-5 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">Commission</p>
          <p className="mt-1 font-display text-lg font-bold tabular-nums text-emerald-700">
            {stat.commissionToday > 0 ? formatINR(stat.commissionToday) : "—"}
          </p>
        </div>
        <div className="px-5 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">Total Wallet</p>
          <p className="mt-1 text-sm font-bold tabular-nums text-ink-800">{formatINR(stat.totalWallet)}</p>
        </div>
        <div className="px-5 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">Silent Today</p>
          <p className="mt-1 text-sm font-bold tabular-nums text-amber-700">
            {stat.total - stat.activeToday > 0 ? stat.total - stat.activeToday : "—"}
          </p>
        </div>
      </div>

      {/* Top 5 leaderboard */}
      {stat.top5.length > 0 ? (
        <div className="px-5 py-4">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-ink-400">
            Top by volume today
          </p>
          <ol className="space-y-2">
            {stat.top5.map((m, i) => {
              const pct = maxVolume > 0 ? (m.volume / maxVolume) * 100 : 0;
              return (
                <li key={m.id} className="flex items-center gap-2">
                  <span className="w-4 shrink-0 text-right text-[10px] font-bold text-ink-400">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <Link
                        href={`/dashboard/network/${m.id}`}
                        className="truncate text-xs font-semibold text-ink-900 hover:text-brand-700 transition-colors"
                      >
                        {m.name}
                      </Link>
                      <span className="shrink-0 text-[11px] font-bold tabular-nums text-emerald-700">
                        {m.volume > 0 ? formatINR(m.volume) : "—"}
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${gradient} transition-all duration-700`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      ) : (
        <div className="px-5 py-8 text-center text-xs text-ink-400">
          No transactions today in this tier.
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 4 — Network Ledger
// ─────────────────────────────────────────────────────────────────────────────

const WALLET_REASONS = [
  "TOPUP", "WITHDRAW", "TRANSACTION", "COMMISSION", "REVERSAL",
  "ADJUSTMENT", "FUND_TRANSFER_IN", "FUND_TRANSFER_OUT", "FEE",
  "PENALTY", "PAYOUT", "SETTLEMENT",
];

const inputCls =
  "h-9 rounded-2xl bg-white ring-1 ring-ink-100 shadow-sm px-3 text-sm text-ink-900 outline-none transition focus:ring-2 focus:ring-brand-100";

function NetworkLedgerTab({ callerSlug }: { callerSlug: string }) {
  const levels = visibleLevels(callerSlug);

  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [sums, setSums] = useState({ credit: 0, debit: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [level, setLevel] = useState("all");
  const [direction, setDirection] = useState("all");
  const [reason, setReason] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        level, direction, reason, page: String(page), pageSize: "50",
      });
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const res = await fetch(`/api/network/downline-ledger?${params}`);
      const data = await res.json();
      if (res.ok) {
        setEntries(data.entries ?? []);
        setTotal(data.total ?? 0);
        setSums(data.sums ?? { credit: 0, debit: 0 });
      }
    } finally {
      setLoading(false);
    }
  }, [level, direction, reason, from, to, page]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [level, direction, reason, from, to]);
  useEffect(() => { load(); }, [load]);

  const pages = Math.max(1, Math.ceil(total / 50));

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-3xl bg-white p-5 ring-1 ring-emerald-200 shadow-sm">
          <div className="flex items-center gap-2">
            <ArrowCircleDown className="h-4 w-4 text-emerald-600" weight="fill" />
            <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600">Credits</p>
          </div>
          <p className="mt-2 font-display text-2xl font-bold tabular-nums text-emerald-700">{formatINR(sums.credit)}</p>
        </div>
        <div className="rounded-3xl bg-white p-5 ring-1 ring-rose-200 shadow-sm">
          <div className="flex items-center gap-2">
            <ArrowCircleUp className="h-4 w-4 text-rose-600" weight="fill" />
            <p className="text-[11px] font-semibold uppercase tracking-wider text-rose-600">Debits</p>
          </div>
          <p className="mt-2 font-display text-2xl font-bold tabular-nums text-rose-700">{formatINR(sums.debit)}</p>
        </div>
        <div className="rounded-3xl bg-white p-5 ring-1 ring-ink-100 shadow-sm">
          <div className="flex items-center gap-2">
            <BookOpenCheck className="h-4 w-4 text-ink-500" />
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">Entries</p>
          </div>
          <p className="mt-2 font-display text-2xl font-bold tabular-nums text-ink-900">{formatNumber(total)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <select value={level} onChange={(e) => setLevel(e.target.value)} className={inputCls} aria-label="Level">
          <option value="all">All levels</option>
          {levels.map((l) => (
            <option key={l} value={l === "master-distributor" ? "md" : l === "distributor" ? "dt" : "rt"}>
              {LEVEL_LABEL[l]}
            </option>
          ))}
        </select>
        <select value={direction} onChange={(e) => setDirection(e.target.value)} className={inputCls} aria-label="Direction">
          <option value="all">Credits + Debits</option>
          <option value="CREDIT">Credits only</option>
          <option value="DEBIT">Debits only</option>
        </select>
        <select value={reason} onChange={(e) => setReason(e.target.value)} className={inputCls} aria-label="Reason">
          <option value="all">All reasons</option>
          {WALLET_REASONS.map((r) => (
            <option key={r} value={r}>{r.replace(/_/g, " ")}</option>
          ))}
        </select>
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className={inputCls}
          aria-label="From date"
        />
        <span className="text-xs text-ink-400">to</span>
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className={inputCls}
          aria-label="To date"
        />
        <Button variant="outline" size="sm" onClick={load} disabled={loading} aria-label="Refresh">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Ledger table */}
      <div className="overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-ink-400">
            <Loader2 className="mr-2 h-5 w-5 animate-spin text-brand-500" /> Loading ledger…
          </div>
        ) : entries.length === 0 ? (
          <EmptyState compact icon={Notebook} title="No ledger entries" description="Try adjusting the filters." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-ink-50/60 text-left text-[11px] uppercase tracking-[0.14em] text-ink-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Date</th>
                  <th className="px-5 py-3 font-semibold">Member</th>
                  <th className="px-5 py-3 font-semibold">Wallet</th>
                  <th className="px-5 py-3 font-semibold">Type</th>
                  <th className="px-5 py-3 font-semibold">Reason</th>
                  <th className="px-5 py-3 text-right font-semibold">Amount</th>
                  <th className="px-5 py-3 text-right font-semibold">Balance after</th>
                  <th className="px-5 py-3 font-semibold">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-50 text-ink-800">
                {entries.map((e) => {
                  const colors = ROLE_COLORS[
                    e.user?.roleAbbr === "MD" ? "master-distributor" :
                    e.user?.roleAbbr === "DT" ? "distributor" : "retailer"
                  ] ?? ROLE_COLORS.retailer;
                  return (
                    <tr key={e.id} className="hover:bg-ink-50/40 transition-colors">
                      <td className="px-5 py-3 text-xs text-ink-500 whitespace-nowrap">
                        {new Date(e.createdAt).toLocaleString("en-IN", {
                          day: "2-digit", month: "short", year: "2-digit",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </td>
                      <td className="px-5 py-3">
                        {e.user ? (
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ring-1 ring-inset ${colors.bg} ${colors.text} ${colors.ring}`}
                              >
                                {e.user.roleAbbr}
                              </span>
                              <span className="font-semibold text-ink-900">{e.user.name}</span>
                            </div>
                            {e.user.userCode && (
                              <p className="mt-0.5 font-mono text-[10px] text-ink-400">{e.user.userCode}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-ink-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant={e.walletType === "AEPS" ? "accent" : "brand"} size="sm">
                          {e.walletType}
                        </Badge>
                      </td>
                      <td className="px-5 py-3">
                        <StatusChip
                          status={e.direction === "CREDIT" ? "CREDIT" : "DEBIT"}
                          label={e.direction === "CREDIT" ? "Credit" : "Debit"}
                          size="sm"
                        />
                      </td>
                      <td className="px-5 py-3 text-xs text-ink-600">
                        {String(e.reason).replace(/_/g, " ")}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className={`font-bold tabular-nums ${e.direction === "CREDIT" ? "text-emerald-700" : "text-rose-700"}`}>
                          {e.direction === "CREDIT" ? "+" : "−"}{formatINR(e.amount)}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-ink-700">
                        {e.balanceAfter !== null ? formatINR(e.balanceAfter) : <span className="text-ink-300">—</span>}
                      </td>
                      <td className="px-5 py-3">
                        {e.note ? (
                          <span className="block max-w-[180px] truncate text-xs text-ink-500" title={e.note}>
                            {e.note}
                          </span>
                        ) : (
                          <span className="text-ink-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-end gap-2 text-sm">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="tabular-nums text-ink-500">Page {page} / {pages}</span>
          <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
