import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { prisma } from "@/lib/db";
import { toErrorResponse } from "@/lib/security/apiErrors";

export const fetchCache = "force-no-store";
export const dynamic = "force-dynamic";

/** Roles that are permitted to list schemes for downline assignment. */
const ALLOWED_ROLES = new Set(["SUPER_DISTRIBUTOR", "MASTER_DISTRIBUTOR", "DISTRIBUTOR"]);

/**
 * GET /api/network/schemes
 *
 * Returns all active schemes so a network parent (SD/MD/DT) can pick one
 * to assign to their direct child users.
 */
export async function GET() {
  let caller;
  try {
    caller = await requireAuth();
  } catch (e: unknown) {
    return toErrorResponse(e);
  }

  if (!ALLOWED_ROLES.has(caller.role as string)) {
    return NextResponse.json({ error: "Not permitted." }, { status: 403 });
  }

  const schemes = await prisma.scheme.findMany({
    where: { active: true },
    select: {
      id: true,
      name: true,
      description: true,
      _count: { select: { slabs: true, mdrSlabs: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({
    schemes: schemes.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      slabCount: s._count.slabs,
      mdrSlabCount: s._count.mdrSlabs,
    })),
  });
}
