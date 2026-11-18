import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminActivity } from "@/lib/security/adminActivity";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/security/rateLimit";
import { toErrorResponse } from "@/lib/security/apiErrors";
import { correctOneTransaction } from "@/lib/recon/reconcileOne";

/**
 * Admin "Resolve / verify with provider" action for a single transaction.
 *
 * Never flips money on an admin's say-so: correctOneTransaction re-checks the
 * provider's own status API (by any stored ref + an optional admin-supplied
 * pay-step ref recovered from the provider panel) and only then settles,
 * refunds, or — for a wrongly-FAILED row the provider confirms SUCCESS —
 * corrects it with a LIEN clawback of any earlier refund (never a negative
 * wallet).
 *
 * forceRefundNotFound: when the admin has verified in the provider panel that
 * the transaction does not exist and the status API returns UNRESOLVED for all
 * refs, this flag authorises an immediate refund of the held reserve.
 */

export const fetchCache = "force-no-store";
export const dynamic = "force-dynamic";

const PostBody = z
  .object({
    refId: z.string().trim().min(1),
    providerRef: z.string().trim().min(1).optional(),
    remarks: z.string().trim().max(500).optional(),
    forceRefundNotFound: z.boolean().optional(),
  })
  .strict();

export async function POST(req: Request) {
  try {
    const actor = await requireAdminActivity(req, {
      action: "txn.resolve",
      roles: ["MASTER_ADMIN", "ADMIN"],
      entity: "Transaction",
    });
    await enforceRateLimit(`txn:resolve:${actor.id}`, RATE_LIMITS.sensitiveWrite);

    const parsed = PostBody.safeParse(await req.json());
    if (!parsed.success)
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const result = await correctOneTransaction(parsed.data.refId, {
      actorId: actor.id,
      providerRef: parsed.data.providerRef,
      source: "admin_resolve",
      remarks: parsed.data.remarks,
      forceRefundNotFound: parsed.data.forceRefundNotFound,
    });

    if (!result.found)
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });

    if (result.outcome === "unresolved")
      return NextResponse.json({ ...result }, { status: 409 });

    if (result.outcome === "amount_mismatch")
      return NextResponse.json({ ...result }, { status: 422 });

    return NextResponse.json(result);
  } catch (e) {
    return toErrorResponse(e);
  }
}
