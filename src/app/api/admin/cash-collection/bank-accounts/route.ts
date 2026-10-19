/**
 * /api/admin/cash-collection/bank-accounts
 *
 * GET  — list all company bank accounts (admin only)
 * POST — create a new company bank account (ADMIN / MASTER_ADMIN only)
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, AuthError } from "@/lib/auth-server";
import { prisma } from "@/lib/db";
import { isAdminRole } from "@/lib/security/ownership";

const CreateBody = z
  .object({
    accountName: z.string().min(2).max(120),
    bankName: z.string().min(2).max(100),
    accountNumber: z.string().min(5).max(30),
    ifscCode: z
      .string()
      .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC code"),
    branch: z.string().max(100).optional(),
    upiId: z.string().max(100).optional(),
    acceptedModes: z
      .array(z.enum(["NEFT", "RTGS", "UPI", "CASH_DEPOSIT"]))
      .min(1, "At least one payment mode is required"),
    chargeType: z.enum(["FLAT", "PERCENT"]).default("FLAT"),
    chargeValue: z.number().min(0).max(100000),
    chargeGstInclusive: z.boolean().default(false),
    defaultTargetWallet: z.enum(["PRIMARY", "DMT", "AEPS"]).default("PRIMARY"),
    isActive: z.boolean().default(true),
    sortOrder: z.number().int().min(0).default(0),
    notes: z.string().max(500).optional(),
  })
  .strict();

export const fetchCache = "force-no-store";
export const dynamic = "force-dynamic";

export async function GET() {
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

  const accounts = await prisma.companyBankAccount.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: { createdBy: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json({ accounts });
}

export async function POST(req: Request) {
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

  const parsed = CreateBody.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const d = parsed.data;

  const account = await prisma.companyBankAccount.create({
    data: {
      accountName: d.accountName,
      bankName: d.bankName,
      accountNumber: d.accountNumber,
      ifscCode: d.ifscCode.toUpperCase(),
      branch: d.branch ?? null,
      upiId: d.upiId ?? null,
      acceptedModes: d.acceptedModes,
      chargeType: d.chargeType,
      chargeValue: d.chargeValue,
      chargeGstInclusive: d.chargeGstInclusive,
      defaultTargetWallet: d.defaultTargetWallet,
      isActive: d.isActive,
      sortOrder: d.sortOrder,
      notes: d.notes ?? null,
      createdById: user.id,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "company_bank_account.created",
      entity: "CompanyBankAccount",
      entityId: account.id,
      meta: {
        accountName: account.accountName,
        bankName: account.bankName,
        accountNumber: account.accountNumber,
      },
    },
  });

  return NextResponse.json({ account }, { status: 201 });
}
