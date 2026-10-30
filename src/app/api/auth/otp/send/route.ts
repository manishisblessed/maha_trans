import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { getPartner } from "@/lib/partners";
import { prisma } from "@/lib/db";
import { sha256 } from "@/lib/crypto";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/security/rateLimit";
import { assertCaptcha } from "@/lib/security/captcha";
import { clientIp, logSecurityEvent } from "@/lib/security/audit";
import { toErrorResponse } from "@/lib/security/apiErrors";
import { isTwilioOtpEnabled, sendVerification } from "@/lib/partners/twilio";
import { TENANT_HEADER } from "@/lib/tenant/context";

const Body = z.object({
  channel: z.enum(["SMS", "EMAIL"]).default("SMS"),
  target: z.string().min(5).max(120),
  purpose: z.enum(["LOGIN", "REGISTER", "RESET", "TXN"]).default("LOGIN"),
  captchaToken: z.string().max(4000).optional()
});

function generate6() {
  return String(100000 + (crypto.randomInt(0, 900000)));
}

function maskTarget(target: string): string {
  if (target.includes("@")) {
    const [name, domain] = target.split("@");
    return `${name.slice(0, 2)}***@${domain ?? ""}`;
  }
  return target.length > 4 ? `***${target.slice(-4)}` : "***";
}

export const fetchCache = "force-no-store";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const ip = clientIp(req);
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    await enforceRateLimit(`otp:target:${parsed.data.target.toLowerCase()}`, RATE_LIMITS.otp);
    await enforceRateLimit(`otp:ip:${ip}`, RATE_LIMITS.otpIp);
    await assertCaptcha(parsed.data.captchaToken, ip);
  } catch (e) {
    return toErrorResponse(e);
  }

  await logSecurityEvent({
    action: "auth.otp_sent",
    entity: "Otp",
    ip,
    userAgent: req.headers.get("user-agent"),
    meta: { channel: parsed.data.channel, purpose: parsed.data.purpose, target: maskTarget(parsed.data.target) },
  });

  // Twilio Verify handles SMS OTPs end-to-end (no local OTP storage needed)
  if (parsed.data.channel === "SMS" && isTwilioOtpEnabled()) {
    const phone = parsed.data.target.startsWith("+")
      ? parsed.data.target
      : `+91${parsed.data.target.replace(/\D/g, "").slice(-10)}`;

    const r = await sendVerification({ to: phone, channel: "sms" });
    if (!r.ok) return NextResponse.json({ error: r.message }, { status: 502 });
    return NextResponse.json({ ok: true, provider: "twilio" });
  }

  // Fallback: self-managed OTP via MSG91 (SMS) or Resend (Email)
  const otp = generate6();
  const codeHash = sha256(otp);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  await prisma.otp.create({
    data: { channel: parsed.data.channel, target: parsed.data.target, codeHash, purpose: parsed.data.purpose, expiresAt }
  });

  // Resolve platform name from the tenant header injected by middleware
  const tenantId = req.headers.get(TENANT_HEADER);
  let platformName = "TRANSPE";
  let primaryColor = "#172b6b";
  if (tenantId) {
    try {
      const tenantProfile = await prisma.whitelabelProfile.findUnique({
        where: { userId: tenantId },
        select: { brandName: true, primaryColor: true, status: true },
      });
      if (tenantProfile?.status === "LIVE" && tenantProfile.brandName) {
        platformName = tenantProfile.brandName;
        primaryColor = tenantProfile.primaryColor ?? "#172b6b";
      }
    } catch {
      // Brand resolution is best-effort; fall back to TRANSPE defaults
    }
  }

  if (parsed.data.channel === "SMS") {
    const sms = getPartner("sms");
    const r = await sms.sendOtp({
      phone: parsed.data.target,
      otp,
      variables: tenantId ? { _brand: platformName } : undefined,
    });
    if (!r.ok) return NextResponse.json({ error: r.message }, { status: 502 });
  } else {
    const email = getPartner("email");
    const r = await email.send({
      to: parsed.data.target,
      // Code in the subject: visible in the inbox preview and prevents Gmail
      // from collapsing repeated OTP mails into one stale-looking thread.
      subject: `${otp} is your ${platformName} OTP`,
      text: `Your OTP is ${otp}. Valid for 5 minutes. Do not share it with anyone.`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
          <div style="background:${primaryColor};padding:14px 18px;border-radius:8px 8px 0 0;">
            <span style="color:#fff;font-weight:700;letter-spacing:0.5px;">${platformName}</span>
          </div>
          <div style="border:1px solid #e2e8f0;border-top:0;border-radius:0 0 8px 8px;padding:18px;">
            <p style="margin:0 0 12px;color:#334155;">Your one-time password is:</p>
            <div style="background:#f1f5f9;border-radius:8px;padding:14px;text-align:center;margin:0 0 12px;">
              <span style="font-size:32px;font-weight:bold;letter-spacing:8px;color:${primaryColor};">${otp}</span>
            </div>
            <p style="color:#64748b;font-size:13px;margin:0;">Valid for 5 minutes. Do not share it with anyone.</p>
            ${tenantId ? `<p style="color:#94a3b8;font-size:11px;margin-top:16px;text-align:center;">Powered by TRANSPE</p>` : ""}
          </div>
        </div>
      `,
    });
    if (!r.ok) return NextResponse.json({ error: r.message }, { status: 502 });
  }

  return NextResponse.json({ ok: true, expiresAt });
}
