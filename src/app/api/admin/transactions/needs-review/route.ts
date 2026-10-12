import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-server";
import { prisma } from "@/lib/db";
import { toErrorResponse } from "@/lib/security/apiErrors";

/**
 * Admin "Needs review" queue.
 *
 * Lists transactions parked in NEEDS_REVIEW — bill payments / recharges whose
 * provider outcome was INDETERMINATE (lost response, timeout, 5xx). Their funds
 * are HELD (never blind-refunded); an operator verifies each against the
 * provider panel and resolves it via POST /api/admin/transactions/resolve.
 */

export const fetchCache = "force-no-store";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireRole("MASTER_ADMIN", "ADMIN");

    const rows = await prisma.transaction.findMany({
      where: { status: "NEEDS_REVIEW" },
      orderBy: { createdAt: "asc" },
      take: 200,
      select: {
        id: true,
        refId: true,
        service: true,
        partner: true,
        partnerTxnId: true,
        amount: true,
        fee: true,
        status: true,
        errorCode: true,
        errorMessage: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({
      rows: rows.map((t) => ({
        id: t.id,
        refId: t.refId,
        service: t.service,
        partner: t.partner,
        partnerTxnId: t.partnerTxnId,
        amount: Number(t.amount),
        fee: Number(t.fee),
        status: t.status,
        errorCode: t.errorCode,
        errorMessage: t.errorMessage,
        createdAt: t.createdAt.toISOString(),
        user: t.user,
      })),
    });
  } catch (e) {
    return toErrorResponse(e);
  }
}
