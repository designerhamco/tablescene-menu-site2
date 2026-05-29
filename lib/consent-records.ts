export const CONSENT_POLICY_VERSION = {
  terms: "2026-open-todo",
  privacy: "2026-open-todo",
} as const;

export const CONSENT_TYPES = [
  "terms",
  "privacy",
  "business_info",
  "trial_terms",
  "instant_service_start",
  "marketing",
] as const;

export type ConsentType = (typeof CONSENT_TYPES)[number];

export type ConsentRecordDraft = {
  userId: string;
  menuSiteId?: string | null;
  menuBoardId?: string | null;
  orderId?: string | null;
  subscriptionId?: string | null;
  consentType: ConsentType;
  consentRequired: boolean;
  consentValue: boolean;
  consentedAt: string;
  termsVersion: string;
  privacyVersion: string;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export function createConsentRecordDraft(input: Omit<ConsentRecordDraft, "termsVersion" | "privacyVersion">): ConsentRecordDraft {
  return {
    ...input,
    termsVersion: CONSENT_POLICY_VERSION.terms,
    privacyVersion: CONSENT_POLICY_VERSION.privacy,
  };
}

// TODO(consent-records): Persist these drafts to a dedicated consent_records table
// after the DB migration is introduced. Payment/subscription flows should link
// orderId or subscriptionId, while signup and marketing settings can stay user-scoped.
