// Ops resolver for payouts HELD as NEEDS_REVIEW (indeterminate send outcome).
//
// A payout whose transfer response was lost (5xx / timeout / network) may have
// been disbursed by the bank, so the hold is RETAINED. This tool lets ops:
//   • LIST every held payout + current exposure (no args).
//   • For one payout: recover the lost Same Day reference (match amount +
//     account last-4 + time against the rail's recent transactions), poll the
//     authoritative status, and finalize — or, after a manual bank check, force
//     the outcome (capture / release the hold).
//
//   Run:
//     npx tsx scripts/resolve-payout.ts                      # list held payouts
//     npx tsx scripts/resolve-payout.ts <payoutId> --action=recover
//     npx tsx scripts/resolve-payout.ts <payoutId> --action=poll --ref=<reference_id>
//     npx tsx scripts/resolve-payout.ts <payoutId> --action=force_paid --utr=<utr> --yes
//     npx tsx scripts/resolve-payout.ts <payoutId> --action=force_failed --note="bank did not disburse" --yes
//
// SAFE BY DEFAULT: recover/poll never move money unless the rail is terminal.
// force_* move money and REQUIRE --yes. --actor=<userId> sets the audit actor.
import "./_load-env";
import { PrismaClient } from "@prisma/client";
import {
  listHeldPayouts,
  resolveOnePayout,
  type ResolvePayoutAction,
} from "../src/lib/payout/service";

const prisma = new PrismaClient();

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : undefined;
}

const VALID: ResolvePayoutAction[] = ["recover", "poll", "force_paid", "force_failed"];

async function main() {
  const id = process.argv[2];

  // No id → list the held queue and exit (read-only).
  if (!id || id.startsWith("--")) {
    const held = await listHeldPayouts(500);
    const exposure = held.reduce((s, h) => s + h.totalDebit, 0);
    console.log(`\n=== Held payouts (NEEDS_REVIEW): ${held.length} · exposure ₹${exposure.toFixed(2)} ===\n`);
    for (const h of held) {
      console.log(
        `${h.id}  ₹${h.totalDebit.toFixed(2)}  ${h.mode}  ${h.beneficiaryName} ••${h.accountLast4 ?? "----"}  ` +
          `ref=${h.bulkpeReferenceId}  rail=${h.bulkpeTxnId ?? "(lost)"}  ` +
          `since=${h.processedAt ?? h.createdAt}  user=${h.userCode ?? h.userId}`
      );
    }
    console.log(
      "\nResolve one:  npx tsx scripts/resolve-payout.ts <payoutId> --action=recover|poll|force_paid|force_failed [--ref=] [--utr=] [--note=] [--yes]\n"
    );
    return;
  }

  const action = arg("action") as ResolvePayoutAction | undefined;
  const ref = arg("ref");
  const utr = arg("utr");
  const note = arg("note");
  const confirmed = process.argv.includes("--yes");
  let actorId = arg("actor");

  if (!action || !VALID.includes(action)) {
    console.error(`--action must be one of: ${VALID.join(", ")}`);
    process.exit(1);
  }
  if (action === "poll" && !ref) {
    console.error("--action=poll requires --ref=<reference_id> (the Same Day reference, not a PO… id)");
    process.exit(1);
  }

  const row = await prisma.payoutRequest.findUnique({ where: { id } });
  if (!row) {
    console.error(`No payout found for ${id}`);
    process.exit(1);
  }
  console.log(`\n=== ${row.id} ===`);
  console.log(`status          : ${row.status}`);
  console.log(`amount/debit    : ${row.amount} / ${row.totalDebit}`);
  console.log(`beneficiary     : ${row.beneficiaryName} ••${row.accountLast4 ?? "----"} (${row.mode})`);
  console.log(`our ref         : ${row.bulkpeReferenceId}`);
  console.log(`rail ref        : ${row.bulkpeTxnId ?? "(lost)"}`);

  if (row.status !== "NEEDS_REVIEW") {
    console.log(`\nNot held (status ${row.status}) — nothing to resolve.`);
    return;
  }

  const movesMoney = action === "force_paid" || action === "force_failed";
  if (movesMoney && !confirmed) {
    console.log(
      `\n[dry-run] --action=${action} would ${
        action === "force_paid" ? "CAPTURE the hold (real debit)" : "RELEASE the hold to the wallet"
      }. Re-run with --yes to execute.`
    );
    return;
  }

  if (!actorId) {
    const master = await prisma.user.findFirst({ where: { role: "MASTER_ADMIN" }, select: { id: true } });
    actorId = master?.id ?? row.userId;
  }

  const result = await resolveOnePayout(row.id, {
    actorId,
    action,
    reference: ref ?? null,
    utr: utr ?? null,
    note: note ?? null,
  });

  console.log(`\nresult          : ${JSON.stringify(result)}`);
  if (result.changed) console.log(`✔ resolved → ${result.status}`);
  else console.log(`… still held (rail not terminal / no reference). Recon will keep polling.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
