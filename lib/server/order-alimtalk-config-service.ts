import "server-only";
import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { ORDER_READY_TEMPLATE_CODE, isOrderReadyTemplateContent } from "@/lib/order-ready-message";
import { getOrderAlimtalkCredentials, isOrderAlimtalkSendingEnabled, type OrderAlimtalkConfig } from "./order-ready-alimtalk-provider";

type Db = ReturnType<typeof createAdminClient>;
export type SenderSnapshot = {
  sender_key: string | null; channel_id: string | null; template_code: string | null;
  channel_owner_id: string | null; provider_app_key_hash: string | null;
};
const appHash = (appKey: string) => createHash("sha256").update(appKey).digest("hex");
export async function resolveMerchantAlimtalkConfig(menuId: string, db: Db = createAdminClient()) {
  if (!isOrderAlimtalkSendingEnabled()) return null;
  const credentials = getOrderAlimtalkCredentials();
  if (!credentials) return null;
  const [site, channel] = await Promise.all([
    db.from("menu_sites").select("user_id").eq("id", menuId).maybeSingle(),
    db.from("menu_alimtalk_channels").select("actor_id,channel_id,sender_key,state,verified_at,sending_enabled,template_code,template_status,template_content")
      .eq("menu_site_id", menuId).maybeSingle(),
  ]);
  const c = channel.data;
  if (site.error || channel.error || !site.data || !c || c.actor_id !== site.data.user_id || c.state !== "connected" || !c.verified_at
    || c.sending_enabled !== true || !c.sender_key || !/^[a-f0-9]{40}$/i.test(c.sender_key)
    || !/^@[^\s@#{}<>\\/\x00-\x1f]{1,29}$/u.test(c.channel_id) || c.template_status !== "approved"
    || c.template_code !== ORDER_READY_TEMPLATE_CODE || !isOrderReadyTemplateContent(c.template_content)) return null;
  return { ...credentials, senderKey: c.sender_key, channelId: c.channel_id, templateCode: c.template_code,
    channelOwnerId: c.actor_id, providerAppKeyHash: appHash(credentials.appKey) };
}
export async function resolveOrderAlimtalkReceiptConfig(menuId: string, snapshot: SenderSnapshot, db: Db = createAdminClient()): Promise<OrderAlimtalkConfig | null> {
  const credentials = getOrderAlimtalkCredentials();
  if (!credentials || !snapshot.sender_key || !/^[a-f0-9]{40}$/i.test(snapshot.sender_key)
    || !snapshot.channel_id || !/^@[^\s@#{}<>\\/\x00-\x1f]{1,29}$/u.test(snapshot.channel_id)
    || snapshot.template_code !== ORDER_READY_TEMPLATE_CODE || snapshot.provider_app_key_hash !== appHash(credentials.appKey)
    || !snapshot.channel_owner_id) return null;
  const site = await db.from("menu_sites").select("user_id").eq("id", menuId).maybeSingle();
  if (site.error || site.data?.user_id !== snapshot.channel_owner_id) return null;
  return { ...credentials, senderKey: snapshot.sender_key, channelId: snapshot.channel_id, templateCode: snapshot.template_code };
}
