import { prisma } from "@/lib/db";
import { rechargekitStatus } from "@/lib/partners/sameday-rechargekit";
import { sendOpsAlert } from "@/lib/monitoring/alerts";
import { logger } from "@/lib/logger";
import { deriveTxnRefs } from "./refs";
import { finalizeServiceTransaction, FINALIZABLE_TXN_SELECT } from "@/lib/services/finalize";

/**
 * RechargeKit CC-2 reconciliation — mirrors the BBPS sweep for the SameDay
 * RechargeKit rail. Polls non-terminal RechargeKit transactions (PROCESSING
 * from a PENDING pay, or NEEDS_REVIEW held from an INDETERMINATE pay) and
 * settles / refunds them through the single shared finalizer. Held rows whose
 * pay response was lost are polled by any ref mined from the request/response
 * (txn_id / request_id), so a blank partnerTxnId is not a dead end.
 */

const RK_PARTNER = "SAMEDAY_RECHARGEKIT";
const DRAIN_AGE_MS = 2 * 60_000;
const STUCK_THRESHOLD_MS = 60 * 60_000;

export type RechargekitReconSummary = {
  ranAt: string;
  drained: number;
  settled: number;
  refunded: number;
  stuck: number;
  heldEscalated: number;
  skipped: boolean;
};

type RkStatus = "SUCCESS" | "PENDING" | "FAILED" | "REFUNDED";

async function tryResolve(txn: {
  partnerTxnId: string | null;
  request: unknown;
  response: unknown;
}): Promise<{ status: RkStatus; payRef: string | null; raw: unknown } | null> {
  const refs = deriveTxnRefs({ partnerTxnId: txn.partnerTxnId, request: txn.request, response: txn.response });
  for (const ref of refs) {
    let r = await rechargekitStatus({ txnId: ref });
    if (!r.ok) r = await rechargekitStatus({ requestId: ref });
    if (r.ok) {
      return { status: r.data.status, payRef: r.data.txnId || r.data.requestId || ref, raw: r.raw };
    }
  }
  return null;
}

export async function runRechargekitReconciliation(): Promise<RechargekitReconSummary> {
  const ranAt = new Date().toISOString();
  const now = Date.now();
  let settled = 0;
  let refunded = 0;

  // 1. DRAIN — poll non-terminal RechargeKit txns older than 2 minutes.
  const inflight = await prisma.transaction.findMany({
    where: {
      status: { in: ["PROCESSING", "NEEDS_REVIEW"] },
      partner: RK_PARTNER,
      createdAt: { lt: new Date(now - DRAIN_AGE_MS) },
    },
    orderBy: { createdAt: "asc" },
    take: 200,
    select: { ...FINALIZABLE_TXN_SELECT, request: true, response: true, createdAt: true },
  });

  let drained = 0;
  for (const txn of inflight) {
    try {
      const resolved = await tryResolve(txn);
      if (!resolved || resolved.status === "PENDING") {
        drained++;
        continue;
      }
      const out = await finalizeServiceTransaction({
        txn,
        status: resolved.status === "SUCCESS" ? "SUCCESS" : resolved.status === "REFUNDED" ? "REFUNDED" : "FAILED",
        partnerTxnId: resolved.payRef,
        errorCode: resolved.status !== "SUCCESS" ? "RECHARGEKIT_PROVIDER_FAILED" : undefined,
        errorMessage:
          resolved.status !== "SUCCESS" ? `Provider reported ${resolved.status} during reconciliation` : undefined,
        raw: resolved.raw,
        source: "recon",
      });
      if (out.outcome === "settled") settled++;
      else if (out.outcome === "refunded") refunded++;
      drained++;
    } catch (err) {
      logger.warn({ action: "recon.rechargekit_poll_failed", txnId: txn.id, err: String(err) });
    }
  }

  // 2a. STUCK (PROCESSING) — warn.
  const stillStuck = await prisma.transaction.findMany({
    where: { status: "PROCESSING", partner: RK_PARTNER, createdAt: { lt: new Date(now - STUCK_THRESHOLD_MS) } },
    select: { id: true, refId: true, createdAt: true },
  });
  if (stillStuck.length > 0) {
    await sendOpsAlert({
      title: "RechargeKit transactions stuck in PROCESSING",
      severity: "warning",
      details: {
        count: stillStuck.length,
        oldest: stillStuck[0].createdAt.toISOString(),
        refIds: stillStuck.slice(0, 10).map((r) => r.refId).join(", "),
      },
    });
  }

  // 2b. HELD (NEEDS_REVIEW) — funds NOT refunded; escalate loud, de-duped.
  let heldEscalated = 0;
  const heldStuck = await prisma.transaction.findMany({
    where: { status: "NEEDS_REVIEW", partner: RK_PARTNER, createdAt: { lt: new Date(now - STUCK_THRESHOLD_MS) } },
    select: { id: true, refId: true, userId: true, createdAt: true },
  });
  for (const row of heldStuck) {
    const already = await prisma.auditLog.findFirst({
      where: { entityId: row.id, action: "recon.needs_review_escalated" },
      select: { id: true },
    });
    if (already) continue;
    await prisma.auditLog.create({
      data: {
        userId: row.userId,
        action: "recon.needs_review_escalated",
        entity: "Transaction",
        entityId: row.id,
        meta: { refId: row.refId, heldSince: row.createdAt.toISOString() },
      },
    });
    heldEscalated++;
  }
  if (heldEscalated > 0) {
    await sendOpsAlert({
      title: "RechargeKit payments HELD for review — funds NOT refunded (possible provider charge)",
      severity: "critical",
      details: {
        count: heldEscalated,
        oldest: heldStuck[0]?.createdAt.toISOString() ?? null,
        refIds: heldStuck.slice(0, 10).map((r) => r.refId).join(", "),
      },
    });
  }

  const summary: RechargekitReconSummary = {
    ranAt,
    drained,
    settled,
    refunded,
    stuck: stillStuck.length,
    heldEscalated,
    skipped: false,
  };
  await prisma.auditLog.create({
    data: { action: "recon.rechargekit_recon", entity: "System", meta: { ...summary } },
  });
  return summary;
}
