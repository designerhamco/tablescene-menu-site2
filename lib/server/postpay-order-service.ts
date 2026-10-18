import "server-only";
import { readMenuOrderSettings } from "@/lib/menu-order-settings";

import { getMenuSiteAccessStateForMenuSite } from "@/lib/server/menu-site-access-service";
import type { ResolvedTableVisitSession } from "@/lib/server/table-visit-session-service";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/types";
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
  const { data, error } = await supabase.rpc(
    "submit_postpay_order_v2" as never,
    {
      p_menu_site_id: input.menuSiteId,
      p_table_visit_session_id: tableSession.id,
      p_client_request_id: input.clientRequestId,
      p_request_text: input.requestText,
      p_lines: input.lines as unknown as Json,
    } as never,
  );

  if (error) throw new PostpayOrderSubmissionError();
  return parseRpcRow(data);
}
