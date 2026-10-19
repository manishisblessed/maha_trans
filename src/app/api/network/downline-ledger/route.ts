import { NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/auth-server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const NETWORK_ROLES = new Set([
  "SUPER_DISTRIBUTOR",
  "MASTER_DISTRIBUTOR",
  "DISTRIBUTOR",
]);

/** Map URL `level` param → DB role values to filter on. */
const LEVEL_ROLES: Record<string, string[]> = {
  md: ["MASTER_DISTRIBUTOR"],
  dt: ["DISTRIBUTOR"],
  rt: ["RETAILER"],
};

const ROLE_ABBR: Record<string, string> = {
  SUPER_DISTRIBUTOR: "SD",
  MASTER_DISTRIBUTOR: "MD",
  DISTRIBUTOR: "DT",
  RETAILER: "RT",
};

/**
 * GET /api/network/downline-ledger
 *
 * Paginated wallet-ledger entries for the caller's ENTIRE downline, with an
 * optional `level` filter to narrow to a specific tier (md / dt / rt / all).
 *
 * Query params:
 *   level     "all" | "md" | "dt" | "rt"   default: "all"
 *   direction "all" | "CREDIT" | "DEBIT"    default: "all"
 *   reason    wallet reason enum value       default: "all"
 *   from      YYYY-MM-DD                    optional
 *   to        YYYY-MM-DD                    optional
 *   page      1-based                       default: 1
 */
export async function GET(req: Request) {
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

  const sp = new URL(req.url).searchParams;
  const level = sp.get("level") ?? "all";
  const direction = sp.get("direction") ?? "all";
  const reason = sp.get("reason") ?? "all";
  const from = sp.get("from") ?? "";
  const to = sp.get("to") ?? "";
  const page = Math.max(1, Number(sp.get("page") ?? "1"));
  const pageSize = 50;

  try {
    // Step 1: Recursive CTE — all descendant IDs + their role
    const treeRows = await prisma.$queryRaw<{ id: string; role: string }[]>`
      WITH RECURSIVE tree AS (
        SELECT id, role
        FROM   "User"
        WHERE  "parentId" = ${user.id}
          AND  "deletedAt" IS NULL
        UNION ALL
        SELECT u.id, u.role
        FROM   "User" u
        INNER JOIN tree t ON u."parentId" = t.id
        WHERE  u."deletedAt" IS NULL
      )
      SELECT id, role FROM tree
    `;

    if (treeRows.length === 0) {
      return NextResponse.json({ entries: [], total: 0, sums: { credit: 0, debit: 0 }, page, pageSize });
    }

    // Step 2: Apply level filter
    let scopedIds: string[];
    if (level !== "all" && LEVEL_ROLES[level]) {
      const allowed = new Set(LEVEL_ROLES[level]);
      scopedIds = treeRows.filter((r) => allowed.has(r.role)).map((r) => r.id);
    } else {
      scopedIds = treeRows.map((r) => r.id);
    }

    if (scopedIds.length === 0) {
      return NextResponse.json({ entries: [], total: 0, sums: { credit: 0, debit: 0 }, page, pageSize });
    }

    // Step 3: Build Prisma where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      userId: { in: scopedIds },
      ...(direction !== "all" ? { direction: direction.toUpperCase() } : {}),
      ...(reason !== "all" ? { reason } : {}),
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: new Date(`${from}T00:00:00.000+05:30`) } : {}),
              ...(to ? { lte: new Date(`${to}T23:59:59.999+05:30`) } : {}),
            },
          }
        : {}),
    };

    // Step 4: Parallel queries
    const [entries, total, grouped] = await Promise.all([
      prisma.walletTxn.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: {
            select: {
              name: true,
              userCode: true,
              role: true,
              shopName: true,
            },
          },
        },
      }),
      prisma.walletTxn.count({ where }),
      prisma.walletTxn.groupBy({
        by: ["direction"],
        where,
        _sum: { amount: true },
      }),
    ]);

    // Build credit/debit sums
    let creditSum = 0;
    let debitSum = 0;
    for (const g of grouped) {
      const amt = Number(g._sum.amount ?? 0);
      if (g.direction === "CREDIT") creditSum = Math.round((creditSum + amt) * 100) / 100;
      else debitSum = Math.round((debitSum + amt) * 100) / 100;
    }

    return NextResponse.json({
      entries: entries.map((e) => ({
        id: e.id,
        createdAt: e.createdAt.toISOString(),
        user: e.user
          ? {
              name: e.user.name,
              userCode: e.user.userCode ?? null,
              shop: e.user.shopName ?? null,
              roleAbbr: ROLE_ABBR[e.user.role] ?? "?",
              roleRaw: e.user.role,
            }
          : null,
        walletType: e.walletType,
        direction: e.direction,
        reason: e.reason,
        amount: Number(e.amount),
        balanceAfter: e.balanceAfter !== null ? Number(e.balanceAfter) : null,
        note: e.note ?? null,
        refType: e.refType ?? null,
        refId: e.refId ?? null,
      })),
      total,
      sums: { credit: creditSum, debit: debitSum },
      page,
      pageSize,
    });
  } catch (e) {
    console.error("[network/downline-ledger] GET error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
