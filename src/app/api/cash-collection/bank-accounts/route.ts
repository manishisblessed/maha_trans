/**
 * /api/cash-collection/bank-accounts
 *
 * GET — list active company bank accounts available for users to deposit into.
 *        Returns only the info needed to display the deposit form (no internal notes).
 */
import { NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/auth-server";
import { prisma } from "@/lib/db";

export const fetchCache = "force-no-store";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAuth();
  } catch (e) {
    if (e instanceof AuthError)
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    throw e;
  }

  const accounts = await prisma.companyBankAccount.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      accountName: true,
      bankName: true,
      accountNumber: true,
      ifscCode: true,
      branch: true,
      upiId: true,
      acceptedModes: true,
      chargeType: true,
      chargeValue: true,
      chargeGstInclusive: true,
      defaultTargetWallet: true,
    },
  });

  return NextResponse.json({ accounts });
}
