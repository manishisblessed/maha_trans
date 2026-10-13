/**
 * Money-at-risk aggregation.
 *
 * A single consolidated view of every rupee the platform is currently exposed on
 * but has NOT yet resolved — so ops can see the total at a glance and act before
 * it ages into a loss. Buckets:
 *
 *   1. payoutReview   — payouts HELD as NEEDS_REVIEW (INDETERMINATE send; funds
 *                       still reserved, bank may or may not have disbursed).
 *   2. txnReview      — service transactions HELD as NEEDS_REVIEW (INDETERMINATE
 *                       bill/recharge outcome; reserve held, not refunded).
 *   3. txnAnomalies   — open provider-outcome anomalies (clawbacks, false refunds,
 *                       amount mismatches) detected by the verification sweep.
 *   4. outstandingLiens — ACTIVE liens still being clawed back from retailers
 *                       (Σ amount − recoveredAmount): money we are owed.
 *
 * Read-only. Never moves money.
 */
import { prisma } from "@/lib/db";
import { toNumber } from "@/lib/money";
import { getOutcomeAnomalyExposure } from "@/lib/recon/clawbackDetect";
import { sendOpsAlert } from "@/lib/monitoring/alerts";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "recon/exposure" });

const RISK_ALERT_MIN_TOTAL = Number(process.env.RISK_ALERT_MIN_TOTAL ?? 100_000); // ₹1L
const RISK_ALERT_MIN_PAYOUTS = Number(process.env.RISK_ALERT_MIN_PAYOUTS ?? 5);
const RISK_ALERT_MIN_ANOMALIES = Number(process.env.RISK_ALERT_MIN_ANOMALIES ?? 10);

export type MoneyAtRisk = {
  generatedAt: string;
  payoutReview: { count: number; exposure: number };
  txnReview: { count: number; exposure: number };
  txnAnomalies: { count: number; exposure: number };
  outstandingLiens: { count: number; amount: number };
  totalAtRisk: number;
};

export async function getMoneyAtRisk(): Promise<MoneyAtRisk> {
  const [payoutAgg, txnAgg, lienAgg, anomaly] = await Promise.all([
    prisma.payoutRequest.aggregate({
      where: { status: "NEEDS_REVIEW" },
      _sum: { totalDebit: true },
      _count: true,
    }),
    prisma.transaction.aggregate({
      where: { status: "NEEDS_REVIEW", isSettlement: false },
      _sum: { amount: true, fee: true },
      _count: true,
    }),
    prisma.walletLien.aggregate({
      where: { status: "ACTIVE" },
      _sum: { amount: true, recoveredAmount: true },
      _count: true,
    }),
    getOutcomeAnomalyExposure(),
  ]);

  const payoutExposure = toNumber(payoutAgg._sum.totalDebit ?? 0);
  const txnExposure = toNumber(txnAgg._sum.amount ?? 0) + toNumber(txnAgg._sum.fee ?? 0);
  const lienOutstanding = Math.max(
    0,
    toNumber(lienAgg._sum.amount ?? 0) - toNumber(lienAgg._sum.recoveredAmount ?? 0)
  );

  return {
    generatedAt: new Date().toISOString(),
    payoutReview: { count: payoutAgg._count, exposure: payoutExposure },
    txnReview: { count: txnAgg._count, exposure: txnExposure },
    txnAnomalies: { count: anomaly.count, exposure: anomaly.exposure },
    outstandingLiens: { count: lienAgg._count, amount: lienOutstanding },
    totalAtRisk: payoutExposure + txnExposure + anomaly.exposure + lienOutstanding,
  };
}

/**
 * Scheduled threshold check. Fires a single consolidated ops alert when the
 * money-at-risk total or any bucket count crosses its configured threshold.
 */
export async function runExposureThresholdAlert(): Promise<{ breached: boolean; risk: MoneyAtRisk }> {
  const risk = await getMoneyAtRisk();
  const reasons: string[] = [];
  if (risk.totalAtRisk >= RISK_ALERT_MIN_TOTAL) {
    reasons.push(`total at risk ₹${risk.totalAtRisk.toFixed(2)} ≥ ₹${RISK_ALERT_MIN_TOTAL}`);
  }
  if (risk.payoutReview.count >= RISK_ALERT_MIN_PAYOUTS) {
    reasons.push(`${risk.payoutReview.count} payouts awaiting review`);
  }
  if (risk.txnAnomalies.count >= RISK_ALERT_MIN_ANOMALIES) {
    reasons.push(`${risk.txnAnomalies.count} open outcome anomalies`);
  }

  if (reasons.length > 0) {
    void sendOpsAlert({
      title: "Money-at-risk threshold breached",
      severity: "critical",
      details: {
        totalAtRisk: risk.totalAtRisk,
        payoutReviewCount: risk.payoutReview.count,
        txnReviewCount: risk.txnReview.count,
        anomalyCount: risk.txnAnomalies.count,
        outstandingLienAmount: risk.outstandingLiens.amount,
        reasons: reasons.join("; "),
      },
    }).catch(() => {});
    log.warn({ reasons, totalAtRisk: risk.totalAtRisk }, "money-at-risk threshold breached");
  }

  return { breached: reasons.length > 0, risk };
}
