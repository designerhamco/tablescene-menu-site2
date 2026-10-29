import "server-only";
import { normalizeOrderPhone } from "@/lib/order-session-policy";
import { getAllowedCheckoutModes } from "@/lib/menu-order-settings";
import { readMenuOrderSettings } from "@/lib/menu-order-settings";

import { getMenuSiteAccessStateForMenuSite } from "@/lib/server/menu-site-access-service";
import type { ResolvedTableVisitSession } from "@/lib/server/table-visit-session-service";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PostpayOrderInput } from "@/lib/postpay-order-payload";
import { isPostpayOrderRuntimeEnabledForSite } from "@/lib/postpay-order-runtime";

export type SubmittedPostpayOrder = {
  orderId: string;
  orderNumber: number;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  duplicate: boolean;
};

type RpcRow = {
  order_id: string;
  order_number: number;
  order_status: string;
  payment_status: string;
  total_amount: number;
  is_duplicate: boolean;
};

export class PostpayOrderSubmissionError extends Error {
  constructor(
    message = "주문을 전송하지 못했습니다. 메뉴와 테이블 상태를 확인해 주세요.",
    public readonly code = "ORDER_UNAVAILABLE",
    public readonly repeatOrderId?: string,
  ) {
    super(message);
    this.name = "PostpayOrderSubmissionError";
  }
}

function parseRpcRow(value: unknown): SubmittedPostpayOrder {
  const row = Array.isArray(value) ? value[0] : null;
  if (!row || typeof row !== "object") throw new PostpayOrderSubmissionError();
  const result = row as Partial<RpcRow>;
  if (
    typeof result.order_id !== "string" ||
    typeof result.order_number !== "number" ||
    typeof result.order_status !== "string" ||
    typeof result.payment_status !== "string" ||
    typeof result.total_amount !== "number" ||
    typeof result.is_duplicate !== "boolean"
  ) {
    throw new PostpayOrderSubmissionError();
  }
  return {
    orderId: result.order_id,
    orderNumber: result.order_number,
    status: result.order_status,
    paymentStatus: result.payment_status,
    totalAmount: result.total_amount,
    duplicate: result.is_duplicate,
  };
}

export async function submitPostpayOrder({
  input,
  tableSession,
}: {
  input: PostpayOrderInput;
  tableSession: ResolvedTableVisitSession;
}): Promise<SubmittedPostpayOrder> {
  if (
    input.menuSiteId !== tableSession.menuSiteId ||
    !isPostpayOrderRuntimeEnabledForSite(input.menuSiteId)
  ) {
    throw new PostpayOrderSubmissionError();
  }

  const accessState = await getMenuSiteAccessStateForMenuSite({
    menuSiteId: input.menuSiteId,
  });
  if (
    !accessState?.canViewPublic ||
    accessState.planType !== "business_basic"
  ) {
    throw new PostpayOrderSubmissionError();
  }

  const supabase = createAdminClient();
  const { data: site, error: siteError } = await supabase
    .from("menu_sites")
    .select("settings,template_key")
    .eq("id", input.menuSiteId)
    .single();
  const settings = readMenuOrderSettings(site?.settings);
  if (
    siteError ||
    !settings.orderEnabled ||
    !settings.postpayEnabled ||
    site?.template_key === "display_menu_a"
  )
    throw new PostpayOrderSubmissionError("현재 후불 주문을 받을 수 없습니다.");
  const channel = tableSession.channel ?? "customer";
  if (!getAllowedCheckoutModes(settings, channel).postpay) throw new PostpayOrderSubmissionError("현재 이 접속 환경에서 후불 주문을 사용할 수 없습니다.");
  let phone: string | null;
  try { phone = channel === "terminal" || settings.customerPhone === "hidden" ? null : normalizeOrderPhone(input.notificationPhone); }
  catch { throw new PostpayOrderSubmissionError("휴대폰 번호를 확인해 주세요.", "INVALID_PHONE"); }
  if (channel === "customer" && settings.customerPhone === "required" && !phone) throw new PostpayOrderSubmissionError("휴대폰 번호를 입력해 주세요.", "INVALID_PHONE");
  const { data, error } = await supabase.rpc(
    "submit_postpay_order_v3",
    {
      p_menu_site_id: input.menuSiteId,
      p_table_visit_session_id: tableSession.id,
      p_client_request_id: input.clientRequestId,
      // Supabase generated RPC arguments omit SQL parameter nullability.
      p_request_text: input.requestText as string,
      p_lines: input.lines,
      p_notification_phone: phone as string,
      p_repeat_order_id: (input.repeatOrderId ?? null) as string,
    },
  );

  if (error) {
    if (error.message.includes("ORDER_ACCESS_EXPIRED")) throw new PostpayOrderSubmissionError("주문 이용 시간이 만료되었습니다. 테이블 QR을 다시 스캔해 주세요.", "ORDER_ACCESS_EXPIRED");
    if (error.message.includes("ORDER_REPEAT_CONFIRM")) throw new PostpayOrderSubmissionError("동일한 메뉴와 수량으로 주문하셨습니다. 다시 주문하시겠습니까?", "ORDER_REPEAT_CONFIRM", error.details);
    throw new PostpayOrderSubmissionError();
  }
  return parseRpcRow(data);
}
