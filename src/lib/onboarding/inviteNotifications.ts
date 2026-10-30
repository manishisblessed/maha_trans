/**
 * Shared helper to (re)send an onboarding link over email + SMS. Used by the
 * network (parent-facing) invite actions so the delivery logic isn't
 * re-implemented per route. Email failure is surfaced; SMS is best-effort.
 *
 * On white-label tenants the link uses the tenant's own domain so the invitee
 * lands on a branded experience rather than the main TRANSPE portal.
 */

import { env } from "@/lib/env";
import { getPartner } from "@/lib/partners";
import { renderInviteEmail } from "@/lib/email/templates";
import { getEffectivePlatformUrl } from "@/lib/tenant/context";
import { resolveNotificationBrand, buildOnboardInviteHtml } from "@/lib/tenant/notifications";

export function onboardingLinkFor(token: string, platformOwnerId?: string | null): string {
  // platformOwnerId is resolved asynchronously; use the sync helper
  // `onboardingLinkForSync` when the base URL is already known.
  return `${env.NEXT_PUBLIC_APP_URL}/onboard?token=${token}`;
}

/** Build the onboarding link using the tenant-specific base URL (async). */
export async function onboardingLinkForTenant(
  token: string,
  platformOwnerId: string | null | undefined
): Promise<string> {
  const baseUrl = await getEffectivePlatformUrl(platformOwnerId ?? null);
  return `${baseUrl}/onboard?token=${token}`;
}

export async function sendInviteLink(
  invite: {
    token: string;
    email: string;
    phone: string;
    role: string;
    name: string | null;
    expiresAt: Date;
    /** White-label tenant owner id, if any */
    platformOwnerId?: string | null;
    /** Pre-resolved brand name to use in email subject/body */
    brandName?: string | null;
  },
  opts: { isReminder?: boolean } = {}
): Promise<{ onboardingLink: string; emailSent: boolean; emailError?: string }> {
  const onboardingLink = await onboardingLinkForTenant(invite.token, invite.platformOwnerId);
  const brand = await resolveNotificationBrand(invite.platformOwnerId);
  const platformName = brand?.brandName ?? invite.brandName ?? "TRANSPE";
  let emailSent = false;
  let emailError: string | undefined;

  try {
    const emailProvider = getPartner("email");

    // Use tenant-aware invite email when a brand is present
    let subject: string;
    let html: string;

    if (brand) {
      subject = opts.isReminder
        ? `Reminder: Complete your ${brand.brandName} registration`
        : `You're invited to join ${brand.brandName} as a ${invite.role.replace(/_/g, " ")}`;
      html = buildOnboardInviteHtml({
        name: invite.name,
        role: invite.role,
        onboardingLink,
        expiresAt: invite.expiresAt,
        brand,
      });
    } else {
      const rendered = renderInviteEmail({
        name: invite.name ?? undefined,
        role: invite.role,
        onboardingLink,
        expiresAt: invite.expiresAt,
        isReminder: opts.isReminder,
      });
      subject = rendered.subject;
      html = rendered.html;
    }

    const result = await emailProvider.send({
      from: process.env.EMAIL_FROM_INFO || process.env.EMAIL_FROM,
      to: invite.email,
      subject,
      html,
    });
    emailSent = result.ok;
    if (!result.ok) emailError = `${result.code}: ${result.message}`;
  } catch (e) {
    emailError = (e as Error).message;
  }

  try {
    const smsProvider = getPartner("sms");
    await smsProvider.sendTransactional({
      phone: invite.phone,
      templateId: "onboard_invite",
      variables: {
        link: onboardingLink,
        role: invite.role.replace(/_/g, " "),
        ...(brand ? { _brand: brand.brandName } : {}),
      },
    });
  } catch {
    // SMS failure shouldn't block the caller.
  }

  return { onboardingLink, emailSent, emailError };
}
