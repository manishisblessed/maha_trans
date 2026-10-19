import { NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/auth-server";
import { prisma } from "@/lib/db";
import { istDayBounds } from "@/lib/reports/daily";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const NETWORK_ROLES = new Set([
  "SUPER_DISTRIBUTOR",
  "MASTER_DISTRIBUTOR",
  "DISTRIBUTOR",
]);

const ROLE_SLUG: Record<string, string> = {
  SUPER_DISTRIBUTOR: "super-distributor",
  MASTER_DISTRIBUTOR: "master-distributor",
  DISTRIBUTOR: "distributor",
  RETAILER: "retailer",
};

const ROLE_ABBR: Record<string, string> = {
  SUPER_DISTRIBUTOR: "SD",
  MASTER_DISTRIBUTOR: "MD",
  DISTRIBUTOR: "DT",
  RETAILER: "RT",
};

const STATUS_DISPLAY: Record<string, string> = {
  ACTIVE: "Active",
  PENDING_KYC: "Pending KYC",
  SUSPENDED: "Suspended",
  CLOSED: "Closed",
};

// Service codes that are settlement-synthetic and not real user txns
const EXCLUDED_SERVICES = ["PAYOUT", "UPI_PAYOUT", "WALLET_TOPUP", "WALLET_WITHDRAW"];

/**
 * GET /api/network/hierarchy
 *
 * Returns every node in the caller's downline as a flat list — client builds the
 * tree UI from the `parentId` field. Each node includes today's (IST) transaction
 * stats so the tree can show live-ish per-member business health.
 *
 * Access: SUPER_DISTRIBUTOR / MASTER_DISTRIBUTOR / DISTRIBUTOR only.
 */
export async function GET() {
  let user;
  try {
    user = await requireAuth();
  } catch (e) {
    if (e instanceof AuthError)
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    throw e;
  }

  if (!NETWORK_ROLES.has(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { dayStart, dayEnd } = istDayBounds();

    // Step 1: Get ALL descendant IDs + their parentId via recursive CTE
    const treeRows = await prisma.$queryRaw<{ id: string; parentId: string }[]>`
      WITH RECURSIVE tree AS (
        SELECT id, "parentId"
        FROM   "User"
        WHERE  "parentId" = ${user.id}
          AND  "deletedAt" IS NULL
        UNION ALL
        SELECT u.id, u."parentId"
        FROM   "User" u
        INNER JOIN tree t ON u."parentId" = t.id
        WHERE  u."deletedAt" IS NULL
      )
      SELECT id, "parentId" FROM tree
    `;

    if (treeRows.length === 0) {
      return NextResponse.json({ nodes: [], callerId: user.id });
    }

    const allIds = treeRows.map((r) => r.id);
    const parentMap = new Map(treeRows.map((r) => [r.id, r.parentId]));

    // Step 2: User details via Prisma (safe Decimal handling)
    const users = await prisma.user.findMany({
      where: { id: { in: allIds } },
      select: {
        id: true,
        name: true,
        role: true,
        status: true,
        userCode: true,
        shopName: true,
        city: true,
        state: true,
        walletBalance: true,
      },
    });

    // Step 3: Today's transaction stats per user (primary rail only)
    const txnGroups = await prisma.transaction.groupBy({
      by: ["userId", "status"],
      where: {
        userId: { in: allIds },
        isSettlement: false,
        service: { notIn: EXCLUDED_SERVICES as never[] },
        createdAt: { gte: dayStart, lte: dayEnd },
      },
      _count: true,
      _sum: { amount: true, commission: true },
    });

    type NodeStats = {
      volumeToday: number;
      txnToday: number;
      successToday: number;
      commissionToday: number;
    };
    const statsMap = new Map<string, NodeStats>();

    for (const g of txnGroups) {
      const s = statsMap.get(g.userId) ?? {
        volumeToday: 0,
        txnToday: 0,
        successToday: 0,
        commissionToday: 0,
      };
      s.txnToday += g._count;
      if (g.status === "SUCCESS") {
        s.volumeToday = Math.round((s.volumeToday + Number(g._sum.amount ?? 0)) * 100) / 100;
        s.successToday += g._count;
        s.commissionToday =
          Math.round((s.commissionToday + Number(g._sum.commission ?? 0)) * 100) / 100;
      }
      statsMap.set(g.userId, s);
    }

    // Step 4: Assemble output
    const nodes = users.map((u) => ({
      id: u.id,
      parentId: parentMap.get(u.id) ?? user.id,
      name: u.name,
      role: ROLE_SLUG[u.role] ?? u.role.toLowerCase().replace(/_/g, "-"),
      roleAbbr: ROLE_ABBR[u.role] ?? u.role.slice(0, 2),
      roleRaw: u.role,
      status: STATUS_DISPLAY[u.status] ?? u.status,
      userCode: u.userCode ?? null,
      shop: u.shopName ?? "—",
      city: u.city ?? "—",
      state: u.state ?? "—",
      walletBalance: Number(u.walletBalance),
      ...(statsMap.get(u.id) ?? {
        volumeToday: 0,
        txnToday: 0,
        successToday: 0,
        commissionToday: 0,
      }),
    }));

    return NextResponse.json({ nodes, callerId: user.id });
  } catch (e) {
    console.error("[network/hierarchy] GET error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
