import { requireAuth, AuthError } from "@/lib/auth-server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
// Long-lived SSE — never impose a function timeout
export const maxDuration = 0;

/** How often to poll the DB for new transactions (ms). */
const REFRESH_MS = 5_000;
/** How often to send a keepalive ping (ms). */
const PING_MS = 15_000;
/** Refresh the downline ID list every N ms (membership can change). */
const DOWNLINE_REFRESH_MS = 5 * 60 * 1000;
/** Max rows fetched per poll tick (prevents burst-flooding the client). */
const MAX_EVENTS = 20;

const NETWORK_ROLES = new Set([
  "SUPER_DISTRIBUTOR",
  "MASTER_DISTRIBUTOR",
  "DISTRIBUTOR",
]);

const ROLE_ABBR: Record<string, string> = {
  SUPER_DISTRIBUTOR: "SD",
  MASTER_DISTRIBUTOR: "MD",
  DISTRIBUTOR: "DT",
  RETAILER: "RT",
};

const SERVICE_LABELS: Record<string, string> = {
  AEPS_WITHDRAWAL: "AePS Withdrawal",
  AEPS_BALANCE: "AePS Balance",
  AEPS_MINISTATEMENT: "AePS Mini Statement",
  RECHARGE_MOBILE: "Mobile Recharge",
  RECHARGE_DTH: "DTH Recharge",
  RECHARGE_BROADBAND: "Broadband",
  BILL_ELECTRICITY: "Electricity Bill",
  BILL_WATER: "Water Bill",
  BILL_GAS: "Gas Bill",
  BILL_CREDIT_CARD: "Credit Card Bill",
  BILL_EDUCATION: "Education Fee",
  BILL_INSURANCE: "Insurance",
  BILL_BBPS: "BBPS",
  DMT_IMPS: "Money Transfer",
  DMT: "Money Transfer",
  UPI_COLLECT: "UPI Collect",
  PAYOUT: "Payout",
  PAN: "PAN Application",
  TRAVEL_FLIGHT: "Flight Booking",
  TRAVEL_HOTEL: "Hotel Booking",
  TRAVEL_BUS: "Bus Booking",
};

function serviceLabel(service: string): string {
  return (
    SERVICE_LABELS[service] ??
    service
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

function statusDisplay(s: string): "Success" | "Pending" | "Failed" {
  if (s === "SUCCESS" || s === "SETTLED") return "Success";
  if (s === "PENDING" || s === "PROCESSING" || s === "INITIATED") return "Pending";
  return "Failed";
}

/**
 * GET /api/network/live-stream — Server-Sent Events feed.
 *
 * Streams new transactions from the caller's ENTIRE downline (all levels)
 * in near-real-time using SSE. Polls the Transaction table every 5 s
 * and pushes only newly created rows since the last tick.
 *
 * Protocol:
 *   • `data: { events: LiveEvent[] }` — one or more new transactions
 *   • `event: fatal` + `data: { error }` — terminal; client must not reconnect
 *   • `: ping` — heartbeat every 15 s
 */
export async function GET(req: Request) {
  let fatal: string | null = null;
  let callerId: string | null = null;

  try {
    const user = await requireAuth();
    if (!NETWORK_ROLES.has(user.role)) {
      fatal = "Forbidden — only SD / MD / DT can access the live stream.";
    } else {
      callerId = user.id;
    }
  } catch (e) {
    fatal = e instanceof AuthError ? e.message : "Unauthorized";
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      let running = false;
      let dataTimer: ReturnType<typeof setInterval> | null = null;
      let pingTimer: ReturnType<typeof setInterval> | null = null;
      let downlineTimer: ReturnType<typeof setInterval> | null = null;
      let downlineIds: string[] = [];
      // Start tracking from "now" — don't replay historical transactions
      let lastSeenAt = new Date();

      const safeEnqueue = (chunk: string): boolean => {
        if (closed) return false;
        try {
          controller.enqueue(encoder.encode(chunk));
          return true;
        } catch {
          return false;
        }
      };

      const cleanup = () => {
        if (closed) return;
        closed = true;
        if (dataTimer) clearInterval(dataTimer);
        if (pingTimer) clearInterval(pingTimer);
        if (downlineTimer) clearInterval(downlineTimer);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      req.signal.addEventListener("abort", cleanup);

      // Terminal condition
      if (fatal || !callerId) {
        safeEnqueue(
          `event: fatal\ndata: ${JSON.stringify({
            error: fatal ?? "Stream unavailable",
          })}\n\n`
        );
        cleanup();
        return;
      }

      const activeCallerId = callerId;

      // Refresh the downline ID list (membership can change as invites are accepted)
      const refreshDownline = async () => {
        try {
          const rows = await prisma.$queryRaw<{ id: string }[]>`
            WITH RECURSIVE tree AS (
              SELECT id FROM "User"
              WHERE  "parentId" = ${activeCallerId}
                AND  "deletedAt" IS NULL
              UNION ALL
              SELECT u.id FROM "User" u
              INNER JOIN tree t ON u."parentId" = t.id
              WHERE  u."deletedAt" IS NULL
            )
            SELECT id FROM tree
          `;
          downlineIds = rows.map((r) => r.id);
        } catch {
          // Keep existing IDs on transient DB error
        }
      };

      // Prime downline list
      await refreshDownline();
      downlineTimer = setInterval(() => void refreshDownline(), DOWNLINE_REFRESH_MS);

      // Main poll tick
      const tick = async () => {
        if (closed || running || downlineIds.length === 0) return;
        running = true;
        try {
          const cutoff = lastSeenAt;
          const tickAt = new Date();

          const txns = await prisma.transaction.findMany({
            where: {
              userId: { in: downlineIds },
              isSettlement: false,
              createdAt: { gt: cutoff },
              status: { in: ["SUCCESS", "FAILED", "PENDING"] },
            },
            orderBy: { createdAt: "asc" },
            take: MAX_EVENTS,
            include: {
              user: {
                select: {
                  name: true,
                  role: true,
                  city: true,
                  userCode: true,
                  shopName: true,
                },
              },
            },
          });

          // Always advance the cursor so we don't re-fetch
          lastSeenAt = tickAt;

          if (txns.length > 0) {
            const events = txns.map((t) => ({
              id: t.id,
              member: {
                name: t.user?.name ?? "—",
                roleAbbr: ROLE_ABBR[t.user?.role ?? ""] ?? "?",
                city: t.user?.city ?? "—",
                shop: t.user?.shopName ?? null,
                userCode: t.user?.userCode ?? null,
              },
              service: String(t.service),
              serviceLabel: serviceLabel(String(t.service)),
              amount: Number(t.amount),
              commission: Number(t.commission ?? 0),
              status: statusDisplay(String(t.status)),
              createdAt: t.createdAt.toISOString(),
            }));
            safeEnqueue(`data: ${JSON.stringify({ events })}\n\n`);
          }
        } catch {
          // Transient DB blip — keep the stream open, retry next tick
        } finally {
          running = false;
        }
      };

      // Prime immediately, then on interval
      await tick();
      if (closed) return;
      dataTimer = setInterval(() => void tick(), REFRESH_MS);
      pingTimer = setInterval(() => safeEnqueue(`: ping\n\n`), PING_MS);
    },
    cancel() {
      /* abort event fires cleanup */
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Nginx: flush immediately, no buffering
      "X-Accel-Buffering": "no",
    },
  });
}
