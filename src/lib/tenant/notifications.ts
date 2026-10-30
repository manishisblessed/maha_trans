/**
 * Tenant-aware notification helpers.
 *
 * Wraps SMS/email sending with brand substitution for white-label tenants.
 * Platform name ("TRANSPE") is replaced with the tenant brand name in all
 * user-visible text when the user belongs to a white-label tenant.
 */

import { prisma } from "@/lib/db";
import { getPartner } from "@/lib/partners";

export type TenantNotificationBrand = {
  brandName: string;
  primaryColor: string;
  supportEmail: string | null;
};

/**
 * Resolve the notification brand for a user based on their platformOwnerId.
 * Returns null for native TRANSPE users.
 */
export async function resolveNotificationBrand(
  platformOwnerId: string | null | undefined
): Promise<TenantNotificationBrand | null> {
  if (!platformOwnerId) return null;
  try {
    const profile = await prisma.whitelabelProfile.findUnique({
      where: { userId: platformOwnerId },
      select: { brandName: true, primaryColor: true, supportEmail: true, status: true },
    });
    if (!profile || profile.status !== "LIVE") return null;
    return { brandName: profile.brandName, primaryColor: profile.primaryColor, supportEmail: profile.supportEmail };
  } catch {
    return null;
  }
}

/**
 * Replace the platform name in a string template.
 * "TRANSPE" → tenant brand name when in white-label context.
 */
export function applyBrandToText(
  text: string,
  brand: TenantNotificationBrand | null
): string {
  if (!brand) return text;
  return text.replace(/TRANSPE/g, brand.brandName);
}

/**
 * Build a tenant-aware email footer HTML block.
 * Shows the tenant brand name with "Powered by TRANSPE" attribution.
 */
export function buildEmailFooter(
  year: number,
  brand: TenantNotificationBrand | null
): string {
  if (!brand) {
    return `
      <td style="padding:24px 32px 28px;background:#0f172a;color:#94a3b8;font-size:12px;line-height:1.6;text-align:center;">
        <p style="margin:0 0 4px;color:#f1f5f9;font-weight:700;letter-spacing:0.4px;">TRANSPE</p>
        <p style="margin:0 0 10px;color:#cbd5e1;">transpe.net</p>
        <p style="margin:0;color:#64748b;">&copy; ${year} TRANSPE. All rights reserved.<br />This is an automated message &mdash; please do not reply.</p>
      </td>
    `;
  }
  return `
    <td style="padding:24px 32px 28px;background:${brand.primaryColor};color:rgba(255,255,255,0.8);font-size:12px;line-height:1.6;text-align:center;">
      <p style="margin:0 0 4px;color:#ffffff;font-weight:700;letter-spacing:0.4px;">${brand.brandName}</p>
      <p style="margin:0 0 10px;color:rgba(255,255,255,0.6);">${brand.supportEmail ?? ""}</p>
      <p style="margin:0;color:rgba(255,255,255,0.5);">&copy; ${year} ${brand.brandName}. All rights reserved.<br />Powered by TRANSPE &middot; This is an automated message.</p>
    </td>
  `;
}

/**
 * Build the onboard invitation email HTML for a given brand context.
 * Used by both the native TRANSPE flow and white-label tenant flows.
 */
export function buildOnboardInviteHtml(opts: {
  name?: string | null;
  role: string;
  onboardingLink: string;
  expiresAt: Date;
  brand: TenantNotificationBrand | null;
}): string {
  const { name, role, onboardingLink, expiresAt, brand } = opts;
  const platformName = brand?.brandName ?? "TRANSPE";
  const primaryColor = brand?.primaryColor ?? "#172b6b";
  const year = new Date().getFullYear();
  const roleLabel = role.toLowerCase().split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  const displayName = name?.trim().split(/\s+/)[0] ?? "there";
  const expiryStr = expiresAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const footer = buildEmailFooter(year, brand);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>You're invited to join ${platformName}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f1f5f9;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.06);">
          <tr>
            <td style="background:${primaryColor};padding:36px 32px;text-align:center;">
              <div style="display:inline-block;padding:6px 14px;background:rgba(255,255,255,0.18);border-radius:999px;font-size:11px;font-weight:700;letter-spacing:1.4px;color:#ffffff;text-transform:uppercase;">
                ${platformName}
              </div>
              <h1 style="margin:18px 0 6px;font-size:26px;line-height:1.25;color:#ffffff;font-weight:700;">You're invited, ${displayName}!</h1>
              <p style="margin:0;font-size:14px;color:rgba(255,255,255,0.85);">Join as a <strong>${roleLabel}</strong> on ${platformName}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 32px 8px;">
              <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#334155;">
                ${name ? `Hi <strong>${name}</strong>,` : "Hello,"}<br /><br />
                You have been invited to join <strong>${platformName}</strong> as a <strong>${roleLabel}</strong>.
                Click the button below to complete your registration.
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">
                <tr>
                  <td align="center">
                    <a href="${onboardingLink}" style="display:inline-block;padding:14px 34px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;background:${primaryColor};box-shadow:0 4px 12px rgba(0,0,0,0.2);">
                      Complete Registration &rarr;
                    </a>
                    <p style="margin:14px 0 0;font-size:12px;color:#94a3b8;line-height:1.5;">Link expires: ${expiryStr}<br />If the button doesn't work, copy this URL: <a href="${onboardingLink}" style="color:${primaryColor};">${onboardingLink}</a></p>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 24px;font-size:13px;line-height:1.6;color:#64748b;background:#f8fafc;border-radius:10px;padding:14px 18px;">
                If you did not expect this invitation, please ignore this email or contact support.
              </p>
            </td>
          </tr>
          <tr>${footer}</tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Build the OTP SMS body with brand substitution.
 */
export function buildOtpSmsBody(otp: string, brand: TenantNotificationBrand | null): string {
  const name = brand?.brandName ?? "TRANSPE";
  return `Your ${name} verification code is ${otp}. Valid for 5 minutes. Do not share.`;
}

/**
 * Build transactional SMS bodies with tenant brand substitution.
 */
export function buildSmsBody(
  templateId: string,
  variables: Record<string, string>,
  brand: TenantNotificationBrand | null
): string {
  const name = brand?.brandName ?? "TRANSPE";
  switch (templateId) {
    case "onboard_invite":
      return `${name}: You're invited as ${variables.role ?? ""}. Complete registration: ${variables.link ?? ""}`;
    case "onboard_success":
      return `${name}: Welcome! Your ${variables.role ?? ""} account is active. Login: ${variables.link ?? ""}`;
    case "declaration_approval":
      return `${name}: Approve the declaration for your downline member: ${variables.link ?? ""}`;
    case "declaration_approved":
      return `${name}: Your declaration has been approved. Login to continue.`;
    case "declaration_rejected":
      return `${name}: Your declaration was rejected. Reason: ${variables.reason ?? "See dashboard."}`;
    default:
      return `${name} notification. Visit your dashboard for details.`;
  }
}
