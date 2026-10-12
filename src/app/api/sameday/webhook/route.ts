import { NextResponse } from "next/server";
import { ingestSamedayWebhook } from "@/lib/partners/sameday-webhook";
import { handlePosWebhookEvent } from "@/lib/pos/webhookEvent";
import { handlePayoutWebhookEvent } from "@/lib/payout/webhookEvent";
import { handleBbpsWebhookEvent } from "@/lib/services/bbpsWebhookEvent";

export const fetchCache = "force-no-store";
export const dynamic = "force-dynamic";

/**
 * POST /api/sameday/webhook — the ONE callback URL for Same Day Solution.
 *
 * Same Day signs every channel with the single shared secret
 * (SAMEDAY_POS_WEBHOOK_SECRET) and tells you what each delivery is via the
 * X-Sameday-Event header. So a single endpoint can safely serve every channel:
 * point ALL of them (Events (POS · Settlement · Payout), BBPS-2/Pay2New) here and
 * we verify + dedupe once, then dispatch by event type:
 *
 *   pos.*                       → POS capture / reversal settlement
 *   payout.* | settlement.*     → payout reconcile (provider-verified)
 *   bbps.* | pay2new.*          → Pay2New bill-payment reconcile (provider-verified)
 *
 * Every handler is idempotent and re-verifies money movement against the
 * provider's own APIs; unknown events are acked 200 so retries stop.
 */
export async function POST(req: Request) {
  const ingress = await ingestSamedayWebhook(req, "sameday.webhook.misconfigured");
  if (!ingress.proceed) {
    return NextResponse.json(ingress.body, { status: ingress.status });
  }

  const evt = (ingress.eventHeader ?? String(ingress.body.event ?? "")).toLowerCase();

  let result;
  if (evt.startsWith("payout") || evt.startsWith("settlement")) {
    result = await handlePayoutWebhookEvent(ingress.body, ingress);
  } else if (evt.startsWith("bbps") || evt.startsWith("pay2new")) {
    result = await handleBbpsWebhookEvent(ingress.body, ingress);
  } else if (evt.startsWith("pos")) {
    result = await handlePosWebhookEvent(ingress.body, ingress);
  } else {
    // No/unknown event header — infer from the payload shape so a stray delivery
    // still lands on the right handler. POS payloads carry tid/rrNumber/
    // mappedStatus or an action:"remove" reversal; otherwise assume payout.
    const b = ingress.body;
    const looksPos =
      b.mappedStatus != null ||
      b.tid != null ||
      b.rrNumber != null ||
      String(b.action ?? "").toLowerCase() === "remove";
    result = looksPos
      ? await handlePosWebhookEvent(b, ingress)
      : await handlePayoutWebhookEvent(b, ingress);
  }

  return NextResponse.json(result.body, { status: result.status });
}
