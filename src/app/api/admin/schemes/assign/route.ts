import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminActivity } from "@/lib/security/adminActivity";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/security/rateLimit";
import { toErrorResponse } from "@/lib/security/apiErrors";
import { prisma } from "@/lib/db";

export const fetchCache = "force-no-store";

export const dynamic = "force-dynamic";

const AssignBody = z
  .object({
    schemeId: z.string().min(1).nullable().default(null),
    userIds: z.array(z.string().min(1)).min(1).max(5000),
  })
  .strict();

/**
 * POST /api/admin/schemes/assign
 *
 * Admin assigns (or unassigns) a scheme to Super Distributor (SD) user(s)
 * only. The scheme then cascades down the network via each tier's own
 * assignment flow:  Admin → SD → MD → DT → RT.
 * Unassigning (schemeId null) is always allowed.
 */
export async function POST(req: Request) {
  let admin;
  try {
    admin = await requireAdminActivity(req, {
      action: "scheme.assign",
      roles: ["MASTER_ADMIN", "ADMIN"],
      entity: "Scheme",
    });
    await enforceRateLimit(`scheme:assign:${admin.id}`, RATE_LIMITS.default);
  } catch (e: unknown) {
    return toErrorResponse(e);
  }

  const parsed = AssignBody.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { schemeId, userIds } = parsed.data;

  if (schemeId) {
    const scheme = await prisma.scheme.findUnique({
      where: { id: schemeId },
      select: { active: true },
    });
    if (!scheme) return NextResponse.json({ error: "Scheme not found" }, { status: 404 });
    if (!scheme.active) return NextResponse.json({ error: "Cannot assign an inactive scheme" }, { status: 400 });

    // Hierarchy rule: admin can only assign schemes to SUPER_DISTRIBUTORs (SD).
    // Each tier below (MD/DT/RT) receives their scheme from their direct parent
    // via /api/network/scheme — not from admin directly.
    const targets = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, role: true },
    });
    const invalid = targets.filter((u) => u.role !== "SUPER_DISTRIBUTOR");
    if (invalid.length > 0) {
      return NextResponse.json(
        {
          error: `Admin can only assign schemes to Super Distributors (SD). ${invalid.length} of the selected user(s) are not Super Distributors. MD, DT, and RT users receive schemes from their direct parent in the network hierarchy.`,
        },
        { status: 400 }
      );
    }
  }

  const result = await prisma.user.updateMany({
    where: { id: { in: userIds } },
    data: { schemeId },
  });

  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: schemeId ? "scheme.assign" : "scheme.unassign",
      entity: "Scheme",
      entityId: schemeId ?? undefined,
      meta: { schemeId, userCount: result.count, userIds },
    },
  });

  return NextResponse.json({ ok: true, updated: result.count });
}
