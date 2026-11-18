/**
 * User Kit Cooling Sweep
 *
 * Scheduled daily (00:30 IST via the KIT_COOLING_SWEEP pg-boss queue).
 * Transitions all COOLING kits whose coolingEndsAt has passed back to
 * AVAILABLE, making them reusable for a new invite. Fully idempotent.
 */

import { prisma } from "@/lib/db";

export type CoolingSweepResult = {
  released: number;
};

/**
 * Run the cooling sweep: find every COOLING kit whose cooling period has
 * ended and return it to AVAILABLE status.
 */
export async function runKitCoolingSweep(): Promise<CoolingSweepResult> {
  const now = new Date();

  const { count } = await prisma.userKit.updateMany({
    where: {
      status: "COOLING",
      coolingEndsAt: { lte: now },
    },
    data: {
      status:         "AVAILABLE",
      coolingStartAt: null,
      coolingEndsAt:  null,
      // inviteId was already nulled when cooling started; keep null.
    },
  });

  return { released: count };
}
