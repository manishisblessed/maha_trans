/**
 * Server-side upload proxy for the onboarding liveness video (Phase 14).
 *
 * The browser calls this endpoint when the direct presigned S3 PUT fails —
 * most commonly because the S3 bucket's CORS rules have not been configured
 * yet (run `node scripts/setup-s3-cors.mjs` to fix permanently).
 *
 * Security model:
 * - Same upload-token HMAC verification as /complete (invite + key binding).
 * - Size re-checked server-side after reading the body.
 * - Bytes are PUT to S3 via the AWS SDK (no CORS involved).
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  putKycVideoObject,
  kycStorageConfigured,
  isAllowedVideoContentType,
  KYC_VIDEO_MAX_BYTES,
  type KycVideoContentType,
} from "@/lib/storage/s3Kyc";
import crypto from "crypto";

export const fetchCache = "force-no-store";
export const dynamic = "force-dynamic";

/** Mirrors the token verification logic in /complete to keep coupling minimal. */
function verifyUploadToken(token: string, inviteId: string, key: string): boolean {
  const [b64, sig] = token.split(".");
  if (!b64 || !sig) return false;
  const secret = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET;
  if (!secret) return false;
  let payload: string;
  try {
    payload = Buffer.from(b64, "base64").toString();
  } catch {
    return false;
  }
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  if (sig.length !== expected.length) return false;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
  const parts = payload.split(":");
  const exp = parseInt(parts[3], 10);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false;
  return parts[0] === "onboard" && parts[1] === inviteId && parts[2] === key;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  if (!kycStorageConfigured()) {
    return NextResponse.json({ error: "Video storage is not configured" }, { status: 503 });
  }

  const invite = await prisma.invite.findUnique({ where: { token } });
  if (!invite) {
    return NextResponse.json({ error: "Invalid invite" }, { status: 404 });
  }

  if (!["PENDING", "REGISTERED", "RESUBMIT"].includes(invite.status)) {
    return NextResponse.json({ error: "Invite is no longer active" }, { status: 400 });
  }

  if (new Date() > invite.expiresAt) {
    return NextResponse.json({ error: "Invite has expired" }, { status: 400 });
  }

  const key = req.headers.get("x-upload-key");
  const uploadToken = req.headers.get("x-upload-token");
  // Strip any charset suffix (e.g. "video/mp4; codecs=...") before checking.
  const contentType = (req.headers.get("content-type") ?? "").split(";")[0].trim();

  if (!key || !uploadToken) {
    return NextResponse.json({ error: "Missing upload metadata headers" }, { status: 400 });
  }

  if (!isAllowedVideoContentType(contentType)) {
    return NextResponse.json({ error: "Unsupported video format" }, { status: 400 });
  }

  if (!verifyUploadToken(uploadToken, invite.id, key)) {
    return NextResponse.json({ error: "Invalid or expired upload token" }, { status: 403 });
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(await req.arrayBuffer());
  } catch {
    return NextResponse.json({ error: "Could not read video body" }, { status: 400 });
  }

  if (buffer.byteLength === 0) {
    return NextResponse.json({ error: "Empty video body" }, { status: 400 });
  }

  if (buffer.byteLength > KYC_VIDEO_MAX_BYTES) {
    return NextResponse.json({ error: "Video file is too large" }, { status: 413 });
  }

  try {
    await putKycVideoObject(key, buffer, contentType as KycVideoContentType);
  } catch {
    return NextResponse.json(
      { error: "Storage upload failed. Please try again." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
