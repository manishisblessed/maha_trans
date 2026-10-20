/**
 * Server-side upload proxy for the dashboard KYC liveness video (Phase 14).
 *
 * Mirrors the onboard proxy but requires an authenticated session. Called when
 * the direct presigned S3 PUT fails (typically CORS — run setup-s3-cors.mjs).
 */
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import {
  putKycVideoObject,
  kycStorageConfigured,
  isAllowedVideoContentType,
  keyBelongsToUser,
  KYC_VIDEO_MAX_BYTES,
  type KycVideoContentType,
} from "@/lib/storage/s3Kyc";
import { toErrorResponse } from "@/lib/security/apiErrors";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/security/rateLimit";
import { clientIp } from "@/lib/security/audit";
import crypto from "crypto";

export const fetchCache = "force-no-store";
export const dynamic = "force-dynamic";

function uploadTokenSecret(): string {
  const s = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET;
  if (!s) throw new Error("[kyc.video] NEXTAUTH_SECRET or JWT_SECRET must be set");
  return s;
}

/** Mirrors verifyUploadToken() in src/lib/kyc/video/service.ts. */
function verifyUploadToken(token: string, userId: string, key: string): boolean {
  const [b64, sig] = token.split(".");
  if (!b64 || !sig) return false;
  let payload: string;
  try {
    payload = Buffer.from(b64, "base64").toString();
  } catch {
    return false;
  }
  const expected = crypto
    .createHmac("sha256", uploadTokenSecret())
    .update(payload)
    .digest("hex");
  if (sig.length !== expected.length) return false;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
  const [tUser, tKey, expStr] = payload.split(":");
  const exp = parseInt(expStr, 10);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false;
  return tUser === userId && tKey === key;
}

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const ip = clientIp(req);

    await enforceRateLimit(`kyc:video:upload:user:${user.id}`, RATE_LIMITS.kycVideo);
    await enforceRateLimit(`kyc:video:upload:ip:${ip}`, RATE_LIMITS.kycVideo);

    if (!kycStorageConfigured()) {
      return NextResponse.json({ error: "Video storage is not configured" }, { status: 503 });
    }

    const key = req.headers.get("x-upload-key");
    const uploadToken = req.headers.get("x-upload-token");
    const contentType = (req.headers.get("content-type") ?? "").split(";")[0].trim();

    if (!key || !uploadToken) {
      return NextResponse.json({ error: "Missing upload metadata headers" }, { status: 400 });
    }

    if (!isAllowedVideoContentType(contentType)) {
      return NextResponse.json({ error: "Unsupported video format" }, { status: 400 });
    }

    if (!keyBelongsToUser(key, user.id) || !verifyUploadToken(uploadToken, user.id, key)) {
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
  } catch (e) {
    return toErrorResponse(e);
  }
}
