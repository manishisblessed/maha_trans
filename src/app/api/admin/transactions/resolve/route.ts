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
 * wallet). If the provider can't confirm, it returns 422 and changes nothing.
 */

export const fetchCache = "force-no-store";
export const dynamic = "force-dynamic";

const PostBody = z
  .object({
    ref: z.string().trim().min(1), // refId or partnerTxnId
    providerRef: z.string().trim().min(1).optional(), // pay-step ref from the panel
    remarks: z.string().trim().max(500).optional(),
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

    const result = await correctOneTransaction(parsed.data.ref, {
      actorId: actor.id,
      providerRef: parsed.data.providerRef,
      source: "admin_resolve",
      remarks: parsed.data.remarks,
    });

    if (!result.found) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    // Provider confirms SUCCESS but for a DIFFERENT amount than the row — almost
    // certainly a twin double-attempt (same bill_fetch_ref, two amounts). Refuse
    // the clawback and surface both amounts for a human to pick the correct leg.
    if (result.found && result.outcome === "amount_mismatch") {
      return NextResponse.json(
        {
          error:
            `Amount mismatch vs provider — the provider confirms SUCCESS for ₹${result.providerAmount ?? "?"}, ` +
            "which differs from this row's amount. This looks like a twin double-attempt; no clawback was placed. " +
            "Resolve the correct leg manually.",
          result,
        },
        { status: 409 }
      );
    }

    // Provider couldn't confirm the outcome from any reference — hold stays put.
    if (result.outcome === "unresolved") {
      return NextResponse.json(
        {
          error:
            "Provider could not confirm this payment from any reference. The hold remains in place — verify the pay-step reference in the partner panel and retry.",
          result,
        },
        { status: 422 }
      );
    }

    return NextResponse.json({ result });
  } catch (e) {
    return toErrorResponse(e);
  }
}
