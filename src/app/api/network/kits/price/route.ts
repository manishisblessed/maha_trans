/**
 * GET /api/network/kits/price
 *
 * Returns the current admin-configured kit price for the caller's child role.
 * Used by the Buy Kits modal to show the live price before purchase.
 */

import { NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/auth-server";
import { toErrorResponse } from "@/lib/security/apiErrors";
import {
  getKitTypeForRole,
  getKitPrice,
  KIT_REQUIRED_ROLES,
  KIT_TYPE_LABEL,
  KIT_TYPE_TO_CHILD_ROLE,
} from "@/lib/kit/service";

export const fetchCache = "force-no-store";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireAuth();

    if (!KIT_REQUIRED_ROLES.includes(user.role)) {
      return NextResponse.json({ error: "Only SD/MD/DT can view kit pricing" }, { status: 403 });
    }

    const kitType = getKitTypeForRole(user.role);
    if (!kitType) {
      return NextResponse.json({ error: "No kit type for your role" }, { status: 400 });
    }

    const price     = await getKitPrice(kitType);
    const childRole = KIT_TYPE_TO_CHILD_ROLE[kitType];
    const label     = KIT_TYPE_LABEL[kitType];

    return NextResponse.json({ kitType, label, childRole, price });
  } catch (e) {
    if (e instanceof AuthError)
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    return toErrorResponse(e);
  }
}
