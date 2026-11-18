/**
 * GET  /api/network/kits  — list the caller's kits (optionally filtered by status)
 * POST /api/network/kits  — purchase N kits from the caller's wallet (requires x-txn-pin header)
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, AuthError } from "@/lib/auth-server";
import { prisma } from "@/lib/db";
import { toErrorResponse } from "@/lib/security/apiErrors";
import { requireTxnPin, TxnPinError } from "@/lib/security/txnPin";
import { clientIp } from "@/lib/security/audit";
import {
  buyKits,
  getKitPrice,
  getKitTypeForRole,
  KIT_REQUIRED_ROLES,
  KIT_TYPE_LABEL,
  KIT_TYPE_TO_CHILD_ROLE,
} from "@/lib/kit/service";
import type { KitStatus } from "@prisma/client";

export const fetchCache = "force-no-store";
export const dynamic = "force-dynamic";

const VALID_STATUSES: KitStatus[] = ["AVAILABLE", "RESERVED", "ASSIGNED", "ACTIVE", "COOLING"];

// ── GET — list caller's kits ─────────────────────────────────────────────────

export async function GET(req: Request) {
  try {
    const user = await requireAuth();

    if (!KIT_REQUIRED_ROLES.includes(user.role)) {
      return NextResponse.json({ error: "Only SD/MD/DT can manage kits" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status");
    const page  = Math.max(1, parseInt(searchParams.get("page")  ?? "1"));
    const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "50"));

    const statusFilter: KitStatus[] | undefined =
      statusParam && VALID_STATUSES.includes(statusParam as KitStatus)
        ? [statusParam as KitStatus]
        : undefined;

    const where = {
      ownerId: user.id,
      ...(statusFilter ? { status: { in: statusFilter } } : {}),
    };

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
          coolingEndsAt:  true,
          invite: {
            select: {
              id:   true,
              name: true,
              phone: true,
              email: true,
              role:  true,
            },
          },
          activatedFor: {
            select: {
              id:       true,
              name:     true,
              userCode: true,
              role:     true,
            },
          },
        },
      }),
      prisma.userKit.count({ where }),
    ]);

    // Counts by status for the UI tabs
    const statusCounts = await prisma.userKit.groupBy({
      by: ["status"],
      where: { ownerId: user.id },
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

// ── POST — buy kits ──────────────────────────────────────────────────────────

const BuyBody = z.object({
  quantity: z.number().int().min(1).max(100),
});

export async function POST(req: Request) {
  try {
    const user = await requireAuth();

    if (!KIT_REQUIRED_ROLES.includes(user.role)) {
      return NextResponse.json({ error: "Only SD/MD/DT can purchase kits" }, { status: 403 });
    }

    const kitType = getKitTypeForRole(user.role);
    if (!kitType) {
      return NextResponse.json({ error: "No kit type configured for your role" }, { status: 400 });
    }

    // Verify T-Pin (travels in x-txn-pin header — never in the body).
    await requireTxnPin(user, req, { action: "kit.buy", ip: clientIp(req) });

    const parsed = BuyBody.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { quantity } = parsed.data;
    const price = await getKitPrice(kitType);
    const totalCost = price * quantity;
    const childRole = KIT_TYPE_TO_CHILD_ROLE[kitType];

    const result = await buyKits(user.id, user.role, quantity);

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "kit.purchased",
        entity: "UserKit",
        entityId: result.kits[0]?.id ?? "batch",
        meta: {
          kitType,
          childRole,
          quantity,
          totalCost,
          kitIds: result.kits.map((k) => k.id),
          userCodes: result.kits.map((k) => k.userCode),
          walletTxnId: result.walletTxnId,
        },
        ip: clientIp(req),
      },
    });

    return NextResponse.json(
      {
        ok: true,
        kits: result.kits,
        totalCharged: result.totalCharged,
        kitTypeLabel: KIT_TYPE_LABEL[kitType],
        message: `${quantity} ${KIT_TYPE_LABEL[kitType]}(s) purchased successfully`,
      },
      { status: 201 }
    );
  } catch (e) {
    if (e instanceof AuthError)
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    if (e instanceof TxnPinError)
      return NextResponse.json(
        { error: e.message, code: e.code },
        { status: e.statusCode, headers: e.retryAfterSec ? { "Retry-After": String(e.retryAfterSec) } : {} }
      );
    return toErrorResponse(e);
  }
}
