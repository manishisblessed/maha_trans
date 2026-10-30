import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth-server";
import { prisma } from "@/lib/db";
import { toErrorResponse } from "@/lib/security/apiErrors";

/**
 * Admin white-label tenant management.
 *
 * GET  — list all WhitelabelProfile records with owner details.
 * PUT  — update status (LIVE | SUSPENDED | DRAFT) for a tenant.
 */
export const fetchCache = "force-no-store";
export const dynamic = "force-dynamic";

const ADMIN_ROLES = new Set(["MASTER_ADMIN", "ADMIN"]);

export async function GET(req: Request) {
  let user;
  try { user = await requireAuth(); } catch (e) { return toErrorResponse(e); }
  if (!ADMIN_ROLES.has(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? undefined;
  const search = url.searchParams.get("search")?.trim() ?? undefined;
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
  const limit = 20;

  const where = {
    ...(status ? { status } : {}),
    ...(search
      ? {
          OR: [
            { brandName: { contains: search, mode: "insensitive" as const } },
            { subdomain: { contains: search, mode: "insensitive" as const } },
            { customDomain: { contains: search, mode: "insensitive" as const } },
            { user: { name: { contains: search, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const [total, tenants] = await Promise.all([
    prisma.whitelabelProfile.count({ where }),
    prisma.whitelabelProfile.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        brandName: true,
        tagline: true,
        logoUrl: true,
        primaryColor: true,
        accentColor: true,
        subdomain: true,
        customDomain: true,
        supportEmail: true,
        supportPhone: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            userCode: true,
            status: true,
            _count: { select: { tenantMembers: true } },
          },
        },
      },
    }),
  ]);

  return NextResponse.json({ tenants, total, page, limit });
}

const PutBody = z.object({
  id: z.string().cuid(),
  status: z.enum(["DRAFT", "LIVE", "SUSPENDED"]),
  suspendReason: z.string().max(500).optional(),
});

export async function PUT(req: Request) {
  let user;
  try { user = await requireAuth(); } catch (e) { return toErrorResponse(e); }
  if (!ADMIN_ROLES.has(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = PutBody.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { id, status, suspendReason } = parsed.data;

  const profile = await prisma.whitelabelProfile.findUnique({
    where: { id },
    select: { id: true, status: true, brandName: true, userId: true },
  });
  if (!profile) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  const updated = await prisma.whitelabelProfile.update({
    where: { id },
    data: { status },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: `whitelabel.admin.${status.toLowerCase()}`,
      entity: "WhitelabelProfile",
      entityId: id,
      meta: {
        brandName: profile.brandName,
        previousStatus: profile.status,
        newStatus: status,
        ...(suspendReason ? { suspendReason } : {}),
      },
    },
  });

  return NextResponse.json({ ok: true, profile: updated });
}
