/**
 * /api/admin/cash-collection/bank-accounts/[id]
 *
 * PATCH  — update a company bank account (ADMIN / MASTER_ADMIN only)
 * DELETE — soft-delete (mark inactive) or hard-delete if no CashCollection references
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, AuthError } from "@/lib/auth-server";
import { prisma } from "@/lib/db";
import { isAdminRole } from "@/lib/security/ownership";

const PatchBody = z
  .object({
    accountName: z.string().min(2).max(120).optional(),
    bankName: z.string().min(2).max(100).optional(),
    accountNumber: z.string().min(5).max(30).optional(),
    ifscCode: z
      .string()
      .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC code")
      .optional(),
    branch: z.string().max(100).nullable().optional(),
    upiId: z.string().max(100).nullable().optional(),
    acceptedModes: z
      .array(z.enum(["NEFT", "RTGS", "UPI", "CASH_DEPOSIT"]))
      .min(1)
      .optional(),
    chargeType: z.enum(["FLAT", "PERCENT"]).optional(),
    chargeValue: z.number().min(0).max(100000).optional(),
    chargeGstInclusive: z.boolean().optional(),
    defaultTargetWallet: z.enum(["PRIMARY", "DMT", "AEPS"]).optional(),
    isActive: z.boolean().optional(),
    sortOrder: z.number().int().min(0).optional(),
    notes: z.string().max(500).nullable().optional(),
  })
  .strict();

export const fetchCache = "force-no-store";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  let user;
  try {
    user = await requireAuth();
  } catch (e) {
    if (e instanceof AuthError)
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    throw e;
  }

  if (!isAdminRole(user.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const account = await prisma.companyBankAccount.findUnique({
    where: { id: params.id },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      _count: { select: { cashCollections: true } },
    },
  });

  if (!account)
    return NextResponse.json({ error: "Bank account not found" }, { status: 404 });

  return NextResponse.json({ account });
}

export async function PATCH(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  let user;
  try {
    user = await requireAuth();
  } catch (e) {
    if (e instanceof AuthError)
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    throw e;
  }

  if (!isAdminRole(user.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = PatchBody.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const existing = await prisma.companyBankAccount.findUnique({
    where: { id: params.id },
  });
  if (!existing)
    return NextResponse.json({ error: "Bank account not found" }, { status: 404 });

  const d = parsed.data;
  const updated = await prisma.companyBankAccount.update({
    where: { id: params.id },
    data: {
      ...(d.accountName !== undefined && { accountName: d.accountName }),
      ...(d.bankName !== undefined && { bankName: d.bankName }),
      ...(d.accountNumber !== undefined && { accountNumber: d.accountNumber }),
      ...(d.ifscCode !== undefined && { ifscCode: d.ifscCode.toUpperCase() }),
      ...(d.branch !== undefined && { branch: d.branch }),
      ...(d.upiId !== undefined && { upiId: d.upiId }),
      ...(d.acceptedModes !== undefined && { acceptedModes: d.acceptedModes }),
      ...(d.chargeType !== undefined && { chargeType: d.chargeType }),
      ...(d.chargeValue !== undefined && { chargeValue: d.chargeValue }),
      ...(d.chargeGstInclusive !== undefined && { chargeGstInclusive: d.chargeGstInclusive }),
      ...(d.defaultTargetWallet !== undefined && { defaultTargetWallet: d.defaultTargetWallet }),
      ...(d.isActive !== undefined && { isActive: d.isActive }),
      ...(d.sortOrder !== undefined && { sortOrder: d.sortOrder }),
      ...(d.notes !== undefined && { notes: d.notes }),
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "company_bank_account.updated",
      entity: "CompanyBankAccount",
      entityId: params.id,
      meta: d,
    },
  });

  return NextResponse.json({ account: updated });
}

export async function DELETE(
  _req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  let user;
  try {
    user = await requireAuth();
  } catch (e) {
    if (e instanceof AuthError)
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    throw e;
  }

  if (!isAdminRole(user.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const existing = await prisma.companyBankAccount.findUnique({
    where: { id: params.id },
    include: { _count: { select: { cashCollections: true } } },
  });
  if (!existing)
    return NextResponse.json({ error: "Bank account not found" }, { status: 404 });

  if (existing._count.cashCollections > 0) {
    // Soft-delete: mark inactive (preserve referential integrity)
    await prisma.companyBankAccount.update({
      where: { id: params.id },
      data: { isActive: false },
    });
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "company_bank_account.deactivated",
        entity: "CompanyBankAccount",
        entityId: params.id,
        meta: { reason: "has_collections" },
      },
    });
    return NextResponse.json({ deleted: false, deactivated: true });
  }

  await prisma.companyBankAccount.delete({ where: { id: params.id } });
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "company_bank_account.deleted",
      entity: "CompanyBankAccount",
      entityId: params.id,
      meta: { accountName: existing.accountName },
    },
  });

  return NextResponse.json({ deleted: true });
}
