"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { RefreshCw, ShieldAlert, Banknote, HandCoins, AlertTriangle, Inbox } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { Button } from "@/components/ui/Button";
import { formatINR } from "@/lib/utils";

type MoneyAtRisk = {
  generatedAt: string;
  payoutReview: { count: number; exposure: number };
  txnReview: { count: number; exposure: number };
  txnAnomalies: { count: number; exposure: number };
  outstandingLiens: { count: number; amount: number };
  totalAtRisk: number;
};

export default function MoneyAtRiskPage() {
  const [data, setData] = useState<MoneyAtRisk | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/exposure");
      const d = await res.json();
      if (!res.ok) throw new Error(typeof d?.error === "string" ? d.error : "Failed to load");
      setData(d);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <PageHeader
        title="Money at Risk"
        description={
          data
            ? `Total at risk ${formatINR(data.totalAtRisk)} — held payouts, held transactions, open provider-outcome anomalies, and outstanding liens, consolidated.`
            : "Every rupee currently exposed but not yet resolved, in one place."
        }
        icon={ShieldAlert}
        actions={
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`mr-1.5 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      <div className="mb-4">
        <StatCard
          label="Total at risk"
          value={data ? formatINR(data.totalAtRisk) : "—"}
          icon={ShieldAlert}
          tone="coral"
          loading={loading}
          hint={data ? `as of ${new Date(data.generatedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}` : undefined}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Payouts under review"
          value={data ? formatINR(data.payoutReview.exposure) : "—"}
          icon={Banknote}
          tone="amber"
          href="/dashboard/admin/payout-review"
          loading={loading}
          hint={data ? `${data.payoutReview.count} held after an indeterminate send` : undefined}
        />
        <StatCard
          label="Transactions under review"
          value={data ? formatINR(data.txnReview.exposure) : "—"}
          icon={Inbox}
          tone="amber"
          href="/dashboard/admin/needs-review"
          loading={loading}
          hint={data ? `${data.txnReview.count} held bill/recharge payments` : undefined}
        />
        <StatCard
          label="Outcome anomalies"
          value={data ? formatINR(data.txnAnomalies.exposure) : "—"}
          icon={AlertTriangle}
          tone="coral"
          loading={loading}
          hint={data ? `${data.txnAnomalies.count} clawbacks / false refunds / mismatches` : undefined}
        />
        <StatCard
          label="Outstanding liens"
          value={data ? formatINR(data.outstandingLiens.amount) : "—"}
          icon={HandCoins}
          tone="royal"
          href="/dashboard/admin/wallet-ops"
          loading={loading}
          hint={data ? `${data.outstandingLiens.count} active · recovering from retailers` : undefined}
        />
      </div>
    </>
  );
}
