import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth-server";
import { prisma } from "@/lib/db";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/security/rateLimit";
import { toErrorResponse } from "@/lib/security/apiErrors";

export const fetchCache = "force-no-store";
export const dynamic = "force-dynamic";

/**
 * Role hierarchy for scheme assignment.
 * Each network tier can only assign schemes to their immediate subordinate.
 *   Admin → SUPER_DISTRIBUTOR  (handled by /api/admin/schemes/assign)
 *   SD    → MASTER_DISTRIBUTOR
 *   MD    → DISTRIBUTOR
 *   DT    → RETAILER
 */
const CHILD_ROLE: Record<string, string> = {
  SUPER_DISTRIBUTOR: "MASTER_DISTRIBUTOR",
  MASTER_DISTRIBUTOR: "DISTRIBUTOR",
  DISTRIBUTOR: "RETAILER",
};

const AssignBody = z
  .object({
    /** Scheme to assign, or null to unassign. */
    schemeId: z.string().min(1).nullable().default(null),
    /** Direct child user IDs to assign the scheme to. */
    childIds: z.array(z.string().min(1)).min(1).max(500),
  })
  .strict();

/**
 * POST /api/network/scheme
 *
 * A network parent (SD/MD/DT) assigns (or unassigns) a scheme to their
 * direct child users one tier below them:
 *   - SD   can assign to their direct MD children.
 *   - MD   can assign to their direct DT children.
 *   - DT   can assign to their direct RT children.
 *
 * All targets must be direct children of the caller (parentId === caller.id)
 * and must hold the expected subordinate role. Unassigning is always allowed.
 */
export async function POST(req: Request) {
  let caller;
  try {
    caller = await requireAuth();
    await enforceRateLimit(`network:scheme:assign:${caller.id}`, RATE_LIMITS.default);
  } catch (e: unknown) {
    return toErrorResponse(e);
  }

  // Only SD / MD / DT are allowed to assign schemes to their downline.
  const expectedChildRole = CHILD_ROLE[caller.role as string];
  if (!expectedChildRole) {
    return NextResponse.json(
      { error: "Your role is not permitted to assign schemes to other users." },
      { status: 403 }
    );
  }

  const parsed = AssignBody.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { schemeId, childIds } = parsed.data;

  // Validate the scheme exists and is active (when assigning).
  if (schemeId) {
    const scheme = await prisma.scheme.findUnique({
      where: { id: schemeId },
      select: { active: true },
    });
    if (!scheme)
      return NextResponse.json({ error: "Scheme not found." }, { status: 404 });
    if (!scheme.active)
      return NextResponse.json({ error: "Cannot assign an inactive scheme." }, { status: 400 });
  }

  // All targets must be direct children of the caller with the expected role.
  const targets = await prisma.user.findMany({
    where: { id: { in: childIds } },
    select: { id: true, role: true, parentId: true },
  });

  const notChild = targets.filter(
    (t) => t.parentId !== caller.id || t.role !== expectedChildRole
  );
  if (notChild.length > 0) {
    const childLabel = expectedChildRole.replace(/_/g, " ").toLowerCase();
    return NextResponse.json(
      {
        error: `${notChild.length} of the selected user(s) are not your direct ${childLabel} children. You can only assign schemes to users directly under you.`,
      },
      { status: 400 }
    );
  }

  const result = await prisma.user.updateMany({
    where: { id: { in: childIds } },
    data: { schemeId },
  });

  await prisma.auditLog.create({
    data: {
      userId: caller.id,
      action: schemeId ? "scheme.assign" : "scheme.unassign",
      entity: "Scheme",
      entityId: schemeId ?? undefined,
      meta: { schemeId, childCount: result.count, childIds },
    },
  });

  return NextResponse.json({ ok: true, updated: result.count });
}
