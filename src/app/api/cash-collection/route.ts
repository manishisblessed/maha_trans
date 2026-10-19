/**
 * /api/cash-collection
 *
 * GET  — list cash-collection requests
 *         • Admin / Support / Finance: all requests (paginated)
 *         • Network users:             only their own
 * POST — user submits a new cash-collection request
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, AuthError } from "@/lib/auth-server";
import { prisma } from "@/lib/db";
import { isAdminRole } from "@/lib/security/ownership";
import { enforceRateLimit, RATE_LIMITS, RateLimitError } from "@/lib/security/rateLimit";
import { assertKycCurrent, ReKycRequiredError } from "@/lib/security/kycGate";
import { assertLivenessReady, LivenessRequiredError } from "@/lib/security/livenessGate";
import { requireSubmitNonce, SubmitNonceError } from "@/lib/security/submitNonce";
import { nanoid } from "@/lib/nanoid";
import { withIdempotency, IdempotencyInProgressError } from "@/lib/idempotency";

const CreateBody = z
  .object({
    companyBankAccountId: z.string().min(1),
    mode: z.enum(["NEFT", "RTGS", "UPI", "CASH_DEPOSIT"]),
    amount: z.number().positive().max(10000000), // max ₹1 crore per request
    utr: z.string().min(1).max(50).optional(),
    paymentDate: z.string().datetime({ offset: true }).optional(),
    slipUrl: z.string().url().optional(),
    userRemarks: z.string().max(500).optional(),
    // Which wallet the user wants credited (admin can override at approval time)
    targetWallet: z.enum(["PRIMARY", "DMT", "AEPS"]).optional(),
  })
  .strict();

export const fetchCache = "force-no-store";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  let user;
  try {
    user = await requireAuth();
  } catch (e) {
    if (e instanceof AuthError)
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    throw e;
  }

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "50", 10)));
  const status = url.searchParams.get("status") ?? undefined;
  const skip = (page - 1) * limit;

  const where = isAdminRole(user.role)
    ? {
        ...(status && { status: status as "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" }),
      }
    : {
        requesterId: user.id,
        ...(status && { status: status as "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" }),
      };

  const [rows, total] = await Promise.all([
    prisma.cashCollection.findMany({
      where,
      include: {
        requester: { select: { id: true, name: true, email: true, phone: true } },
        approver: { select: { id: true, name: true, email: true } },
        companyBankAccount: {
          select: {
            id: true,
            accountName: true,
            bankName: true,
            accountNumber: true,
            ifscCode: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.cashCollection.count({ where }),
  ]);

  return NextResponse.json({
    collections: rows.map((r) => ({
      id: r.id,
      mode: r.mode,
      amount: Number(r.amount),
      utr: r.utr,
      paymentDate: r.paymentDate?.toISOString() ?? null,
      slipUrl: r.slipUrl,
      userRemarks: r.userRemarks,
      status: r.status,
      adminRemarks: r.adminRemarks,
      chargeAmount: r.chargeAmount ? Number(r.chargeAmount) : null,
      netAmount: r.netAmount ? Number(r.netAmount) : null,
      targetWallet: r.targetWallet,
      approvedAt: r.approvedAt?.toISOString() ?? null,
      rejectedAt: r.rejectedAt?.toISOString() ?? null,
      cancelledAt: r.cancelledAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
      requester: r.requester,
      approver: r.approver,
      companyBankAccount: r.companyBankAccount,
    })),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}

export async function POST(req: Request) {
  let user;
  try {
    user = await requireAuth();
    await assertLivenessReady(user);
    await assertKycCurrent(user);
    await enforceRateLimit(
      `cash-collection:create:${user.id}`,
      RATE_LIMITS.fundRequestCreate // reuse same rate limit bucket
    );
    await requireSubmitNonce(req, user.id);
  } catch (e) {
    if (e instanceof AuthError)
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    if (e instanceof LivenessRequiredError)
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.statusCode });
    if (e instanceof ReKycRequiredError)
      return NextResponse.json({ error: e.message, code: e.code, reKycDueAt: e.dueAt }, { status: e.statusCode });
    if (e instanceof RateLimitError)
      return NextResponse.json({ error: e.message, retryAfterSec: e.result.retryAfterSec }, { status: 429 });
    if (e instanceof SubmitNonceError)
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    throw e;
  }

  const parsed = CreateBody.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const d = parsed.data;

  // Validate the bank account exists and is active
  const bankAccount = await prisma.companyBankAccount.findUnique({
    where: { id: d.companyBankAccountId },
  });
  if (!bankAccount || !bankAccount.isActive)
    return NextResponse.json({ error: "Bank account not found or inactive" }, { status: 404 });

  // Validate the payment mode is accepted by this account
  if (!bankAccount.acceptedModes.includes(d.mode))
    return NextResponse.json(
      { error: `Payment mode ${d.mode} is not accepted by this bank account` },
      { status: 400 }
    );

  const idemKey =
    req.headers.get("Idempotency-Key") ||
    req.headers.get("idempotency-key") ||
    nanoid();

  try {
    const result = await withIdempotency(
      { key: idemKey, scope: "cash-collection.create", userId: user.id },
      async () => {
        const created = await prisma.cashCollection.create({
          data: {
            requesterId: user.id,
            companyBankAccountId: d.companyBankAccountId,
            mode: d.mode,
            amount: d.amount,
            utr: d.utr ?? null,
            paymentDate: d.paymentDate ? new Date(d.paymentDate) : null,
            slipUrl: d.slipUrl ?? null,
            userRemarks: d.userRemarks ?? null,
            targetWallet: d.targetWallet ?? bankAccount.defaultTargetWallet,
          },
          include: {
            requester: { select: { id: true, name: true, email: true, phone: true } },
            companyBankAccount: {
              select: {
                id: true,
                accountName: true,
                bankName: true,
                accountNumber: true,
                ifscCode: true,
              },
            },
          },
        });

        await prisma.auditLog.create({
          data: {
            userId: user.id,
            action: "cash_collection.created",
            entity: "CashCollection",
            entityId: created.id,
            meta: {
              amount: Number(created.amount),
              mode: created.mode,
              companyBankAccountId: created.companyBankAccountId,
            },
          },
        });

        return {
          id: created.id,
          mode: created.mode,
          amount: Number(created.amount),
          utr: created.utr,
          paymentDate: created.paymentDate?.toISOString() ?? null,
          slipUrl: created.slipUrl,
          status: created.status,
          targetWallet: created.targetWallet,
          createdAt: created.createdAt.toISOString(),
          requester: created.requester,
          companyBankAccount: created.companyBankAccount,
        };
      }
    );

    return NextResponse.json({ collection: result }, { status: 201 });
  } catch (e) {
    if (e instanceof IdempotencyInProgressError)
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    throw e;
  }
}
