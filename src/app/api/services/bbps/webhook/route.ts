import { NextResponse } from "next/server";
import { ingestSamedayWebhook } from "@/lib/partners/sameday-webhook";
import { handleBbpsWebhookEvent } from "@/lib/services/bbpsWebhookEvent";

export const fetchCache = "force-no-store";
export const dynamic = "force-dynamic";

/**
 * POST /api/services/bbps/webhook — Same Day BBPS-2 / Pay2New callback.
 *
 * A thin wrapper: the shared ingress verifies the signature (fail-closed in
 * prod) + dedupes, then the BBPS handler re-verifies the bill payment against
 * Pay2New's status API and settles/refunds the matching transaction. The unified
 * /api/sameday/webhook endpoint reuses the exact same handler. Kept as a
 * dedicated URL for direct BBPS-2/Pay2New channel subscription.
 */
export async function POST(req: Request) {
  const ingress = await ingestSamedayWebhook(req, "bbps.webhook.misconfigured");
  if (!ingress.proceed) {
    return NextResponse.json(ingress.body, { status: ingress.status });
  }
  const result = await handleBbpsWebhookEvent(ingress.body, ingress);
  return NextResponse.json(result.body, { status: result.status });
}
