import { getDiningTemplateFeatures } from "@/lib/dining-product-tiers";

// Runtime flags are emergency switches, not a list of individually onboarded shops.
// Eligibility must come from server-resolved lifecycle data, never saved plan labels alone.
export function isPaidTableOperationsEligible(
  access: { planType: string | null; canEdit: boolean; canUseWriteActions: boolean } | null,
  templateKey: string | null | undefined,
) {
  return Boolean(access?.planType === "business_basic"
    && access.canEdit && access.canUseWriteActions
    && getDiningTemplateFeatures(templateKey).order);
}
