import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-server";
import { toErrorResponse } from "@/lib/security/apiErrors";
import { getMoneyAtRisk } from "@/lib/recon/exposure";

/**
 * GET /api/admin/exposure
 *
 * Consolidated money-at-risk snapshot: NEEDS_REVIEW payout + transaction exposure,
 * open outcome-anomaly exposure, and outstanding (ACTIVE) lien balances. Read-only.
 */

export const fetchCache = "force-no-store";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireRole("MASTER_ADMIN", "ADMIN");
    const data = await getMoneyAtRisk();
    return NextResponse.json(data);
  } catch (e) {
    return toErrorResponse(e);
  }
}
