/**
 * Resolves the PdfBrandOptions for a user's platform tenant (if any).
 * Returns undefined for native TRANSPE users, or a brand override for
 * white-label tenant members.
 *
 * Usage in PDF-generating API routes:
 *   const brand = await resolvePdfBrand(user.platformOwnerId);
 *   const pdf = await generateSelfDeclarationPdf(data, brand);
 */
import { prisma } from "@/lib/db";
import type { PdfBrandOptions } from "@/lib/declaration/generatePdf";

export async function resolvePdfBrand(
  platformOwnerId: string | null | undefined
): Promise<PdfBrandOptions | undefined> {
  if (!platformOwnerId) return undefined;

  try {
    const profile = await prisma.whitelabelProfile.findUnique({
      where: { userId: platformOwnerId },
      select: { brandName: true, primaryColor: true, status: true },
    });
    if (!profile || profile.status !== "LIVE") return undefined;
    return {
      brandName: profile.brandName,
      primaryColor: profile.primaryColor,
    };
  } catch {
    return undefined;
  }
}
