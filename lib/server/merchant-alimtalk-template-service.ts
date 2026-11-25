import "server-only";
import { normalizeOrderManagementId } from "@/lib/order-management";
import type { MerchantChannelResult } from "@/lib/merchant-alimtalk-channel";
import { requireMenuSiteWriteAccess } from "./menu-site-access-service";
import { getMerchantChannelCredentials } from "./merchant-alimtalk-channel-provider";
import { MERCHANT_CHANNEL_COLUMNS, merchantChannelView } from "./merchant-alimtalk-channel-record";
import { createMerchantTemplateProvider } from "./merchant-alimtalk-template-provider";
import { ORDER_READY_TEMPLATE_CONTENT, type MerchantTemplateStatus } from "@/lib/order-ready-message";

export async function prepareMerchantAlimtalkTemplate(menuIdInput: string, { registerMissing = true } = {}): Promise<MerchantChannelResult> {
  const menuId = normalizeOrderManagementId(menuIdInput);
  const { context, supabase } = await requireMenuSiteWriteAccess(menuId, "menu.edit", "menu_order_settings");
  if (!context.isOwner) return { error: "안내 메시지 연결은 사장님만 변경할 수 있습니다." };
  const credentials = getMerchantChannelCredentials();
  if (!credentials) return { error: "채널 연결을 준비하고 있습니다. 잠시 뒤 다시 확인해 주세요." };
  const reservation = await supabase.rpc("reserve_menu_alimtalk_template", { p_menu_id: menuId, p_actor_id: context.actorUserId }).single();
  if (reservation.error || !reservation.data?.sender_key) {
    const message = reservation.error?.message ?? "";
    return { error: /TEMPLATE_COOLDOWN|TEMPLATE_BUSY/.test(message) ? "안내 메시지를 확인 중입니다. 잠시 뒤 다시 확인해 주세요."
      : "매장 채널 연결과 소유자를 다시 확인해 주세요." };
  }
  const row = reservation.data;
  const binding = { channelId: row.channel_id, senderKey: row.sender_key! };
  const provider = createMerchantTemplateProvider(credentials);
  let status: MerchantTemplateStatus = "failed", content: string | null = null;
  let started = Boolean(row.template_registration_started_at);
  try {
    const inspected = await provider.inspect(binding);
    if (inspected.status !== "missing") { status = inspected.status; content = inspected.content; }
    else if (started) status = "unknown";
    else if (!registerMissing) status = "unregistered";
    else {
      // A timed-out POST must never be repeated automatically, even by another request.
      const claimed = await supabase.from("menu_alimtalk_channels").update({ template_registration_started_at: new Date().toISOString() })
        .eq("menu_site_id", menuId).eq("actor_id", context.actorUserId).eq("state", "connected")
        .eq("sender_key", binding.senderKey).eq("template_check_id", row.template_check_id!)
        .is("template_registration_started_at", null).select(MERCHANT_CHANNEL_COLUMNS).maybeSingle();
      if (claimed.error || !claimed.data) return { error: "메시지 연결 상태가 변경됐습니다. 새로고침 후 확인해 주세요." };
      started = true;
      await provider.register(binding);
      status = "pending"; content = ORDER_READY_TEMPLATE_CONTENT;
    }
  } catch { status = started ? "unknown" : "failed"; }
  const saved = await supabase.from("menu_alimtalk_channels").update({ template_status: status, template_content: content,
    template_checked_at: new Date().toISOString() }).eq("menu_site_id", menuId).eq("actor_id", context.actorUserId)
    .eq("state", "connected").eq("sender_key", binding.senderKey).eq("template_check_id", row.template_check_id!)
    .select(MERCHANT_CHANNEL_COLUMNS).maybeSingle();
  if (saved.error || !saved.data) return { error: "메시지 연결 상태를 저장하지 못했습니다. 새로고침 후 확인해 주세요." };
  return { connection: merchantChannelView(saved.data), notice: status === "approved" ? "안내 메시지 승인을 확인했습니다."
    : status === "pending" ? "안내 메시지는 심사 중입니다." : undefined };
}
