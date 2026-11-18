/**
 * GET /api/admin/kits
 *
 * Admin audit view of all UserKit records.
 * Supports filtering by status, kitType, ownerId (parent), and pagination.
 */

import { NextResponse } from "next/server";
import { requireRole, AuthError } from "@/lib/auth-server";
import { prisma } from "@/lib/db";
import { toErrorResponse } from "@/lib/security/apiErrors";
import type { KitStatus, KitType } from "@prisma/client";

export const fetchCache = "force-no-store";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await requireRole("MASTER_ADMIN", "ADMIN");

    const { searchParams } = new URL(req.url);
    const status   = searchParams.get("status")  as KitStatus | null;
    const kitType  = searchParams.get("kitType") as KitType | null;
    const ownerId  = searchParams.get("ownerId") ?? undefined;
    const page     = Math.max(1, parseInt(searchParams.get("page")  ?? "1"));
    const limit    = Math.min(100, parseInt(searchParams.get("limit") ?? "50"));

    const where: Record<string, unknown> = {};
    if (status)  where.status  = status;
    if (kitType) where.kitType = kitType;
    if (ownerId) where.ownerId = ownerId;

    const [kits, total] = await Promise.all([
      prisma.userKit.findMany({
        where,
        orderBy: { purchasedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id:             true,
          kitType:        true,
          userCode:       true,
          status:         true,
          purchaseAmount: true,
          purchasedAt:    true,
          reservedAt:     true,
          registeredAt:   true,
          activatedAt:    true,
          coolingStartAt: true,
          coolingEndsAt:  true,
          reviewedById:   true,
          reviewedAt:     true,
          owner: {
            select: { id: true, name: true, userCode: true, role: true },
          },
          invite: {
            select: {
              id:    true,
              name:  true,
              phone: true,
              email: true,
              role:  true,
              status: true,
            },
          },
          activatedFor: {
            select: { id: true, name: true, userCode: true, role: true },
          },
        },
      }),
      prisma.userKit.count({ where }),
    ]);

    // Status summary counts
    const statusCounts = await prisma.userKit.groupBy({
      by: ["status"],
      _count: { _all: true },
    });
    const counts = Object.fromEntries(
      statusCounts.map((r) => [r.status, r._count._all])
    );

    return NextResponse.json({ kits, total, page, limit, counts });
  } catch (e) {
    if (e instanceof AuthError)
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    return toErrorResponse(e);
  }
}
