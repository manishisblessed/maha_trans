import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth-server";
import { prisma } from "@/lib/db";
import { toErrorResponse } from "@/lib/security/apiErrors";

/**
 * POST /api/platform/whitelabel/promote-owner
 *
 * Admin-only: flip isTenantOwner = true on a LIVE white-label profile owner,
 * giving them the power to create any network tier under their domain boundary.
 *
 * Body: { userId: string }
 */
export const dynamic = "force-dynamic";

const Body = z.object({
  userId: z.string().cuid(),
});

export async function POST(req: Request) {
  let admin;
  try { admin = await requireAuth(); } catch (e) { return toErrorResponse(e); }

  if (!["MASTER_ADMIN"].includes(admin.role)) {
    return NextResponse.json({ error: "Only master admins can promote tenant owners" }, { status: 403 });
  }

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { userId } = parsed.data;

  // Target user must have a LIVE white-label profile
  const profile = await prisma.whitelabelProfile.findUnique({
    where: { userId, status: "LIVE" },
    select: { id: true, brandName: true },
  });
  if (!profile) {
    return NextResponse.json(
      { error: "Target user does not have a LIVE white-label profile" },
      { status: 400 }
    );
  }

  await prisma.user.update({
    where: { id: userId },
    data: { isTenantOwner: true },
  });

  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: "whitelabel.owner.promoted",
      entity: "User",
      entityId: userId,
      meta: { brandName: profile.brandName },
    },
  });

  return NextResponse.json({ ok: true });
}
