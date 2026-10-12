import { handlePosCapture, handlePosReversal } from "@/lib/settlement/pos";
import { canonicalPosCaptureRef } from "@/lib/partners/sameday-pos";
import { prisma } from "@/lib/db";
import { lookupBin, classificationFromBin } from "@/lib/pos/binLookup";
import { isCardClassificationEnabled } from "@/lib/settings";
import { upsertMirrorFromWebhook } from "@/lib/pos/mirror";
import type { SamedayWebhookCtx, WebhookResult } from "@/lib/partners/sameday-webhook";

const REVERSED_STATUSES = new Set(["FAILED", "VOIDED", "REFUNDED"]);

/**
 * Process a verified Same Day POS event (already signature-checked + deduped by
 * the ingress). Handles two event types:
 *   - "pos.transaction"          — normal capture (settle)
 *   - "pos.transaction.reversed" — a prior CAPTURED swipe voided/failed/refunded
 * Anything else is acked (200) so Same Day stops retrying.
 */
export async function handlePosWebhookEvent(
  txnData: Record<string, unknown>,
  ctx: SamedayWebhookCtx
): Promise<WebhookResult> {
  const { eventHeader, deliveryId, verified } = ctx;

  // ── Reversal event: pos.transaction.reversed ────────────────────────────
  // ANY "pos.transaction.reversed" with action "remove" is treated as a reversal
  // regardless of the specific status value (FAILED | VOIDED | REFUNDED).
  const eventType = (eventHeader ?? String(txnData.event ?? "")).toLowerCase();
  if (
    eventType === "pos.transaction.reversed" ||
    String(txnData.action ?? "").toLowerCase() === "remove"
  ) {
    const terminalId = String(txnData.terminal_id ?? txnData.tid ?? "");
    const rrn = String(txnData.rrn ?? txnData.rrNumber ?? "");
    const reversalRef = canonicalPosCaptureRef({
      rrn,
      terminalId,
      fallbackId: String(txnData.txn_id ?? txnData.txnId ?? ""),
    });
    if (!reversalRef) {
      return { status: 400, body: { error: "Missing transaction reference" } };
    }

    const rawStatus = String(txnData.status ?? "").toUpperCase();
    const newStatus: "VOIDED" | "REFUNDED" =
      rawStatus === "REFUNDED" ? "REFUNDED" : "VOIDED";

    const wasSettledFlag = Boolean(txnData.was_settled);
    const result = await handlePosReversal({
      transactionRef: reversalRef,
      status: newStatus,
      reason: String(txnData.reason ?? txnData.reversal_reason ?? "").trim() || null,
      reversedAt: (txnData.reversed_at as string | undefined) ?? null,
      source: "WEBHOOK",
    });

    await prisma.auditLog.create({
      data: {
        action: "pos.webhook.reversal",
        entity: "PosSettlementEntry",
        entityId: reversalRef,
        meta: {
          status: newStatus,
          rawStatus,
          outcome: result.outcome,
          wasSettled: result.wasSettled ?? false,
          wasSettledUpstream: wasSettledFlag,
          needsManualReview: wasSettledFlag || result.wasSettled,
          previousStatus: String(txnData.previous_status ?? "") || null,
          reason: String(txnData.reason ?? "") || null,
          terminalId: terminalId || null,
          signatureVerified: verified,
          deliveryId: deliveryId ?? null,
        },
      },
    });

    return { status: 200, body: { ok: true, action: "reversed", ...result } };
  }

  // ── Normal capture: "pos.transaction" ───────────────────────────────────
  const mappedStatus = String(txnData.mappedStatus ?? "").toUpperCase();
  if (mappedStatus !== "CAPTURED") {
    return { status: 200, body: { ok: true, action: "ignored", status: mappedStatus } };
  }

  const rawCaptureStatus = String(txnData.status ?? "").toUpperCase();
  if (REVERSED_STATUSES.has(rawCaptureStatus) || txnData.reversed_at != null) {
    return { status: 200, body: { ok: true, action: "ignored", reason: "reversed upstream" } };
  }

  const terminalId = String(txnData.tid ?? "");
  const rrn = String(txnData.rrNumber ?? txnData.rrn ?? "");
  const transactionRef = canonicalPosCaptureRef({
    rrn,
    terminalId,
    fallbackId: String(txnData.txnId ?? ""),
  });
  if (!transactionRef) {
    return { status: 400, body: { error: "Missing transaction reference" } };
  }

  // `amount` is an integer in PAISE (e.g. 129998 = ₹1299.98) → convert to rupees.
  const grossAmount = Number(txnData.amount ?? 0) / 100;
  if (!(grossAmount > 0)) {
    return { status: 400, body: { error: "Invalid amount" } };
  }
  const paymentMode = "CARD";
  const cardType = String(txnData.paymentCardType ?? "").toUpperCase() || undefined;
  const brandType = String(txnData.paymentCardBrand ?? "").toUpperCase() || undefined;
  let classification = String(txnData.cardClassification ?? "").toUpperCase() || undefined;
  const providerRaw = String(txnData.acquiringBank ?? "").trim();
  const provider = providerRaw ? providerRaw.toUpperCase() : undefined;

  // BIN enrichment: derive card classification from masked PAN when not provided.
  const cardNumber = String(txnData.formattedPan ?? txnData.maskedCardNumber ?? "").replace(/\D/g, "");
  if (!classification && cardNumber.length >= 6 && paymentMode === "CARD" && (await isCardClassificationEnabled())) {
    try {
      const binData = await lookupBin(cardNumber);
      if (binData) {
        classification = classificationFromBin(binData) ?? classification;
      }
    } catch {
      // Non-blocking: settle without classification if BIN lookup fails
    }
  }

  const result = await handlePosCapture({
    transactionRef,
    terminalId: terminalId || undefined,
    grossAmount,
    paymentMode,
    provider,
    cardType,
    brandType,
    classification,
  });

  // Mirror the capture into the display read-model. Best-effort: a mirror write
  // must never fail the webhook or block settlement.
  const maskedPan = String(txnData.formattedPan ?? txnData.maskedCardNumber ?? "").trim() || null;
  const capturedAt = (() => {
    for (const raw of [txnData.txnTime, txnData.transactionTime, txnData.txnDate, txnData.createdAt]) {
      if (raw == null) continue;
      const d = new Date(String(raw));
      if (!Number.isNaN(d.getTime())) return d;
    }
    return null;
  })();
  try {
    await upsertMirrorFromWebhook({
      transactionRef,
      terminalId,
      grossAmount,
      paymentMode,
      status: "CAPTURED",
      rrn: rrn || null,
      cardType,
      cardBrand: brandType,
      cardClassification: classification ?? null,
      cardNumber: maskedPan,
      acquiringBank: provider ?? null,
      authCode: String(txnData.authCode ?? txnData.authcode ?? "").trim() || null,
      customerName: String(txnData.customerName ?? txnData.cardHolderName ?? "").trim() || null,
      mid: String(txnData.mid ?? "").trim() || null,
      txnTime: capturedAt,
      raw: txnData,
    });
  } catch {
    // Non-blocking: the reconciliation sweep will pick this capture up.
  }

  // Log the webhook for audit.
  await prisma.auditLog.create({
    data: {
      action: "pos.webhook.capture",
      entity: "PosSettlementEntry",
      entityId: transactionRef,
      meta: {
        status: result.status,
        grossAmount,
        netAmount: result.netAmount ?? null,
        mdrAmount: result.mdrAmount ?? null,
        mode: result.mode ?? null,
        terminalId: terminalId || null,
        paymentMode,
        provider: provider ?? null,
        signatureVerified: verified,
        deliveryId: deliveryId ?? null,
      },
    },
  });

  return { status: 200, body: { ok: true, ...result } };
}
