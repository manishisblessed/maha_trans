import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth-server";
import { prisma } from "@/lib/db";
import { toErrorResponse } from "@/lib/security/apiErrors";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/security/rateLimit";

/**
 * Self-service login (second-factor) method management.
 *
 * TPIN login is auto-enabled for any user who has both a transaction PIN AND
 * has completed authenticator setup at least once (twoFactorVerifiedAt). No
 * admin permission or self-service toggle is required — the choice between
 * authenticator and TPIN simply appears at login when conditions are met.
 *
 * This endpoint lets users set a preferred method (to skip the chooser) and
 * view the current status. The first-time risk acceptance is handled at login
 * by the PinLoginStep component + /api/auth/pin-login/verify.
 *
 *   GET  → current capabilities + preference
 *   POST → { action: "setPreference", preferred: "authenticator" | "tpin" | null }
 */

// Highly-privileged staff accounts may not weaken their own login to a PIN.
const SELF_PIN_LOGIN_BLOCKED_ROLES = new Set(["ADMIN", "MASTER_ADMIN"]);

const Body = z.object({
  action: z.literal("setPreference"),
  preferred: z.enum(["authenticator", "tpin"]).nullable(),
});

export const fetchCache = "force-no-store";
export const dynamic = "force-dynamic";

async function loadState(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      twoFactorEnabled: true,
      twoFactorSecret: true,
      twoFactorVerifiedAt: true,
      txnPinHash: true,
      pinLoginRiskAcceptedAt: true,
      preferredLoginMethod: true,
    },
  });
  return user;
}

function summarize(user: NonNullable<Awaited<ReturnType<typeof loadState>>>) {
  const canAuthenticator = Boolean(user.twoFactorEnabled && user.twoFactorSecret);
  // TPIN login is auto-enabled: txn PIN set + authenticator done at least once.
  const pinLoginEnabled = Boolean(user.txnPinHash && user.twoFactorVerifiedAt);
  return {
    selfManageable: !SELF_PIN_LOGIN_BLOCKED_ROLES.has(user.role),
    twoFactorEnabled: canAuthenticator,
    hasTxnPin: Boolean(user.txnPinHash),
    hasCompletedAuthenticator: Boolean(user.twoFactorVerifiedAt),
    pinLoginEnabled,
    riskAccepted: Boolean(user.pinLoginRiskAcceptedAt),
    canChoose: canAuthenticator && pinLoginEnabled,
    preferred: user.preferredLoginMethod ?? null,
  };
}

export async function GET() {
  try {
    const auth = await requireAuth();
    const user = await loadState(auth.id);
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(summarize(user));
  } catch (e) {
    return toErrorResponse(e);
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAuth();
    await enforceRateLimit(`loginmethod:${auth.id}`, RATE_LIMITS.twoFactor);

    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success)
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const user = await loadState(auth.id);
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const state = summarize(user);
    const body = parsed.data;

    // ── Set the preferred method ────────────────────────────────────────────
    // TPIN login is auto-enabled (txn PIN + completed authenticator). The user
    // may save a preference to skip the chooser at login, or set it to null so
    // the chooser appears every time.
    if (body.preferred === "authenticator" && !state.twoFactorEnabled) {
      return NextResponse.json(
        { error: "You don't have an authenticator app set up." },
        { status: 400 }
      );
    }
    if (body.preferred === "tpin" && !state.pinLoginEnabled) {
      return NextResponse.json(
        { error: "TPIN login isn't available yet. Set up a transaction PIN and complete authenticator setup first." },
        { status: 400 }
      );
    }

    await prisma.user.update({
      where: { id: auth.id },
      data: { preferredLoginMethod: body.preferred },
    });

    const fresh = await loadState(auth.id);
    return NextResponse.json({ ok: true, ...summarize(fresh!) });
  } catch (e) {
    return toErrorResponse(e);
  }
}
