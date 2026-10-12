"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, RefreshCw, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { DataTable, type Column } from "@/components/dashboard/DataTable";
import { StatusChip } from "@/components/dashboard/patterns/StatusChip";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatINR } from "@/lib/utils";

type Row = {
  id: string;
  refId: string;
  service: string;
  partner: string | null;
  partnerTxnId: string | null;
  amount: number;
  fee: number;
  status: string;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string };
};

function prettyService(s: string) {
  return s
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

export default function NeedsReviewPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);

  // Resolve dialog state
  const [target, setTarget] = useState<Row | null>(null);

  const notify = useCallback((text: string, ok: boolean) => {
    if (ok) toast.success(text);
    else toast.error(text);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/transactions/needs-review");
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error ?? "Failed to load held payments");
      setRows(d.rows);
    } catch (e) {
      notify(e instanceof Error ? e.message : "Failed to load held payments", false);
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    load();
  }, [load]);

  function openResolve(row: Row) {
    setTarget(row);
  }

  async function confirmResolve(providerRef: string) {
    if (!target) return;
    setResolving(true);
    try {
      const res = await fetch("/api/admin/transactions/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ref: target.refId,
          providerRef: providerRef.trim() || undefined,
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        throw new Error(typeof d?.error === "string" ? d.error : "Could not resolve this payment");
      }
      const o = d.result?.outcome as string | undefined;
      const msg =
        o === "settled"
          ? "Provider confirmed SUCCESS — payment settled."
          : o === "refunded"
            ? "Provider confirmed failure — reserve returned to the retailer."
            : o === "corrected"
              ? "Corrected to SUCCESS; any earlier refund was clawed back via a lien."
              : "Resolved.";
      notify(msg, true);
      setTarget(null);
      await load();
    } catch (e) {
      notify(e instanceof Error ? e.message : "Could not resolve this payment", false);
    } finally {
      setResolving(false);
    }
  }

  const columns: Column<Row>[] = [
    {
      key: "refId",
      header: "Ref",
      render: (r) => (
        <div className="flex flex-col">
          <span className="font-mono text-xs text-ink-900">{r.refId}</span>
          <span className="text-[11px] text-ink-400">
            {new Date(r.createdAt).toLocaleString("en-IN")}
          </span>
        </div>
      ),
    },
    {
      key: "user",
      header: "Retailer",
      render: (r) => (
        <div className="flex flex-col">
          <span className="text-sm text-ink-900">{r.user.name}</span>
          <span className="text-[11px] text-ink-400">{r.user.email}</span>
        </div>
      ),
    },
    {
      key: "service",
      header: "Service",
      render: (r) => (
        <div className="flex flex-col">
          <span className="text-sm text-ink-900">{prettyService(r.service)}</span>
          <span className="text-[11px] text-ink-400">{r.partner ?? "—"}</span>
        </div>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      render: (r) => (
        <div className="flex flex-col items-end">
          <span className="font-medium text-ink-900">{formatINR(r.amount)}</span>
          {r.fee > 0 && <span className="text-[11px] text-ink-400">+ {formatINR(r.fee)} fee</span>}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <div className="flex flex-col gap-1">
          <StatusChip status={r.status} />
          {r.errorCode && <span className="text-[11px] text-ink-400">{r.errorCode}</span>}
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (r) => (
        <Button size="sm" variant="outline" onClick={() => openResolve(r)}>
          <ShieldCheck className="mr-1.5 h-4 w-4" />
          Verify & resolve
        </Button>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Needs Review"
        description="Payments with an INDETERMINATE provider outcome (lost response, timeout, 5xx). Funds are HELD — never auto-refunded — until verified against the provider panel."
        icon={AlertTriangle}
        actions={
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`mr-1.5 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      <DataTable<Row>
        title={`Held payments (${rows.length})`}
        columns={columns}
        data={rows}
        loading={loading}
        emptyIcon={ShieldCheck}
        empty="No payments are awaiting review — all clear."
      />

      <ConfirmDialog
        open={!!target}
        title="Verify & resolve with provider"
        description={
          target
            ? `Re-checks ${target.refId} (${formatINR(target.amount)}) against the provider's own status API. It settles, refunds, or — if the provider confirms SUCCESS on a wrongly-failed row — corrects it with a lien clawback. Nothing changes if the provider can't confirm. Optionally paste the pay-step reference (order_id / txn_id) from the partner panel below.`
            : ""
        }
        confirmLabel="Verify now"
        cancelLabel="Cancel"
        tone="default"
        busy={resolving}
        onConfirm={confirmResolve}
        onClose={() => !resolving && setTarget(null)}
        input={{ label: "Provider pay-step reference (optional)", placeholder: "order_id / txn_id" }}
      />
    </>
  );
}
