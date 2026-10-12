import { prisma } from "@/lib/db";
import { verifySamedayPosWebhook } from "./sameday-pos";

/**
 * Shared ingress for ALL incoming Same Day webhooks (POS, Payout/Settlement,
 * BBPS-2/Pay2New). Same Day signs every channel with the one shared secret
 * (SAMEDAY_POS_WEBHOOK_SECRET) and routes by the X-Sameday-Event header, so the
 * verify + replay + dedupe logic is identical everywhere and lives here once.
 */

export type SamedayWebhookCtx = {
  /** X-Sameday-Event (lowercased by callers when dispatching). */
  eventHeader: string | null;
  /** X-Sameday-Delivery — the idempotency id. */
  deliveryId: string | null;
  /** True when the HMAC signature was present and valid. */
  verified: boolean;
};

/** A plain (status, body) pair so handlers stay framework-agnostic. */
export type WebhookResult = { status: number; body: Record<string, unknown> };

export type SamedayIngress =
  | ({ proceed: true; body: Record<string, unknown> } & SamedayWebhookCtx)
  | ({ proceed: false } & WebhookResult);

/**
 * Read + verify + dedupe a Same Day webhook request. Returns `proceed: false`
 * with a ready (status, body) response for every terminal case (bad/stale/absent
 * signature, missing prod secret, bad JSON, duplicate delivery); otherwise
 * `proceed: true` with the parsed body and the header context to dispatch on.
 */
export async function ingestSamedayWebhook(
  req: Request,
  misconfiguredAction: string
): Promise<SamedayIngress> {
  // Raw body FIRST — the HMAC covers the exact bytes, before any JSON parse.
  const rawBody = await req.text();
  const signature = req.headers.get("x-sameday-signature");
  const timestamp = req.headers.get("x-sameday-timestamp");
  const deliveryId = req.headers.get("x-sameday-delivery");
  const eventHeader = req.headers.get("x-sameday-event");

  const verdict = verifySamedayPosWebhook(rawBody, signature, timestamp);
  if (verdict === "MISCONFIGURED") {
    // Production without a signing secret: refuse to process UNVERIFIED. 503 (not
    // 2xx) so Same Day keeps retrying while ops is alerted to add the secret.
    await prisma.auditLog
      .create({
        data: {
          action: misconfiguredAction,
          entity: "PosWebhookDelivery",
          entityId: deliveryId ?? "unknown",
          meta: {
            reason: "SAMEDAY_POS_WEBHOOK_SECRET missing in production",
            event: eventHeader ?? null,
            deliveryId: deliveryId ?? null,
          },
        },
      })
      .catch(() => {});
    return { proceed: false, status: 503, body: { error: "Webhook signing secret not configured" } };
  }
  if (verdict === "STALE") return { proceed: false, status: 400, body: { error: "Stale timestamp" } };
  if (verdict === "INVALID") return { proceed: false, status: 401, body: { error: "Invalid signature" } };
  const verified = verdict === "VALID";

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return { proceed: false, status: 400, body: { error: "Invalid JSON" } };
  }

  // Idempotency: dedupe on X-Sameday-Delivery (globally unique across channels,
  // so a single shared PosWebhookDelivery ledger is correct for all of them).
  if (deliveryId) {
    const existing = await prisma.posWebhookDelivery.findUnique({ where: { deliveryId } });
    if (existing) return { proceed: false, status: 200, body: { ok: true, action: "duplicate" } };
    try {
      await prisma.posWebhookDelivery.create({
        data: { deliveryId, event: eventHeader ?? String(body.event ?? "unknown") },
      });
    } catch (e) {
      // P2002 = unique race: another request beat us — treat as duplicate.
      if ((e as { code?: string }).code === "P2002") {
        return { proceed: false, status: 200, body: { ok: true, action: "duplicate" } };
      }
      throw e;
    }
  }

  return { proceed: true, body, eventHeader, deliveryId, verified };
}
