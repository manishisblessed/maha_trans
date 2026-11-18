/**
 * GET  /api/admin/kits/pricing  — read current kit prices
 * PATCH /api/admin/kits/pricing  — update one or more kit prices
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole, AuthError } from "@/lib/auth-server";
import { prisma } from "@/lib/db";
import { toErrorResponse } from "@/lib/security/apiErrors";
import { getKitPrice } from "@/lib/kit/service";
import { clientIp } from "@/lib/security/audit";

export const fetchCache = "force-no-store";
export const dynamic = "force-dynamic";

const KIT_PRICE_KEYS = {
  MD_KIT: "kit.MD_KIT.price",
  DT_KIT: "kit.DT_KIT.price",
  RT_KIT: "kit.RT_KIT.price",
} as const;

// ── GET ──────────────────────────────────────────────────────────────────────

export async function GET() {
  try {
    await requireRole("MASTER_ADMIN", "ADMIN");

    const [mdPrice, dtPrice, rtPrice] = await Promise.all([
      getKitPrice("MD_KIT"),
      getKitPrice("DT_KIT"),
      getKitPrice("RT_KIT"),
    ]);

    return NextResponse.json({
      pricing: {
        MD_KIT: { price: mdPrice, label: "MD-Kit", description: "SD purchases to onboard MD" },
        DT_KIT: { price: dtPrice, label: "DT-Kit", description: "MD purchases to onboard DT" },
        RT_KIT: { price: rtPrice, label: "RT-Kit", description: "DT purchases to onboard RT" },
      },
    });
  } catch (e) {
    if (e instanceof AuthError)
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    return toErrorResponse(e);
  }
}

// ── PATCH ─────────────────────────────────────────────────────────────────────

const PatchBody = z.object({
  MD_KIT: z.number().positive().optional(),
  DT_KIT: z.number().positive().optional(),
  RT_KIT: z.number().positive().optional(),
}).refine((d) => d.MD_KIT !== undefined || d.DT_KIT !== undefined || d.RT_KIT !== undefined, {
  message: "Provide at least one kit price to update",
});

export async function PATCH(req: Request) {
  try {
    const admin = await requireRole("MASTER_ADMIN", "ADMIN");

    const parsed = PatchBody.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const updates: { key: string; type: string; amount: number }[] = [];

    for (const [kitType, amount] of Object.entries(parsed.data) as [keyof typeof KIT_PRICE_KEYS, number][]) {
      if (amount === undefined) continue;
      const key = KIT_PRICE_KEYS[kitType];
      await prisma.platformSetting.upsert({
        where: { key },
        update: { value: { amount }, updatedById: admin.id },
        create: { key, value: { amount }, updatedById: admin.id },
      });
      updates.push({ key, type: kitType, amount });
    }

    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: "kit.pricing.updated",
        entity: "PlatformSetting",
        entityId: "kit-pricing",
        meta: { updates },
        ip: clientIp(req),
      },
    });

    return NextResponse.json({ ok: true, updated: updates });
  } catch (e) {
    if (e instanceof AuthError)
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    return toErrorResponse(e);
  }
}
