import "server-only";
import type { Database } from "@/lib/supabase/types";
import type { MerchantChannelView } from "@/lib/merchant-alimtalk-channel";
import type { MerchantTemplateStatus } from "@/lib/order-ready-message";
export type MerchantChannelRow = Database["public"]["Tables"]["menu_alimtalk_channels"]["Row"];
export const MERCHANT_CHANNEL_COLUMNS = "menu_site_id,actor_id,channel_id,category_code,masked_phone,state,challenge_id,requested_at,expires_at,verify_attempts,request_window_started_at,request_count,sender_key,verified_at,sending_enabled,verification_method,template_code,template_status,template_content,template_checked_at,template_check_id,template_check_started_at,template_registration_started_at";
export function merchantChannelView(row: MerchantChannelRow): MerchantChannelView {
  return {
    challengeId: row.challenge_id, channelId: row.channel_id, categoryCode: row.category_code,
    maskedPhone: row.masked_phone, state: row.state as MerchantChannelView["state"],
    requestedAt: row.requested_at, expiresAt: row.expires_at, verifiedAt: row.verified_at,
    attemptsRemaining: Math.max(0, 5 - row.verify_attempts), sendingEnabled: false,
    verificationMethod: row.verification_method as MerchantChannelView["verificationMethod"],
    template: { status: (row.template_status ?? "unregistered") as MerchantTemplateStatus,
      checkedAt: row.template_checked_at ?? null, registrationStarted: Boolean(row.template_registration_started_at) },
  };
}
