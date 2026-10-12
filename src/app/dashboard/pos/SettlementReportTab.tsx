"use client";

import { useState, useCallback, useMemo } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import {
  ArrowLeftRight,
  IndianRupee,
  Scissors,
  Banknote,
  Wallet,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Users,
  Receipt,
  X,
  Zap,
  Clock,
  CalendarClock,
  Search,
} from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { DataTable, type Column } from "@/components/dashboard/DataTable";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatINR } from "@/lib/utils";
import { type ReportColumn } from "@/lib/reports";
import { ReportActions } from "@/components/dashboard/ReportActions";
import { AssignUserPicker, type PickerUser } from "@/components/ui/AssignUserPicker";

// ── API contract (mirrors src/lib/pos/settlementReport.ts) ──

type ReportRetailer = {
  id: string;
  name: string;
  shopName: string | null;
  userCode: string | null;
  role: string;
};

type ReportRow = {
  id: string;
  transactionRef: string;
  txnTime: string;
  terminalId: string | null;
  rrn: string | null;
  paymentMode: string | null;
  cardBrand: string | null;
  cardType: string | null;
  swipeStatus: string | null;
  retailer: ReportRetailer | null;
  grossAmount: number;
  mdrAmount: number;
  netSettled: number;
  settlementStatus: string;
  settlementMode: string;
  settledVia: string | null;
  settledAt: string | null;
  myCommission: number | null;
};

type RollupRow = {
  userId: string;
  name: string;
  shopName: string | null;
  userCode: string | null;
  role: string;
  txnCount: number;
  grossAmount: number;
  mdrAmount: number;
  netSettled: number;
  myCommission: number | null;
  // B — historical split within the selected range, by how each entry settled.
  instantSettledNet: number;
  instantSettledCount: number;
  t1SettledNet: number;
  t1SettledCount: number;
  pendingNet: number;
  pendingCount: number;
};

// A — today's forward-looking book (per user).
type TodayRow = {
  userId: string;
  name: string;
  shopName: string | null;
  userCode: string | null;
  role: string;
  instantNet: number;
  instantCount: number;
  t1Net: number;
  t1Count: number;
};

type TodaySummary = {
  instantNet: number;
  instantCount: number;
  t1Net: number;
  t1Count: number;
};

type ReportSummary = {
  totalTransactions: number;
  totalGross: number;
  totalMdr: number;
  totalSettled: number;
  totalCommission: number | null;
  settledCount: number;
  pendingCount: number;
  failedCount: number;
  // B — range net split by settlement leg.
  instantSettledNet: number;
  instantSettledCount: number;
  t1SettledNet: number;
  t1SettledCount: number;
  pendingNet: number;
};

type ReportResponse = {
  rows: ReportRow[];
  rollup: RollupRow[];
  summary: ReportSummary;
  today: { rows: TodayRow[]; summary: TodaySummary };
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasPrev: boolean;
    hasNext: boolean;
  };
  showCommission: boolean;
};

const ROLE_LABELS: Record<string, string> = {
  SUPER_DISTRIBUTOR: "Super Distributor",
  MASTER_DISTRIBUTOR: "Master Distributor",
  DISTRIBUTOR: "Distributor",
  RETAILER: "Retailer",
};

const EMPTY_TODAY: ReportResponse["today"] = {
  rows: [],
  summary: { instantNet: 0, instantCount: 0, t1Net: 0, t1Count: 0 },
};

async function postFetcher<T>([url, body]: readonly [string, unknown]): Promise<T> {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  let json: { error?: string } = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(r.ok ? "Invalid response from server" : `Request failed (${r.status})`);
  }
  if (!r.ok) throw new Error(typeof json?.error === "string" ? json.error : "Request failed");
  return json as T;
}

function defaultDateRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function settledViaLabel(v: string | null): string {
  switch (v) {
    case "INSTANT_AUTO":
      return "Instant (auto)";
    case "INSTANT_BUTTON":
      return "Instant (manual)";
    case "QR_INSTANT_APPROVAL":
      return "Instant (QR)";
    case "T1_CRON":
      return "T+1 sweep";
    case "MANUAL_RECONCILE":
      return "Manual";
    default:
      return "—";
  }
}

function settlementBadge(status: string) {
  if (status === "SETTLED") return <Badge variant="success">Settled</Badge>;
  if (status === "FAILED") return <Badge variant="danger">Failed</Badge>;
  return <Badge variant="warning">Pending · T+1</Badge>;
}

function merchantCell(r: {
  shopName: string | null;
  name: string;
  userCode: string | null;
  role: string;
}) {
  return (
    <div className="flex flex-col">
      <span className="max-w-[180px] truncate text-xs font-semibold text-ink-900">{r.shopName || r.name}</span>
      <span className="text-[11px] text-ink-500">
        {r.userCode ? <span className="font-medium text-brand-600">{r.userCode}</span> : null}
        {r.userCode ? " · " : ""}
        {ROLE_LABELS[r.role] ?? r.role}
      </span>
    </div>
  );
}

function retailerCell(r: { retailer: ReportRetailer | null }) {
  if (!r.retailer) return <span className="text-xs text-ink-400">—</span>;
  return merchantCell(r.retailer);
}

/** Right-aligned "net + N txn" stack used by the split columns. */
function amountCount(net: number, count: number, tone: string) {
  return (
    <div className="flex flex-col items-end">
      <span className={`font-semibold ${tone}`}>{formatINR(net)}</span>
      <span className="text-[11px] text-ink-400">{count.toLocaleString("en-IN")} txn</span>
    </div>
  );
}

type View = "today" | "transactions" | "rollup";

export function SettlementReportTab({
  initialFrom,
  initialTo,
  endpoint = "/api/pos/settlement-report",
  allowUserSearch = false,
}: {
  /** Optional deep-link range (YYYY-MM-DD), e.g. from the "POS Today" card. */
  initialFrom?: string | null;
  initialTo?: string | null;
  /** Report API endpoint. Defaults to the downline-scoped retailer endpoint;
   *  the admin page passes the platform-wide `/api/admin/pos-settlement-report`. */
  endpoint?: string;
  /** Admin-only: show a "filter to a specific user" search over all users. */
  allowUserSearch?: boolean;
} = {}) {
  const defaults = defaultDateRange();
  const [dateFrom, setDateFrom] = useState(initialFrom || defaults.from);
  const [dateTo, setDateTo] = useState(initialTo || defaults.to);
  const [statusFilter, setStatusFilter] = useState<"" | "PENDING" | "SETTLED" | "FAILED">("");
  const [modeFilter, setModeFilter] = useState("");
  const [retailerId, setRetailerId] = useState<string | null>(null);
  const [retailerLabel, setRetailerLabel] = useState<string | null>(null);
  const [view, setView] = useState<View>("today");
  const [page, setPage] = useState(1);
  const [userPickerOpen, setUserPickerOpen] = useState(false);

  const body = useMemo(
    () => ({
      date_from: `${dateFrom}T00:00:00.000+05:30`,
      date_to: `${dateTo}T23:59:59.999+05:30`,
      settlement_status: statusFilter || null,
      payment_mode: modeFilter || null,
      retailer_id: retailerId,
      page,
      page_size: 50,
    }),
    [dateFrom, dateTo, statusFilter, modeFilter, retailerId, page]
  );

  const { data, error, isLoading, mutate } = useSWR<ReportResponse>(
    [endpoint, body],
    postFetcher,
    { revalidateOnFocus: false, keepPreviousData: true }
  );

  const summary = data?.summary;
  const pagination = data?.pagination;
  const rows = data?.rows ?? [];
  const rollup = data?.rollup ?? [];
  const today = data?.today ?? EMPTY_TODAY;
  const showCommission = data?.showCommission ?? false;

  const drillToUser = useCallback((r: RollupRow) => {
    setRetailerId(r.userId);
    setRetailerLabel(r.shopName || r.name);
    setView("transactions");
    setPage(1);
  }, []);

  const pickUser = useCallback((u: PickerUser) => {
    setRetailerId(u.id);
    setRetailerLabel(u.shop || u.name);
    setUserPickerOpen(false);
    setPage(1);
  }, []);

  const clearDrill = useCallback(() => {
    setRetailerId(null);
    setRetailerLabel(null);
    setPage(1);
  }, []);

  // Export: fetch every matching row (server-side, ownership scoped).
  const fetchAllRows = useCallback(async (): Promise<ReportRow[]> => {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, export: true }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(typeof d.error === "string" ? d.error : "Failed to build report");
      return rows;
    }
    const d = await res.json();
    if (d.truncated) {
      toast.warning(
        `Report capped at ${Number(d.returned).toLocaleString("en-IN")} rows — narrow the date range for the rest.`
      );
    }
    return (d.rows as ReportRow[]) ?? [];
  }, [endpoint, body, rows]);

  const exportCols: ReportColumn<ReportRow>[] = [
    { key: "txnTime", header: "Time", render: (r) => new Date(r.txnTime).toLocaleString("en-IN") },
    { key: "retailer", header: "Merchant", render: (r) => r.retailer?.shopName || r.retailer?.name || "" },
    { key: "userCode", header: "Merchant Code", render: (r) => r.retailer?.userCode ?? "" },
    { key: "role", header: "Role", render: (r) => (r.retailer ? ROLE_LABELS[r.retailer.role] ?? r.retailer.role : "") },
    { key: "terminalId", header: "TID", render: (r) => r.terminalId ?? "" },
    { key: "paymentMode", header: "Mode", render: (r) => r.paymentMode ?? "" },
    { key: "cardBrand", header: "Card", render: (r) => [r.cardBrand, r.cardType].filter(Boolean).join(" ") },
    { key: "rrn", header: "RRN", render: (r) => r.rrn ?? "" },
    { key: "grossAmount", header: "Amount (INR)", format: "money", render: (r) => r.grossAmount.toFixed(2) },
    { key: "mdrAmount", header: "MDR (INR)", format: "money", render: (r) => r.mdrAmount.toFixed(2) },
    { key: "netSettled", header: "Settled (INR)", format: "money", render: (r) => r.netSettled.toFixed(2) },
    { key: "settlementStatus", header: "Settlement", render: (r) => r.settlementStatus },
    { key: "settlementMode", header: "Mode (T0/T1)", render: (r) => r.settlementMode },
    { key: "settledVia", header: "Settled Via", render: (r) => settledViaLabel(r.settledVia) },
    ...(showCommission
      ? [
          {
            key: "myCommission",
            header: "My Commission (INR)",
            format: "money" as const,
            render: (r: ReportRow) => (r.myCommission ?? 0).toFixed(2),
          },
        ]
      : []),
  ];

  const txnCols: Column<ReportRow>[] = [
    { key: "txnTime", header: "Time", render: (r) => <span className="text-xs">{fmtTime(r.txnTime)}</span> },
    { key: "retailer", header: "Merchant", render: retailerCell },
    { key: "terminalId", header: "TID", render: (r) => <span className="font-mono text-xs">{r.terminalId ?? "—"}</span> },
    { key: "paymentMode", header: "Mode", render: (r) => <Badge variant="default">{r.paymentMode ?? "—"}</Badge> },
    {
      key: "cardBrand",
      header: "Card",
      render: (r) => (r.cardBrand ? <span className="text-xs">{[r.cardBrand, r.cardType].filter(Boolean).join(" ")}</span> : "—"),
    },
    { key: "grossAmount", header: "Amount", align: "right", render: (r) => <span className="font-semibold text-ink-900">{formatINR(r.grossAmount)}</span> },
    { key: "mdrAmount", header: "MDR", align: "right", render: (r) => <span className="text-rose-600">−{formatINR(r.mdrAmount)}</span> },
    { key: "netSettled", header: "Settled", align: "right", render: (r) => <span className="font-semibold text-emerald-700">{formatINR(r.netSettled)}</span> },
    { key: "settlementStatus", header: "Status", render: (r) => settlementBadge(r.settlementStatus) },
    ...(showCommission
      ? [
          {
            key: "myCommission",
            header: "My Commission",
            align: "right" as const,
            render: (r: ReportRow) => <span className="font-semibold text-brand-700">{formatINR(r.myCommission ?? 0)}</span>,
          },
        ]
      : []),
  ];

  const rollupCols: Column<RollupRow>[] = [
    {
      key: "name",
      header: "Merchant",
      render: (r) => merchantCell(r),
    },
    { key: "txnCount", header: "Txns", align: "right", render: (r) => <span className="font-semibold">{r.txnCount.toLocaleString("en-IN")}</span> },
    { key: "grossAmount", header: "Volume", align: "right", render: (r) => <span className="font-semibold text-ink-900">{formatINR(r.grossAmount)}</span> },
    { key: "mdrAmount", header: "MDR", align: "right", render: (r) => <span className="text-rose-600">−{formatINR(r.mdrAmount)}</span> },
    { key: "instantSettled", header: "Instant (T0)", align: "right", render: (r) => amountCount(r.instantSettledNet, r.instantSettledCount, "text-emerald-700") },
    { key: "t1Settled", header: "T+1 settled", align: "right", render: (r) => amountCount(r.t1SettledNet, r.t1SettledCount, "text-brand-700") },
    { key: "pending", header: "Pending", align: "right", render: (r) => amountCount(r.pendingNet, r.pendingCount, "text-amber-600") },
    { key: "netSettled", header: "Net total", align: "right", render: (r) => <span className="font-semibold text-ink-900">{formatINR(r.netSettled)}</span> },
    ...(showCommission
      ? [
          {
            key: "myCommission",
            header: "My Commission",
            align: "right" as const,
            render: (r: RollupRow) => <span className="font-semibold text-brand-700">{formatINR(r.myCommission ?? 0)}</span>,
          },
        ]
      : []),
    {
      key: "drill",
      header: "",
      align: "right",
      render: (r) => (
        <button
          onClick={() => drillToUser(r)}
          className="inline-flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700 transition-colors hover:bg-brand-100"
        >
          <Receipt className="h-3 w-3" /> View txns
        </button>
      ),
    },
  ];

  const todayCols: Column<TodayRow>[] = [
    { key: "name", header: "Merchant", render: (r) => merchantCell(r) },
    { key: "instant", header: "Settling today (instant)", align: "right", render: (r) => amountCount(r.instantNet, r.instantCount, "text-emerald-700") },
    { key: "t1", header: "Settling T+1 (tomorrow)", align: "right", render: (r) => amountCount(r.t1Net, r.t1Count, "text-brand-700") },
    { key: "total", header: "Captured today", align: "right", render: (r) => <span className="font-semibold text-ink-900">{formatINR(r.instantNet + r.t1Net)}</span> },
  ];

  const reportSubtitle =
    `${dateFrom} to ${dateTo}` +
    (statusFilter ? ` · ${statusFilter}` : "") +
    (retailerLabel ? ` · ${retailerLabel}` : "");

  return (
    <>
      {/* Summary cards (selected date range) */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Transactions" value={summary ? summary.totalTransactions.toLocaleString("en-IN") : "..."} icon={ArrowLeftRight} accent="brand" />
        <StatCard label="Total Volume" value={summary ? formatINR(summary.totalGross) : "..."} icon={IndianRupee} accent="violet" />
        <StatCard label="MDR Deducted" value={summary ? formatINR(summary.totalMdr) : "..."} icon={Scissors} accent="accent" />
        <StatCard label="Instant settled (T0)" value={summary ? formatINR(summary.instantSettledNet) : "..."} hint={summary ? `${summary.instantSettledCount.toLocaleString("en-IN")} txn` : undefined} icon={Zap} accent="emerald" />
        <StatCard label="T+1 settled" value={summary ? formatINR(summary.t1SettledNet) : "..."} hint={summary ? `${summary.t1SettledCount.toLocaleString("en-IN")} txn` : undefined} icon={CalendarClock} accent="violet" />
      </div>

      {/* Filters */}
      <div className="rounded-3xl bg-white shadow-sm ring-1 ring-ink-100 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-500">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              className="rounded-lg border border-ink-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-500">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              className="rounded-lg border border-ink-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-500">Settlement</label>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value as typeof statusFilter); setPage(1); }}
              className="rounded-lg border border-ink-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
            >
              <option value="">All</option>
              <option value="SETTLED">Settled</option>
              <option value="PENDING">Pending (T+1)</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-500">Mode</label>
            <select
              value={modeFilter}
              onChange={(e) => { setModeFilter(e.target.value); setPage(1); }}
              className="rounded-lg border border-ink-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
            >
              <option value="">All</option>
              <option value="CARD">Card</option>
              <option value="UPI">UPI</option>
              <option value="NFC">NFC</option>
              <option value="BHARATQR">BharatQR</option>
            </select>
          </div>
          <Button variant="outline" size="sm" onClick={() => mutate()} title="Refresh">
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
          {allowUserSearch && (
            <Button variant="outline" size="sm" onClick={() => setUserPickerOpen(true)} title="Filter to a specific user">
              <Search className="h-4 w-4" /> Filter user
            </Button>
          )}

          <div className="ml-auto flex flex-wrap gap-2">
            <ReportActions<ReportRow>
              filename={`pos-settlement-report-${dateFrom}-to-${dateTo}`}
              title="POS Settlement Report"
              subtitle={reportSubtitle}
              columns={exportCols}
              rows={rows}
              fetchRows={fetchAllRows}
            />
          </div>
        </div>

        {/* Active drill-down chip */}
        {retailerLabel && (
          <div className="mt-3 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
              Showing: {retailerLabel}
              <button onClick={clearDrill} className="rounded-full hover:bg-brand-100" aria-label="Clear filter">
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          </div>
        )}
      </div>

      {/* View toggle */}
      <div className="flex gap-1 rounded-xl border border-ink-100 bg-ink-50/60 p-1">
        {([
          { id: "today", label: "Today's Book", icon: Zap },
          { id: "transactions", label: "Per Transaction", icon: Receipt },
          { id: "rollup", label: "By User (range)", icon: Users },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setView(id)}
            className={
              view === id
                ? "flex-1 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-ink-900 shadow-sm"
                : "flex-1 rounded-lg px-4 py-2 text-sm font-semibold text-ink-500 transition-colors hover:text-ink-700"
            }
          >
            <span className="flex items-center justify-center gap-2"><Icon className="h-4 w-4" /> {label}</span>
          </button>
        ))}
      </div>

      {error ? (
        <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error instanceof Error ? error.message : "Failed to load the settlement report."}
        </div>
      ) : view === "today" ? (
        <>
          {/* Today's forward-looking book — instant (today) vs T+1 (tomorrow) */}
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              label="Settling today (instant)"
              value={formatINR(today.summary.instantNet)}
              hint={`${today.summary.instantCount.toLocaleString("en-IN")} transactions · credited today (T0)`}
              icon={Zap}
              accent="emerald"
            />
            <StatCard
              label="Settling T+1 (tomorrow)"
              value={formatINR(today.summary.t1Net)}
              hint={`${today.summary.t1Count.toLocaleString("en-IN")} transactions · next-day sweep`}
              icon={CalendarClock}
              accent="violet"
            />
            <StatCard
              label="Captured today (total)"
              value={formatINR(today.summary.instantNet + today.summary.t1Net)}
              hint={`${(today.summary.instantCount + today.summary.t1Count).toLocaleString("en-IN")} transactions`}
              icon={Clock}
              accent="brand"
            />
          </div>
          <DataTable
            title="Today's settlement book — per user"
            description="Of transactions captured today (IST): what settles instantly today vs what is queued for the T+1 sweep tomorrow."
            columns={todayCols}
            data={today.rows}
            loading={isLoading}
            empty="No POS captures today yet."
          />
        </>
      ) : view === "transactions" ? (
        <>
          <DataTable
            title="POS Settlement — per transaction"
            description={
              pagination
                ? `${pagination.total.toLocaleString("en-IN")} transaction${pagination.total === 1 ? "" : "s"} · page ${pagination.page} of ${pagination.totalPages}`
                : isLoading
                  ? "Loading..."
                  : "No data yet"
            }
            columns={txnCols}
            data={rows}
            loading={isLoading}
            empty="No POS transactions for the selected filters."
          />
          {pagination && pagination.totalPages > 1 && (
            <Paginator
              page={pagination.page}
              totalPages={pagination.totalPages}
              hasPrev={pagination.hasPrev}
              hasNext={pagination.hasNext}
              onPrev={() => setPage((p) => Math.max(1, p - 1))}
              onNext={() => setPage((p) => p + 1)}
            />
          )}
        </>
      ) : (
        <DataTable
          title="Settlement rollup — by user (selected range)"
          description={
            rollup.length
              ? `${rollup.length} merchant${rollup.length === 1 ? "" : "s"} with POS activity in this period · net split by how it settled`
              : isLoading
                ? "Loading..."
                : "No data yet"
          }
          columns={rollupCols}
          data={rollup}
          loading={isLoading}
          empty="No POS activity for the selected filters."
        />
      )}

      {/* Admin user filter modal */}
      {allowUserSearch && userPickerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-ink-950/40 p-4 pt-16 backdrop-blur-sm"
          onClick={() => setUserPickerOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-3xl bg-white p-5 shadow-xl ring-1 ring-ink-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-ink-900">Filter to a specific user</h3>
              <button onClick={() => setUserPickerOpen(false)} className="rounded-full p-1 text-ink-400 hover:bg-ink-50 hover:text-ink-700" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
            <AssignUserPicker onSelect={pickUser} autoFocus />
          </div>
        </div>
      )}
    </>
  );
}

function Paginator({ page, totalPages, hasPrev, hasNext, onPrev, onNext }: {
  page: number; totalPages: number; hasPrev: boolean; hasNext: boolean; onPrev: () => void; onNext: () => void;
}) {
  return (
    <div className="flex items-center justify-center gap-3">
      <Button variant="outline" size="sm" disabled={!hasPrev} onClick={onPrev}>
        <ChevronLeft className="h-4 w-4" /> Previous
      </Button>
      <span className="text-sm text-ink-600">Page {page} of {totalPages}</span>
      <Button variant="outline" size="sm" disabled={!hasNext} onClick={onNext}>
        Next <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
