import { NextResponse } from "next/server";
import { ingestSamedayWebhook } from "@/lib/partners/sameday-webhook";
import { handlePayoutWebhookEvent } from "@/lib/payout/webhookEvent";

export const fetchCache = "force-no-store";
export const dynamic = "force-dynamic";

/**
 * POST /api/payout/webhook — Same Day payout/settlement callback.
 *
 * Payouts disburse via the Same Day Settlement rail. A thin wrapper: the shared
 * ingress verifies the signature (fail-closed in prod) + dedupes, then the
 * payout handler matches the PayoutRequest by the Same Day reference and
 * reconciles it the idempotent, provider-VERIFIED way. The unified
 * /api/sameday/webhook endpoint reuses the exact same handler. Kept as a
 * dedicated URL for backward compatibility.
 */
export async function POST(req: Request) {
  const ingress = await ingestSamedayWebhook(req, "payout.webhook.misconfigured");
  if (!ingress.proceed) {
    return NextResponse.json(ingress.body, { status: ingress.status });
  }
  const result = await handlePayoutWebhookEvent(ingress.body, ingress);
  return NextResponse.json(result.body, { status: result.status });
}
