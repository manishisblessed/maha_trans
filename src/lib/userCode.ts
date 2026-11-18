import { prisma } from "@/lib/db";
import { buildUserCode, USER_CODE_PREFIX } from "@/lib/utils";

/**
 * Generate the next sequential userCode for a given role.
 *
 * Checks BOTH the User table AND the UserKit table for the highest existing
 * code with that prefix, then returns prefix + (MAX + 1). This guarantees
 * global uniqueness: once a code is pre-minted into a kit it is permanently
 * reserved and can never collide with a later user registration.
 *
 * Safe for concurrent use: the caller should retry on unique-constraint
 * violation (race between two simultaneous creates for the same role).
 */
export async function generateNextUserCode(role: string): Promise<string> {
  const prefix = USER_CODE_PREFIX[role];
  if (!prefix) throw new Error(`No userCode prefix defined for role: ${role}`);

  // Query both tables in parallel — take the MAX sequence across both.
  const [latestUser, latestKit] = await Promise.all([
    prisma.user.findFirst({
      where: { userCode: { startsWith: prefix } },
      orderBy: { userCode: "desc" },
      select: { userCode: true },
    }),
    prisma.userKit.findFirst({
      where: { userCode: { startsWith: prefix } },
      orderBy: { userCode: "desc" },
      select: { userCode: true },
    }),
  ]);

  const extractSeq = (code?: string | null): number => {
    if (!code) return 0;
    const n = parseInt(code.slice(prefix.length), 10);
    return isNaN(n) ? 0 : n - 100;
  };

  const seq = Math.max(extractSeq(latestUser?.userCode), extractSeq(latestKit?.userCode)) + 1;
  return buildUserCode(role, seq);
}

/**
 * Assign userCodes to all existing users who don't have one yet.
 * Groups by role, orders by createdAt, and assigns sequentially.
 */
export async function backfillUserCodes(): Promise<number> {
  const roles = Object.keys(USER_CODE_PREFIX);
  let assigned = 0;

  for (const role of roles) {
    const prefix = USER_CODE_PREFIX[role];

    const highestExisting = await prisma.user.findFirst({
      where: { userCode: { startsWith: prefix } },
      orderBy: { userCode: "desc" },
      select: { userCode: true },
    });

    let nextSeq = 1;
    if (highestExisting?.userCode) {
      const numPart = parseInt(highestExisting.userCode.slice(prefix.length), 10);
      if (!isNaN(numPart)) nextSeq = numPart - 100 + 1;
    }

    const usersWithoutCode = await prisma.user.findMany({
      where: { role: role as any, userCode: null },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });

    for (const u of usersWithoutCode) {
      const code = buildUserCode(role, nextSeq);
      await prisma.user.update({
        where: { id: u.id },
        data: { userCode: code },
      });
      nextSeq++;
      assigned++;
    }
  }

  return assigned;
}
