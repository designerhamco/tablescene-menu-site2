import "server-only";

import { normalizeOrderManagementId } from "@/lib/order-management";
import { floorMemberships, normalizeFloorDocument } from "@/lib/menu-floor-plan";
import type { OrderAlimtalkAttempt, OrderAlimtalkDetails, OrderAlimtalkRequest } from "@/lib/order-ready-alimtalk";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireMenuSitePermission, requireMenuSiteWriteAccess } from "@/lib/server/menu-site-access-service";
import { assertDashboardEnabled } from "@/lib/server/order-management-service";
import { createOrderAlimtalkProvider, getOrderAlimtalkPhone, isOrderAlimtalkSendingEnabled } from "./order-ready-alimtalk-provider";

import { resolveMerchantAlimtalkConfig, resolveOrderAlimtalkReceiptConfig, type SenderSnapshot } from "./order-alimtalk-config-service";

const attemptColumns = "sender_key, channel_id, template_code, channel_owner_id, provider_app_key_hash, id, attempt_no, status, provider_message_id, submission_started_at, created_at";
const unsentRecoveryMs = 60_000;

export class OrderAlimtalkError extends Error {}

type AttemptRow = SenderSnapshot & {
  id: string;
  attempt_no: number;
  status: string;
  provider_message_id: string | null;
  submission_started_at: string | null;
  created_at: string;
};

function summarize(attempt: Pick<AttemptRow, "id" | "attempt_no" | "status">): OrderAlimtalkAttempt {
  const { id, attempt_no: number, status } = attempt;
  return { id, number, status: status === "sent" || status === "failed" ? status : "pending" };
}

export async function listOrderAlimtalkDetails(menuSiteId: string, orderIds: string[]) {
  const details = new Map<string, OrderAlimtalkDetails>();
  await requireMenuSitePermission(menuSiteId, "order.read");
  const sendingEnabled = Boolean(await resolveMerchantAlimtalkConfig(menuSiteId));

  const supabase = createAdminClient();
  for (let index = 0; index < orderIds.length; index += 100) {
    const { data, error } = await supabase.from("menu_customer_orders")
      .select("id, notification_phone, menu_order_alimtalk_attempts(id, attempt_no, status)")
      .eq("menu_site_id", menuSiteId)
      .in("id", orderIds.slice(index, index + 100))
      .order("attempt_no", { ascending: false, referencedTable: "menu_order_alimtalk_attempts" })
      .limit(1, { referencedTable: "menu_order_alimtalk_attempts" });
    if (error) {
      console.warn("[order-alimtalk] list failed", { code: error.code });
      return new Map<string, OrderAlimtalkDetails>();
    }
    for (const row of data ?? []) {
      const phone = getOrderAlimtalkPhone(row.notification_phone);
      const attempt = row.menu_order_alimtalk_attempts[0];
      details.set(row.id, {
        sendingEnabled,
        maskedPhone: phone ? `${phone.slice(0, 3)}-****-${phone.slice(-2).padStart(4, "*")}` : null,
        attempt: attempt ? summarize(attempt) : null,
      });
    }
  }
  return details;
}

export async function handleOrderAlimtalk(menuSiteIdInput: string, input: OrderAlimtalkRequest): Promise<OrderAlimtalkAttempt> {
  const menuSiteId = normalizeOrderManagementId(menuSiteIdInput);
  if (!input || (input.intent !== "send" && input.intent !== "check")) {
    throw new OrderAlimtalkError("알림톡 작업을 확인해 주세요.");
  }
  const orderId = normalizeOrderManagementId(input.orderId);
  const expectedAttemptId = input.expectedAttemptId === null ? null : normalizeOrderManagementId(input.expectedAttemptId);

  const { context, supabase } = await requireMenuSiteWriteAccess(menuSiteId, "order.manage", "order_alimtalk");
  await assertDashboardEnabled(menuSiteId);
  if (input.intent === "send" && !isOrderAlimtalkSendingEnabled()) throw new OrderAlimtalkError("알림톡 발송 설정을 확인해 주세요.");
  const latest = async () => {
    const { data, error } = await supabase.from("menu_order_alimtalk_attempts").select(attemptColumns)
      .eq("menu_site_id", menuSiteId).eq("order_id", orderId)
      .order("attempt_no", { ascending: false }).limit(1).maybeSingle();
    if (error) throw new OrderAlimtalkError("알림톡 발송 이력을 불러오지 못했습니다.");
    return data;
  };

  async function resolve(attempt: AttemptRow, status: "sent" | "failed") {
    const update = supabase.from("menu_order_alimtalk_attempts")
      .update({ status, resolved_at: new Date().toISOString() })
      .eq("menu_site_id", menuSiteId).eq("id", attempt.id).eq("status", "pending");
    if (attempt.provider_message_id) update.eq("provider_message_id", attempt.provider_message_id);
    else update.is("provider_message_id", null);
    if (attempt.submission_started_at) update.eq("submission_started_at", attempt.submission_started_at);
    else update.is("submission_started_at", null);
    const { data, error } = await update.select(attemptColumns).maybeSingle();
    if (error) throw new OrderAlimtalkError("알림톡 결과를 저장하지 못했습니다. 다시 확인해 주세요.");
    return summarize(data ?? await latest() ?? attempt);
  }

  const previous = await latest();
  if (input.intent === "check") {
    if (!previous) throw new OrderAlimtalkError("확인할 알림톡이 없습니다.");
    if (previous.status !== "pending" || previous.id !== expectedAttemptId) return summarize(previous);
    const stale = Date.now() - Date.parse(previous.created_at) >= unsentRecoveryMs;
    if (!previous.provider_message_id) {
      if (!stale) return summarize(previous);
      if (!previous.submission_started_at) return resolve(previous, "failed");
      throw new OrderAlimtalkError("발송 접수 결과를 받지 못했습니다. NHN 발송 내역에서 확인해 주세요.");
    }
    const config = await resolveOrderAlimtalkReceiptConfig(menuSiteId, previous, supabase);
    if (!config) throw new OrderAlimtalkError("발송 당시의 채널 연결을 확인해야 합니다. 고객지원에 문의해 주세요.");
    const result = await createOrderAlimtalkProvider(config).check(previous.provider_message_id).catch(() => {
      throw new OrderAlimtalkError("발송 결과를 확인하지 못했습니다. 잠시 뒤 다시 확인해 주세요.");
    });
    return result === "pending" ? summarize(previous) : resolve(previous, result);
  }

  const config = await resolveMerchantAlimtalkConfig(menuSiteId, supabase);
  if (!config) throw new OrderAlimtalkError("알림톡 발송 설정을 확인해 주세요.");
  const provider = createOrderAlimtalkProvider(config);

  if (previous && (previous.id !== expectedAttemptId || previous.status === "pending")) return summarize(previous);
  if (!previous && expectedAttemptId) throw new OrderAlimtalkError("알림톡 발송 이력을 다시 확인해 주세요.");

  const { data: order, error: readError } = await supabase.from("menu_customer_orders")
    .select("status, notification_phone, order_number, menu_table_id, service_table_id").eq("menu_site_id", menuSiteId).eq("id", orderId).maybeSingle();
  const phone = getOrderAlimtalkPhone(order?.notification_phone);
  if (readError || order?.status !== "ready" || !phone) {
    throw new OrderAlimtalkError("연락처가 있는 조리완료 주문만 발송할 수 있습니다.");
  }

  const { data: attempt, error } = await supabase.from("menu_order_alimtalk_attempts").insert({
    menu_site_id: menuSiteId,
    order_id: orderId,
    attempt_no: (previous?.attempt_no ?? 0) + 1,
    created_by: context.actorUserId,
    sender_key: config.senderKey, channel_id: config.channelId, template_code: config.templateCode,
    channel_owner_id: config.channelOwnerId, provider_app_key_hash: config.providerAppKeyHash,
  }).select(attemptColumns).single();
  if (error?.code === "23505") {
    const concurrent = await latest();
    if (concurrent) return summarize(concurrent);
  }
  if (error?.message.includes("WALLET_INSUFFICIENT")) throw new OrderAlimtalkError("알림톡 잔액이 부족합니다. 사장님 계정에서 충전해 주세요.");
  if (error?.message.includes("WALLET_FROZEN")) throw new OrderAlimtalkError("알림톡 충전 결제 확인이 필요합니다. 고객지원에 문의해 주세요.");
  if (error?.message.includes("WALLET_METERING_DISABLED")) throw new OrderAlimtalkError("알림톡 발송 요금을 준비하고 있습니다.");
  if (error?.code === "P0001") throw new OrderAlimtalkError("주문 상태와 매장 채널의 발송 설정을 다시 확인해 주세요.");
  if (error || !attempt) throw new OrderAlimtalkError("알림톡 발송을 시작하지 못했습니다.");

  let message: Awaited<ReturnType<typeof provider.prepare>>;
  try {
    const pointId = order.service_table_id ?? order.menu_table_id;
    const [store, point, floor] = await Promise.all([
      supabase.from("menu_sites").select("restaurant_name, business_name, name").eq("id", menuSiteId).single(),
      supabase.from("menu_tables").select("label").eq("menu_site_id", menuSiteId).eq("id", pointId).single(),
      supabase.from("menu_floor_plans").select("document").eq("menu_site_id", menuSiteId).maybeSingle(),
    ]);
    if (store.error || point.error || floor.error || !store.data || !point.data) throw new Error("알림톡 정보 조회 실패");
    const document = floor.data ? normalizeFloorDocument(floor.data.document) : null;
    const roomId = document && floorMemberships(document).find(row => row.pointId === pointId)?.roomId;
    const roomName = document?.rooms.find(room => room.id === roomId)?.name ?? "룸 미지정";
    message = await provider.prepare({
      phone, orderNumber: order.order_number,
      storeName: store.data.restaurant_name || store.data.business_name || store.data.name,
      roomName, tableName: point.data.label,
    });
  } catch {
    return resolve(attempt, "failed");
  }

  // Preparation can take time. Do not submit an order already handed to the customer.
  const current = await supabase.from("menu_customer_orders").select("status, notification_phone")
    .eq("menu_site_id", menuSiteId).eq("id", orderId).single();
  if (current.error) throw new OrderAlimtalkError("주문 상태를 확인하지 못했습니다. 결과를 다시 확인해 주세요.");
  if (current.data.status !== "ready" || getOrderAlimtalkPhone(current.data.notification_phone) !== phone) return resolve(attempt, "failed");
  const stillConnected = await resolveMerchantAlimtalkConfig(menuSiteId, supabase);
  if (!stillConnected || stillConnected.senderKey !== config.senderKey || stillConnected.channelId !== config.channelId
    || stillConnected.channelOwnerId !== config.channelOwnerId || stillConnected.providerAppKeyHash !== config.providerAppKeyHash) return resolve(attempt, "failed");

  // Persist the start before sending. NHN assigns a receipt only after accepting the request.
  const submissionStartedAt = new Date().toISOString();
  const { data: reserved, error: reserveError } = await supabase.from("menu_order_alimtalk_attempts")
    .update({ submission_started_at: submissionStartedAt })
    .eq("menu_site_id", menuSiteId).eq("id", attempt.id).eq("status", "pending").is("submission_started_at", null)
    .select(attemptColumns).maybeSingle();
  if (reserveError) throw new OrderAlimtalkError("알림톡 요청을 저장하지 못했습니다. 결과를 다시 확인해 주세요.");
  if (!reserved) return summarize(await latest() ?? attempt);

  const result = await provider.send(message, attempt.id).catch(() => ({ status: "unknown" } as const));
  if (result.status === "rejected") return resolve(reserved, "failed");
  if (result.status === "unknown") return summarize(reserved);

  const { data: submitted, error: submitError } = await supabase.from("menu_order_alimtalk_attempts")
    .update({ provider_message_id: result.messageId })
    .eq("menu_site_id", menuSiteId).eq("id", attempt.id).eq("status", "pending")
    .eq("submission_started_at", submissionStartedAt).is("provider_message_id", null)
    .select(attemptColumns).maybeSingle();
  if (submitError) throw new OrderAlimtalkError("알림톡 접수 결과를 저장하지 못했습니다. NHN 발송 내역에서 확인해 주세요.");
  return summarize(submitted ?? await latest() ?? reserved);
}
