/**
 * /api/cash-collection/[id]
 *
 * GET   — fetch a single cash-collection request
 * PATCH — admin approves / rejects; user cancels
 *
 * On approval the system:
 *  1. Resolves the charge (flat ₹ or %)
 *  2. Atomically credits (amount − charge) to the target wallet
 *  3. Records the charge as a separate DEBIT for transparency
 *  4. Marks the request APPROVED and links both WalletTxn ids
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { requireAuth, AuthError } from "@/lib/auth-server";
import { prisma } from "@/lib/db";
import { creditWallet, LedgerError } from "@/lib/ledger";
import { isAdminRole } from "@/lib/security/ownership";
import { toNumber } from "@/lib/money";
import { enforceRateLimit, RATE_LIMITS, RateLimitError } from "@/lib/security/rateLimit";

/** Thrown when a concurrent approval has already claimed this request. */
class AlreadyProcessedError extends Error {}

const PatchBody = z
  .discriminatedUnion("action", [
    z.object({
      action: z.literal("approve"),
      remarks: z.string().max(500).optional(),
      // Admin may override charge at approval time
      chargeType: z.enum(["FLAT", "PERCENT"]).optional(),
      chargeValue: z.number().min(0).max(100000).optional(),
      // Admin may override target wallet
      targetWallet: z.enum(["PRIMARY", "DMT", "AEPS"]).optional(),
    }),
    z.object({
      action: z.literal("reject"),
      remarks: z.string().max(500).optional(),
    }),
    z.object({
      action: z.literal("cancel"),
    }),
  ]);

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

  const row = await prisma.cashCollection.findUnique({
    where: { id: params.id },
    include: {
      requester: { select: { id: true, name: true, email: true, phone: true } },
      approver: { select: { id: true, name: true, email: true } },
      companyBankAccount: true,
    },
  });

  if (!row)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Users can only view their own requests; admins can view all
  if (!isAdminRole(user.role) && row.requesterId !== user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json({ collection: row });
}

export async function PATCH(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  let user;
  try {
    user = await requireAuth();
    await enforceRateLimit(
      `cash-collection:decide:${user.id}`,
      RATE_LIMITS.fundRequestCreate
    );
  } catch (e) {
    if (e instanceof AuthError)
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    if (e instanceof RateLimitError)
      return NextResponse.json({ error: e.message, retryAfterSec: e.result.retryAfterSec }, { status: 429 });
    throw e;
  }

  const parsed = PatchBody.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const row = await prisma.cashCollection.findUnique({
    where: { id: params.id },
    include: {
      requester: { select: { id: true, name: true } },
      companyBankAccount: true,
    },
  });

  if (!row)
    return NextResponse.json({ error: "Cash collection request not found" }, { status: 404 });

  if (row.status !== "PENDING")
    return NextResponse.json({ error: "Request already processed" }, { status: 409 });

  const { action } = parsed.data;

  // ── CANCEL (user only) ────────────────────────────────────────────────────
  if (action === "cancel") {
    if (row.requesterId !== user.id)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await prisma.cashCollection.update({
      where: { id: params.id },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "cash_collection.cancelled",
        entity: "CashCollection",
        entityId: params.id,
        meta: { amount: toNumber(row.amount) },
      },
    });

    return NextResponse.json({ status: "CANCELLED" });
  }

  // ── ADMIN-only below ──────────────────────────────────────────────────────
  if (!isAdminRole(user.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (action === "reject") {
    await prisma.cashCollection.update({
      where: { id: params.id },
      data: {
        status: "REJECTED",
        approverId: user.id,
        rejectedAt: new Date(),
        adminRemarks: parsed.data.remarks ?? null,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "cash_collection.rejected",
        entity: "CashCollection",
        entityId: params.id,
        meta: {
          amount: toNumber(row.amount),
          requesterId: row.requesterId,
          remarks: parsed.data.remarks,
        },
      },
    });

    return NextResponse.json({ status: "REJECTED" });
  }

  // ── APPROVE ───────────────────────────────────────────────────────────────
  // action === "approve"
  const approveData = parsed.data as Extract<typeof parsed.data, { action: "approve" }>;

  // Resolve charge: admin override > account default
  const bankAccount = row.companyBankAccount;
  const chargeType = approveData.chargeType ?? bankAccount.chargeType;
  const chargeValue = approveData.chargeValue ?? Number(bankAccount.chargeValue);
  const grossAmount = Number(row.amount);

  let chargeAmount: number;
  if (chargeType === "PERCENT") {
    chargeAmount = Math.round((grossAmount * chargeValue) / 100 * 100) / 100;
  } else {
    chargeAmount = chargeValue;
  }

  // Cap charge so it never exceeds the gross amount
  chargeAmount = Math.min(chargeAmount, grossAmount);
  const netAmount = Math.round((grossAmount - chargeAmount) * 100) / 100;

  const targetWallet = approveData.targetWallet ?? row.targetWallet ?? bankAccount.defaultTargetWallet;

  try {
    await prisma.$transaction(async (tx) => {
      // Claim the request — only the winner of a concurrent race proceeds
      const claim = await tx.cashCollection.updateMany({
        where: { id: params.id, status: "PENDING" },
        data: {
          status: "APPROVED",
          approverId: user.id,
          approvedAt: new Date(),
          adminRemarks: approveData.remarks ?? null,
          chargeType,
          chargeValue: new Prisma.Decimal(chargeValue),
          chargeAmount: new Prisma.Decimal(chargeAmount),
          netAmount: new Prisma.Decimal(netAmount),
          targetWallet,
        },
      });

      if (claim.count === 0) throw new AlreadyProcessedError();

      // Credit net amount to user's target wallet.
      // The gross amount was deposited directly into the company bank account by the user;
      // the platform charge (chargeAmount) stays with the company and never enters the
      // user's wallet — so no debit is needed. We simply credit the net amount.
      if (netAmount > 0) {
        const creditTxn = await creditWallet(
          {
            userId: row.requesterId,
            amount: netAmount,
            reason: "CASH_COLLECTION",
            walletType: targetWallet as "PRIMARY" | "DMT" | "AEPS",
            refType: "CashCollection",
            refId: params.id,
            note: `Cash collection approved (${row.mode}). Gross ₹${grossAmount}${chargeAmount > 0 ? `, charge ₹${chargeAmount}` : ""}`,
            idempotencyKey: `cash-collection:${params.id}:credit`,
          },
          tx
        );

        // Link WalletTxn id back to the CashCollection row
        await tx.cashCollection.update({
          where: { id: params.id },
          data: { walletTxnId: creditTxn.id },
        });
      }
    });
  } catch (e) {
    if (e instanceof AlreadyProcessedError)
      return NextResponse.json({ error: "Request already processed" }, { status: 409 });
    if (e instanceof LedgerError && e.code === "INSUFFICIENT_FUNDS")
      return NextResponse.json({ error: "Insufficient funds to process" }, { status: 400 });
    throw e;
  }

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "cash_collection.approved",
      entity: "CashCollection",
      entityId: params.id,
      meta: {
        grossAmount,
        chargeAmount,
        netAmount,
        targetWallet,
        requesterId: row.requesterId,
      },
    },
  });

  return NextResponse.json({
    status: "APPROVED",
    grossAmount,
    chargeAmount,
    netAmount,
    targetWallet,
  });
}
