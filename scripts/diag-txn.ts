// Read-only diagnostic for a single transaction and its money trail.
//   Run:  npx tsx scripts/diag-txn.ts <refId|partnerTxnId>
//
// Prints, WITHOUT moving any money or printing secrets:
//   1. The transaction row (status, amounts, partner refs, error).
//   2. Every wallet ledger entry linked to it (DEBIT reserve, REVERSAL refund,
//      SERVICE_MARGIN, LIEN) so you can see if a refund was ever paid out.
//   3. The provider-pollable references mined from its request/response JSON
//      (deriveTxnRefs) — the keys recon/resolve would use to verify it.
import "./_load-env";
import { PrismaClient } from "@prisma/client";
import { deriveTxnRefs } from "../src/lib/recon/refs";

const prisma = new PrismaClient();

function money(v: unknown) {
  return `₹${Number(v).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

async function main() {
  const ref = process.argv[2];
  if (!ref) {
    console.error("Usage: npx tsx scripts/diag-txn.ts <refId|partnerTxnId>");
    process.exit(1);
  }

  const txn = await prisma.transaction.findFirst({
    where: { OR: [{ refId: ref }, { partnerTxnId: ref }] },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  if (!txn) {
    console.log(`\nNo transaction found for "${ref}".\n`);
    return;
  }

  console.log("\n=== Transaction ===");
  console.log(`refId        : ${txn.refId}`);
  console.log(`id           : ${txn.id}`);
  console.log(`retailer     : ${txn.user.name} <${txn.user.email}> (${txn.userId})`);
  console.log(`service      : ${txn.service}`);
  console.log(`partner      : ${txn.partner ?? "—"}`);
  console.log(`partnerTxnId : ${txn.partnerTxnId ?? "—"}`);
  console.log(`status       : ${txn.status}`);
  console.log(`amount       : ${money(txn.amount)}  fee: ${money(txn.fee)}`);
  console.log(`errorCode    : ${txn.errorCode ?? "—"}`);
  console.log(`errorMessage : ${txn.errorMessage ?? "—"}`);
  console.log(`createdAt    : ${txn.createdAt.toISOString()}`);
  console.log(`updatedAt    : ${txn.updatedAt.toISOString()}`);

  // 2. Money trail — every wallet entry that references this txn.
  const trail = await prisma.walletTxn.findMany({
    where: { refType: "Transaction", refId: txn.id },
    orderBy: { createdAt: "asc" },
  });

  console.log(`\n=== Wallet ledger trail (${trail.length} entries) ===`);
  if (trail.length === 0) {
    console.log("(none linked by refType=Transaction + refId)");
  }
  let refundTotal = 0;
  for (const w of trail) {
    if (w.direction === "CREDIT" && w.reason === "REVERSAL") refundTotal += Number(w.amount);
    console.log(
      `  ${w.createdAt.toISOString()}  ${w.direction.padEnd(6)} ${w.reason.padEnd(14)} ${money(
        w.amount
      ).padStart(14)}  bal→ ${money(w.balanceAfter)}  key=${w.idempotencyKey ?? "—"}`
    );
  }
  console.log(
    `\nRefund (REVERSAL CREDIT) paid for this txn: ${money(refundTotal)} ${
      refundTotal > 0 ? "←— a refund WAS issued" : "(no refund issued)"
    }`
  );

  // 3. Provider-pollable references.
  const refs = deriveTxnRefs({
    partnerTxnId: txn.partnerTxnId,
    request: txn.request,
    response: txn.response,
  });
  console.log(`\n=== Pollable provider references (${refs.length}) ===`);
  console.log(refs.length ? refs.map((r) => `  • ${r}`).join("\n") : "  (none — nothing to poll)");
  console.log("");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
