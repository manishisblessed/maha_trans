"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Landmark, RefreshCw, ShieldQuestion } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { DataTable, type Column } from "@/components/dashboard/DataTable";
import { StatusChip } from "@/components/dashboard/patterns/StatusChip";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatINR } from "@/lib/utils";

type Row = {
  id: string;
  userId: string;
  userCode: string | null;
  amount: number;
  totalDebit: number;
  mode: string;
  beneficiaryName: string;
  accountLast4: string | null;
  bulkpeReferenceId: string;
  bulkpeTxnId: string | null;
  failureReason: string | null;
  processedAt: string | null;
  createdAt: string;
};

type ActionKind = "recover" | "poll" | "force_paid" | "force_failed";

function ageLabel(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ${mins % 60}m`;
  return `${Math.floor(hrs / 24)}d ${hrs % 24}h`;
}

export default function HeldPayoutsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [exposure, setExposure] = useState(0);
  const [loading, setLoading] = useState(true);

  const [pending, setPending] = useState<{ row: Row; kind: ActionKind } | null>(null);
  const [resolving, setResolving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/payouts/held");
      const d = await res.json();
      if (!res.ok) throw new Error(typeof d?.error === "string" ? d.error : "Failed to load held payouts");
      setRows(d.items);
      setTotal(d.total);
      setExposure(d.exposure ?? 0);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const runResolve = useCallback(
    async (payoutId: string, action: ActionKind, value?: string) => {
      setResolving(true);
      try {
        const body: Record<string, unknown> = { payoutId, action };
        if (action === "poll") body.reference = value;
        else if (action === "force_paid") body.utr = value || undefined;
        else if (action === "force_failed") body.note = value || undefined;

        const res = await fetch("/api/admin/payouts/resolve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const d = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(typeof d?.error === "string" ? d.error : "Resolve failed");

        if (d.dualControl) {
          // Maker-checker: a large force action needs a second, different admin.
          toast.info(
            typeof d.message === "string"
              ? d.message
              : "A second, different admin must approve this action."
          );
          await load();
          return false;
        }

        const result = d.result ?? d;
        if (!result.changed) {
          toast.info(
            action === "recover" || action === "poll"
              ? `Still held — the rail reports PROCESSING${
                  result.recoveredReference
                    ? ` (ref ${result.recoveredReference})`
                    : " and no reference could be recovered"
                }. It will keep polling.`
              : `No change — status is ${result.status}.`
          );
        } else {
          const label =
            result.status === "SUCCESS"
              ? "settled (hold captured)"
              : result.status === "FAILED"
                ? "failed (hold released to wallet)"
                : result.status === "REVERSED"
                  ? "reversed (refunded)"
                  : result.status;
          toast.success(`Resolved — ${label}.`);
        }
        await load();
        return Boolean(result.changed);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Resolve failed");
        return false;
      } finally {
        setResolving(false);
      }
    },
    [load]
  );

  const columns: Column<Row>[] = [
    {
      key: "ref",
      header: "Payout",
      render: (r) => (
        <div className="flex flex-col">
          <span className="font-mono text-xs text-ink-900">{r.bulkpeReferenceId}</span>
          <span className="text-[11px] text-ink-400">
            {r.mode} · {new Date(r.processedAt ?? r.createdAt).toLocaleString("en-IN")}
          </span>
        </div>
      ),
    },
    {
      key: "beneficiary",
      header: "Beneficiary",
      render: (r) => (
        <div className="flex flex-col">
          <span className="text-sm text-ink-900">{r.beneficiaryName}</span>
          <span className="text-[11px] text-ink-400">
            {r.mode === "UPI" ? "VPA" : "A/C"} ••{r.accountLast4 ?? "----"} · {r.userCode ?? r.userId.slice(0, 8)}
          </span>
        </div>
      ),
    },
    {
      key: "amount",
      header: "Held",
      align: "right",
      render: (r) => (
        <div className="flex flex-col items-end">
          <span className="font-medium text-ink-900">{formatINR(r.totalDebit)}</span>
          <span className="text-[11px] text-ink-400">payout {formatINR(r.amount)}</span>
        </div>
      ),
    },
    {
      key: "age",
      header: "Age",
      render: (r) => <span className="text-sm text-ink-600">{ageLabel(r.processedAt ?? r.createdAt)}</span>,
    },
    {
      key: "railref",
      header: "Rail ref",
      render: (r) => (
        <div className="flex max-w-[180px] flex-col">
          <span className="truncate font-mono text-xs text-ink-600" title={r.bulkpeTxnId ?? undefined}>
            {r.bulkpeTxnId ?? "— (lost)"}
          </span>
          {r.failureReason && (
            <span className="truncate text-[11px] text-amber-600" title={r.failureReason}>
              {r.failureReason}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: () => <StatusChip status="NEEDS_REVIEW" />,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (r) => (
        <div className="flex flex-wrap justify-end gap-2">
          <Button size="sm" onClick={() => setPending({ row: r, kind: "recover" })}>
            Auto-resolve
          </Button>
          <Button size="sm" variant="outline" onClick={() => setPending({ row: r, kind: "poll" })}>
            Enter rail ref
          </Button>
          <Button size="sm" variant="outline" onClick={() => setPending({ row: r, kind: "force_paid" })}>
            Mark paid
          </Button>
          <Button size="sm" variant="danger" onClick={() => setPending({ row: r, kind: "force_failed" })}>
            Mark failed
          </Button>
        </div>
      ),
    },
  ];

  const dialog = useMemo(() => {
    if (!pending) return null;
    const { row, kind } = pending;
    const amt = formatINR(row.totalDebit);
    const ref = row.bulkpeReferenceId;
    switch (kind) {
      case "recover":
        return {
          tone: "default" as const,
          title: "Auto-recover & poll the rail?",
          description: `We'll try to recover the Same Day reference for ${ref} by matching ${amt} to ${row.beneficiaryName} (••${row.accountLast4 ?? "----"}) in the rail's recent transactions, then poll its status. No money moves unless the rail reports a terminal state.`,
          confirmLabel: "Recover & poll",
          input: undefined as { label: string; placeholder?: string } | undefined,
        };
      case "poll":
        return {
          tone: "default" as const,
          title: "Enter the Same Day reference_id",
          description: `The transfer response for ${ref} was lost. Open it in the Same Day panel, copy its reference_id, and paste it to poll the authoritative status.`,
          confirmLabel: "Save ref & poll",
          input: { label: "Same Day reference_id", placeholder: "not a PO… id" },
        };
      case "force_paid":
        return {
          tone: "default" as const,
          title: "Confirm the bank DID disburse?",
          description: `Only do this if a bank statement / UTR confirms ${amt} reached ${row.beneficiaryName}. This captures the hold into a real debit for ${ref}. Enter the UTR if you have it.`,
          confirmLabel: "Capture — mark paid",
          input: { label: "UTR (optional)", placeholder: "bank UTR" },
        };
      case "force_failed":
        return {
          tone: "danger" as const,
          title: "Confirm the bank did NOT disburse?",
          description: `Only do this if you've confirmed ${amt} did NOT leave for ${row.beneficiaryName}. This RELEASES the hold back to the retailer's spendable balance for ${ref}. If the bank actually paid, this is a double-spend.`,
          confirmLabel: "Release — mark failed",
          input: { label: "Reason", placeholder: "why it did not disburse" },
        };
    }
  }, [pending]);

  return (
    <>
      <PageHeader
        title="Payout Hold Desk"
        description={
          total > 0
            ? `${total} payout(s) held after an indeterminate send · ${formatINR(
                exposure
              )} exposure. Funds are NOT released — resolve each against the rail.`
            : "Payouts with an INDETERMINATE send outcome land here. The hold is retained until recovered or resolved."
        }
        icon={Landmark}
        actions={
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`mr-1.5 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      <DataTable<Row>
        title={`Held payouts (${rows.length})`}
        columns={columns}
        data={rows}
        loading={loading}
        emptyIcon={ShieldQuestion}
        empty="No payouts are held for review — all clear."
      />

      <ConfirmDialog
        open={pending !== null}
        title={dialog?.title ?? ""}
        description={dialog?.description ?? ""}
        confirmLabel={dialog?.confirmLabel ?? "Confirm"}
        cancelLabel="Cancel"
        tone={dialog?.tone ?? "default"}
        busy={resolving}
        input={dialog?.input}
        onConfirm={async (value) => {
          if (!pending) return;
          const done = await runResolve(pending.row.id, pending.kind, value);
          if (done || pending.kind === "recover" || pending.kind === "poll") setPending(null);
        }}
        onClose={() => !resolving && setPending(null)}
      />
    </>
  );
}
