/**
 * User Kit Service
 *
 * Central logic for the User Kit system:
 *   - buyKits:                  parent purchases N kits from their wallet
 *   - getKitPrice:              read admin-configured price for a kit type
 *   - getKitTypeForRole:        derive which KitType a role purchases
 *   - getChildRoleForKitType:   derive which child role a kit represents
 *   - handleInviteExpiredKit:   transition RESERVED kit → COOLING when invite expires
 *   - handleInviteCancelledKit: same, called on explicit parent cancellation
 *   - startKitCooling:          shared helper to put a kit into COOLING
 */

import { type KitType, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { debitWallet } from "@/lib/ledger";
import { getSetting } from "@/lib/settings";
import { generateNextUserCode } from "@/lib/userCode";
import { getInviteExpiryDays } from "@/lib/onboarding/inviteExpiry";

// ── Kit ↔ Role mappings ───────────────────────────────────────────────────────

/** Maps the BUYING role to the KitType they purchase. */
export const ROLE_TO_KIT_TYPE: Record<string, KitType> = {
  SUPER_DISTRIBUTOR:  "MD_KIT",
  MASTER_DISTRIBUTOR: "DT_KIT",
  DISTRIBUTOR:        "RT_KIT",
};

/** Maps a KitType to the child role whose userCode it pre-mints. */
export const KIT_TYPE_TO_CHILD_ROLE: Record<KitType, string> = {
  MD_KIT: "MASTER_DISTRIBUTOR",
  DT_KIT: "DISTRIBUTOR",
  RT_KIT: "RETAILER",
};

/** Kit-type label for display (e.g. "MD-Kit"). */
export const KIT_TYPE_LABEL: Record<KitType, string> = {
  MD_KIT: "MD-Kit",
  DT_KIT: "DT-Kit",
  RT_KIT: "RT-Kit",
};

/** Roles that MUST own an available kit before they can send an invite. */
export const KIT_REQUIRED_ROLES: string[] = [
  "SUPER_DISTRIBUTOR",
  "MASTER_DISTRIBUTOR",
  "DISTRIBUTOR",
];

/** Returns the KitType for a role, or null if no kit is needed. */
export function getKitTypeForRole(role: string): KitType | null {
  return ROLE_TO_KIT_TYPE[role] ?? null;
}

// ── Pricing ───────────────────────────────────────────────────────────────────

/** Read admin-configured price (₹) for a given KitType. */
export async function getKitPrice(kitType: KitType): Promise<number> {
  const key = `kit.${kitType}.price` as
    | "kit.MD_KIT.price"
    | "kit.DT_KIT.price"
    | "kit.RT_KIT.price";
  const setting = await getSetting(key);
  return setting.amount;
}

// ── Purchase ──────────────────────────────────────────────────────────────────

export type BuyKitsResult = {
  kits: { id: string; userCode: string; kitType: KitType }[];
  totalCharged: number;
  walletTxnId: string;
};

/**
 * Purchase `quantity` kits for `ownerId`.
 *
 * Steps:
 *  1. Resolve the KitType from the buyer's role.
 *  2. Verify spendable balance >= quantity × price.
 *  3. For each kit: generateNextUserCode(childRole) with retry on conflict.
 *  4. Single DB transaction: N UserKit rows + 1 WalletTxn DEBIT.
 *
 * The TxnPin MUST be verified by the API layer BEFORE calling this function
 * (via requireTxnPin), since it travels in the request header.
 */
export async function buyKits(
  ownerId: string,
  ownerRole: string,
  quantity: number
): Promise<BuyKitsResult> {
  const kitType = getKitTypeForRole(ownerRole);
  if (!kitType) {
    throw new Error(`Role ${ownerRole} cannot purchase kits`);
  }

  const childRole = KIT_TYPE_TO_CHILD_ROLE[kitType];
  const price = await getKitPrice(kitType);
  const totalCost = price * quantity;

  // Pre-mint all userCodes BEFORE opening the transaction (generateNextUserCode
  // issues its own DB reads; running them inside the transaction would acquire
  // a second connection and break PgBouncer interactive transactions).
  const codes: string[] = [];
  for (let i = 0; i < quantity; i++) {
    // Retry up to 5 times on unique-constraint race (extremely rare).
    let code: string | null = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = await generateNextUserCode(childRole);
      const conflict = await prisma.userKit.findUnique({
        where: { userCode: candidate },
        select: { id: true },
      });
      if (!conflict) {
        code = candidate;
        break;
      }
    }
    if (!code) throw new Error("Failed to generate a unique kit code — please try again");
    codes.push(code);
  }

  // Single transaction: debit wallet + create all kit rows.
  let walletTxnId!: string;
  const created: { id: string; userCode: string; kitType: KitType }[] = [];

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // Debit wallet (uses the ledger's pessimistic lock + balance check).
    const wtxn = await debitWallet(
      {
        userId: ownerId,
        amount: totalCost.toString(),
        reason: "KIT_PURCHASE",
        note: `Purchased ${quantity}× ${KIT_TYPE_LABEL[kitType]}`,
        idempotencyKey: `kit-buy:${ownerId}:${codes[0]}`,
      },
      tx
    );
    walletTxnId = wtxn.id;

    for (const code of codes) {
      const kit = await tx.userKit.create({
        data: {
          kitType,
          userCode: code,
          ownerId,
          status: "AVAILABLE",
          purchaseAmount: price,
          walletTxnId: wtxn.id,
        },
        select: { id: true, userCode: true, kitType: true },
      });
      created.push(kit);
    }
  }, { timeout: 20_000, maxWait: 10_000 });

  return { kits: created, totalCharged: totalCost, walletTxnId };
}

// ── Cooling helpers ───────────────────────────────────────────────────────────

/**
 * Put a kit into COOLING status.
 * coolingEndsAt = now + invite_expiry_days (the same window as the standard
 * onboarding link lifetime, default 30 days).
 * Detaches the kit from its invite so the invite can be purged independently.
 */
export async function startKitCooling(kitId: string): Promise<void> {
  const coolingDays = await getInviteExpiryDays();
  const coolingEndsAt = new Date(Date.now() + coolingDays * 86_400_000);

  await prisma.userKit.update({
    where: { id: kitId },
    data: {
      status:         "COOLING",
      inviteId:       null,          // detach — invite lifecycle is independent
      coolingStartAt: new Date(),
      coolingEndsAt,
    },
  });
}

/**
 * Called when an invite EXPIRES without the child registering.
 * Transitions the linked RESERVED kit → COOLING.
 */
export async function handleInviteExpiredKit(inviteId: string): Promise<void> {
  const kit = await prisma.userKit.findFirst({
    where: { inviteId, status: "RESERVED" },
    select: { id: true },
  });
  if (!kit) return;
  await startKitCooling(kit.id);
}

/**
 * Called when a parent explicitly CANCELS their invite.
 * Transitions the linked RESERVED kit → COOLING.
 */
export async function handleInviteCancelledKit(inviteId: string): Promise<void> {
  const kit = await prisma.userKit.findFirst({
    where: { inviteId, status: { in: ["RESERVED", "ASSIGNED"] } },
    select: { id: true },
  });
  if (!kit) return;
  await startKitCooling(kit.id);
}

/**
 * Called when admin HARD-REJECTS a user's KYC application.
 * Transitions the ASSIGNED kit linked to the user's invite → COOLING.
 */
export async function handleKycRejectedKit(userId: string, reviewedById: string): Promise<void> {
  // Find the ASSIGNED kit for this user via their onboarding invite.
  const kit = await prisma.userKit.findFirst({
    where: {
      status: "ASSIGNED",
      invite: { userId },
    },
    select: { id: true },
  });
  if (!kit) return;
  const coolingDays = await getInviteExpiryDays();
  const coolingEndsAt = new Date(Date.now() + coolingDays * 86_400_000);
  await prisma.userKit.update({
    where: { id: kit.id },
    data: {
      status:         "COOLING",
      inviteId:       null,
      coolingStartAt: new Date(),
      coolingEndsAt,
      reviewedById,
      reviewedAt:     new Date(),
    },
  });
}

/**
 * Called when admin APPROVES a user's KYC.
 * Applies the kit's pre-minted userCode to the user's User.userCode,
 * then marks the kit ACTIVE.
 *
 * Returns the applied userCode (or null if no kit was linked).
 */
export async function activateKitOnKycApproval(
  userId: string,
  reviewedById: string
): Promise<string | null> {
  const kit = await prisma.userKit.findFirst({
    where: {
      status: "ASSIGNED",
      invite: { userId },
    },
    select: { id: true, userCode: true },
  });
  if (!kit) return null;

  // Apply the pre-minted code to the user and mark the kit ACTIVE atomically.
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { userCode: kit.userCode },
    }),
    prisma.userKit.update({
      where: { id: kit.id },
      data: {
        status:          "ACTIVE",
        activatedForId:  userId,
        activatedAt:     new Date(),
        reviewedById,
        reviewedAt:      new Date(),
      },
    }),
  ]);

  return kit.userCode;
}
