import { NextResponse } from "next/server";
import { ingestSamedayWebhook } from "@/lib/partners/sameday-webhook";
import { handlePosWebhookEvent } from "@/lib/pos/webhookEvent";

export const fetchCache = "force-no-store";
export const dynamic = "force-dynamic";

/**
 * POST /api/pos/webhook — Same Day POS capture/reversal callback.
 *
 * A thin wrapper: the shared ingress verifies the HMAC signature (fail-closed in
 * prod), rejects stale/replayed timestamps, and dedupes on X-Sameday-Delivery;
 * the POS handler then settles captures / processes reversals. The unified
 * /api/sameday/webhook endpoint reuses the exact same handler. Kept as a
 * dedicated URL for direct POS-channel subscription and backward compatibility.
 */
export async function POST(req: Request) {
  const ingress = await ingestSamedayWebhook(req, "pos.webhook.misconfigured");
  if (!ingress.proceed) {
    return NextResponse.json(ingress.body, { status: ingress.status });
  }
  const result = await handlePosWebhookEvent(ingress.body, ingress);
  return NextResponse.json(result.body, { status: result.status });
}
