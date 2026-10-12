// Provider-VERIFIED resolver for a single stuck/held/wrongly-failed transaction.
//   Run:  npx tsx scripts/resolve-txn.ts <refId|partnerTxnId> [--provider-ref=XXX] [--actor=<userId>] --yes
//
// This is the CLI twin of the admin "Verify & resolve" button. It NEVER flips
// money on trust: correctOneTransaction re-checks the provider's own status API
// (by any stored ref + an optional --provider-ref recovered from the partner
// panel) and only then:
//   • settles / refunds a non-terminal (NEEDS_REVIEW / PROCESSING) row, or
//   • corrects a wrongly-FAILED row the provider confirms SUCCESS, placing a
//     LIEN clawback of any earlier refund (never a negative wallet).
//
// It CHANGES MONEY, so it requires an explicit --yes. Do not run against prod
// unless you intend to settle the transaction.
import "./_load-env";
import { PrismaClient } from "@prisma/client";
import { correctOneTransaction } from "../src/lib/recon/reconcileOne";

const prisma = new PrismaClient();

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : undefined;
}

async function main() {
  const ref = process.argv[2];
  const confirmed = process.argv.includes("--yes");
  const providerRef = arg("provider-ref");
  let actorId = arg("actor");

  if (!ref || ref.startsWith("--")) {
    console.error(
      "Usage: npx tsx scripts/resolve-txn.ts <refId|partnerTxnId> [--provider-ref=XXX] [--actor=<userId>] --yes"
    );
    process.exit(1);
  }

  // Resolve an actor for the audit trail — explicit --actor, else a master-admin.
  if (!actorId) {
    const admin = await prisma.user.findFirst({
      where: { role: "MASTER_ADMIN" },
      select: { id: true, email: true },
    });
    if (!admin) {
      console.error("No --actor given and no MASTER_ADMIN user found. Pass --actor=<userId>.");
      process.exit(1);
    }
    actorId = admin.id;
    console.log(`Using actor (master-admin): ${admin.email} (${admin.id})`);
  }

  if (!confirmed) {
    console.log(
      `\nDRY NOTE: this will VERIFY ${ref} with the provider and may move money (settle / refund / clawback).`
    );
    console.log("Re-run with --yes to execute.\n");
    return;
  }

  console.log(`\nVerifying ${ref} with the provider…\n`);
  const result = await correctOneTransaction(ref, {
    actorId: actorId!,
    providerRef,
    source: "cli_resolve",
  });

  console.log(JSON.stringify(result, null, 2));

  if (!result.found) {
    console.log("\n→ Transaction not found.\n");
  } else if (result.outcome === "unresolved") {
    console.log(
      "\n→ Provider could NOT confirm from any reference. Nothing changed — the hold stays. " +
        "Find the pay-step reference in the partner panel and retry with --provider-ref=...\n"
    );
  } else {
    console.log(`\n→ Outcome: ${result.outcome} (provider: ${result.providerStatus}).\n`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
