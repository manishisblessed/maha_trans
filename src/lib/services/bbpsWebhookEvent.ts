import { prisma } from "@/lib/db";
import { reconcileNonTerminalByRef } from "@/lib/recon/reconcileOne";
import { deriveTxnRefs } from "@/lib/recon/refs";
import type { SamedayWebhookCtx, WebhookResult } from "@/lib/partners/sameday-webhook";

/**
 * Process a verified Same Day BBPS-2 / Pay2New event. Never trusts the body's
 * claimed status: it mines every provider reference the payload carries and
 * re-verifies against Pay2New's own status API inside reconcileNonTerminalByRef,
 * settling/refunding only non-terminal rows via the shared idempotent finalizer.
 * The polling reconciler stays as the safety net for anything unmatched.
 */
export async function handleBbpsWebhookEvent(
  body: Record<string, unknown>,
  ctx: SamedayWebhookCtx
): Promise<WebhookResult> {
  const candidateRefs = deriveTxnRefs({ response: body });
  if (candidateRefs.length === 0) {
    return { status: 200, body: { ok: true, action: "ignored", reason: "no reference in payload" } };
  }

  // The strongest alternate ref (operator_reference) helps the provider resolve
  // a row whose stored partnerTxnId is blank (lost pay-step response).
  const providerRef =
    (typeof body.operator_reference === "string" && body.operator_reference) ||
    (typeof body.operatorReference === "string" && body.operatorReference) ||
    undefined;

  let handled: Awaited<ReturnType<typeof reconcileNonTerminalByRef>> | null = null;
  for (const ref of candidateRefs) {
    const result = await reconcileNonTerminalByRef(ref, { source: "pay2new_webhook", providerRef });
    if (result.found) {
      handled = result;
      break;
    }
  }

  if (!handled || !handled.found) {
    return { status: 200, body: { ok: true, action: "unmatched" } };
  }

  await prisma.auditLog
    .create({
      data: {
        action: "bbps.webhook.reconciled",
        entity: "Transaction",
        entityId: handled.refId,
        meta: {
          outcome: handled.outcome,
          providerStatus: handled.providerStatus,
          rail: handled.rail,
          event: ctx.eventHeader ?? null,
          signatureVerified: ctx.verified,
          deliveryId: ctx.deliveryId ?? null,
        },
      },
    })
    .catch(() => {});

  return { status: 200, body: { ok: true, refId: handled.refId, outcome: handled.outcome } };
}
