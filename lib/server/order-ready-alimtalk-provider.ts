import "server-only";

import { isOrderReadyTemplateContent } from "@/lib/order-ready-message";
import { normalizeOrderPhone } from "@/lib/order-session-policy";

const origin = "https://kakaotalk-bizmessage.api.nhncloudservice.com";
const keyPattern = /^[A-Za-z0-9_-]{1,100}$/;
const receiptPattern = /^([A-Za-z0-9_-]{1,100}):([1-9][0-9]{0,8})$/;

export function getOrderAlimtalkPhone(value: unknown) {
  try { return normalizeOrderPhone(value); } catch { return null; }
}

export type OrderAlimtalkConfig = { appKey: string; secretKey: string; senderKey: string; channelId: string; templateCode: string };
export function isOrderAlimtalkSendingEnabled() { return process.env.ORDER_ALIMTALK_ENABLED === "true"; }
export function getOrderAlimtalkCredentials() {
  const appKey = process.env.ORDER_ALIMTALK_NHN_APP_KEY?.trim();
  const secretKey = process.env.ORDER_ALIMTALK_NHN_SECRET_KEY?.trim();
  return appKey && keyPattern.test(appKey) && secretKey && !/[\r\n]/.test(secretKey) ? { appKey, secretKey } : null;
}

export type OrderAlimtalkMessageContext = {
  phone: string;
  orderNumber: number;
  storeName: string;
  roomName: string;
  tableName: string;
};
type PreparedMessage = { recipientNo: string; templateParameter: Record<string, string> };
type Header = { isSuccessful?: boolean; resultCode?: number };
type Template = {
  plusFriendId?: string; senderKey?: string; templateCode?: string;
  status?: string; block?: boolean; dormant?: boolean;
  templateMessageType?: string; templateEmphasizeType?: string; templateContent?: string;
  buttons?: unknown[]; quickReplies?: unknown[];
};

function value(input: string) {
  const normalized = input.trim().replace(/\s+/g, " ");
  if (!normalized || normalized.length > 100 || normalized.includes("#{")) {
    throw new Error("알림톡에 표시할 매장·룸·테이블 정보를 확인해 주세요.");
  }
  return normalized;
}

export function createOrderAlimtalkProvider(config: OrderAlimtalkConfig) {
  const base = `/alimtalk/v2.3/appkeys/${encodeURIComponent(config.appKey)}`;
  async function request(path: string, method: "GET" | "POST" = "GET", body?: object, attemptId?: string) {
    return fetch(origin + base + path, {
      method,
      headers: {
        "Content-Type": "application/json;charset=UTF-8",
        "X-Secret-Key": config.secretKey,
        ...(attemptId ? { "X-NC-API-IDEMPOTENCY-KEY": attemptId } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store", redirect: "error", signal: AbortSignal.timeout(7_000),
    });
  }

  return {
    async prepare(context: OrderAlimtalkMessageContext): Promise<PreparedMessage> {
      const phone = getOrderAlimtalkPhone(context.phone);
      if (!phone || !Number.isSafeInteger(context.orderNumber) || context.orderNumber < 1) {
        throw new Error("주문번호와 연락처를 확인해 주세요.");
      }
      const response = await request(`/senders/${encodeURIComponent(config.senderKey)}/templates/${encodeURIComponent(config.templateCode)}`);
      if (!response.ok) throw new Error("NHN 알림톡 템플릿을 조회하지 못했습니다.");
      const result = await response.json() as { header?: Header; template?: Template; templates?: Template };
      // The live v2.3 API uses `template`; older documentation shows `templates`.
      const t = result.template ?? result.templates;
      if (result.header?.isSuccessful !== true || result.header.resultCode !== 0
        || t?.plusFriendId !== config.channelId || t.senderKey !== config.senderKey || t.templateCode !== config.templateCode
        || t.status !== "TSC03" || t.block !== false || t.dormant !== false
        || t.templateMessageType !== "BA" || t.templateEmphasizeType !== "NONE"
        || t.buttons?.length || t.quickReplies?.length || !isOrderReadyTemplateContent(t.templateContent)) {
        throw new Error("승인된 조리완료 알림톡 템플릿을 확인해 주세요.");
      }
      const parameters: Record<string, string> = {
        매장명: value(context.storeName), 룸명: value(context.roomName),
        테이블명: value(context.tableName), 주문번호: String(context.orderNumber),
      };
      const used = [...t.templateContent!.matchAll(/#\{([^{}]+)\}/g)].map(match => match[1]);
      if (!used.includes("주문번호") || used.some(key => !Object.hasOwn(parameters, key))) {
        throw new Error("템플릿 변수는 매장명·룸명·테이블명·주문번호만 사용할 수 있습니다.");
      }
      const templateParameter = Object.fromEntries(used.map(key => [key, parameters[key]]));
      const content = t.templateContent!.replace(/#\{([^{}]+)\}/g, (_, key: string) => parameters[key]);
      if (content.includes("#{") || content.length > 1300) throw new Error("알림톡 내용과 변수 길이를 확인해 주세요.");
      return { recipientNo: phone, templateParameter };
    },

    async send(message: PreparedMessage, attemptId: string) {
      // One persisted attempt is one provider idempotency key, even after a timeout.
      const response = await request("/messages", "POST", {
        senderKey: config.senderKey, templateCode: config.templateCode,
        senderGroupingKey: attemptId,
        recipientList: [{ ...message, resendParameter: { isResend: false } }],
      }, attemptId);
      if ([401, 403, 404, 429].includes(response.status)) return { status: "rejected" } as const;
      if (!response.ok && response.status !== 400) return { status: "unknown" } as const;
      const result = await response.json().catch(() => null) as {
        header?: Header;
        message?: { requestId?: string; sendResults?: { recipientSeq?: number; recipientNo?: string; resultCode?: number }[] };
      } | null;
      // Duplicate-key rejection is ambiguous: the previous request may have been accepted.
      if (result?.header?.isSuccessful === false && result.header.resultCode === -1005) return { status: "unknown" } as const;
      if (response.status === 400) return { status: "rejected" } as const;
      if (!result) return { status: "unknown" } as const;
      if (result.header?.isSuccessful === false && typeof result.header.resultCode === "number") return { status: "rejected" } as const;
      if (result.header?.isSuccessful !== true || result.header.resultCode !== 0) return { status: "unknown" } as const;
      const receipt = result.message?.sendResults?.length === 1 ? result.message.sendResults[0] : undefined;
      if (!receipt || receipt.recipientNo !== message.recipientNo) return { status: "unknown" } as const;
      if (typeof receipt.resultCode === "number" && receipt.resultCode !== 0) return { status: "rejected" } as const;
      const id = `${result.message?.requestId}:${receipt.recipientSeq}`;
      if (receipt.resultCode !== 0 || !receiptPattern.test(id)) return { status: "unknown" } as const;
      return { status: "accepted", messageId: id } as const;
    },

    async check(messageId: string) {
      const match = receiptPattern.exec(messageId);
      if (!match) throw new Error("NHN 발송 접수 정보를 확인해 주세요.");
      const [, requestId, seq] = match;
      const response = await request(`/messages/${encodeURIComponent(requestId)}/${seq}`);
      if (!response.ok) throw new Error("NHN 발송 결과를 조회하지 못했습니다.");
      const result = await response.json() as {
        header?: Header;
        message?: { requestId?: string; recipientSeq?: number; senderKey?: string; templateCode?: string; messageStatus?: string; resultCode?: string };
      };
      const m = result.message;
      if (result.header?.isSuccessful !== true || result.header.resultCode !== 0
        || m?.requestId !== requestId || String(m.recipientSeq) !== seq
        || m.senderKey !== config.senderKey || m.templateCode !== config.templateCode) {
        throw new Error("NHN 발송 결과가 일치하지 않습니다.");
      }
      // NHN/Kakao's final delivery result is 1000; API submission uses 0.
      if (m.messageStatus === "COMPLETED" && m.resultCode === "1000") return "sent";
      if (m.messageStatus === "FAILED" || m.messageStatus === "CANCEL") return "failed";
      return "pending";
    },
  };
}
