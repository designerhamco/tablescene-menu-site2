import "server-only";
import { ORDER_READY_TEMPLATE_CATEGORY, ORDER_READY_TEMPLATE_CODE, ORDER_READY_TEMPLATE_CONTENT, ORDER_READY_TEMPLATE_NAME,
  isOrderReadyTemplateContent, type MerchantTemplateStatus } from "@/lib/order-ready-message";
import { createMerchantChannelProvider, getMerchantChannelCredentials } from "./merchant-alimtalk-channel-provider";

type Binding = { senderKey: string; channelId: string };
type Template = {
  senderKey?: string; plusFriendId?: string; templateCode?: string; templateContent?: string;
  templateMessageType?: string; templateEmphasizeType?: string; status?: string;
  buttons?: unknown[]; quickReplies?: unknown[]; block?: boolean; dormant?: boolean;
};
export class MerchantTemplateProviderError extends Error {}
export type TemplateInspection = { status: Exclude<MerchantTemplateStatus, "unregistered" | "checking" | "unknown" | "failed">; content: string | null } | { status: "missing"; content: null };
export function createMerchantTemplateProvider(credentials: NonNullable<ReturnType<typeof getMerchantChannelCredentials>>) {
  const base = `https://kakaotalk-bizmessage.api.nhncloudservice.com/alimtalk/v2.3/appkeys/${encodeURIComponent(credentials.appKey)}`;
  async function request(path: string, body?: object) {
    try {
      const response = await fetch(base + path, { method: body ? "POST" : "GET", headers: { "X-Secret-Key": credentials.secretKey,
        "Content-Type": "application/json;charset=UTF-8" }, body: body ? JSON.stringify(body) : undefined,
        cache: "no-store", redirect: "error", signal: AbortSignal.timeout(8_000) });
      const result = await response.json();
      if (!response.ok || result?.header?.isSuccessful !== true || result.header.resultCode !== 0) throw new Error("NHN response");
      return result;
    } catch { throw new MerchantTemplateProviderError("안내 메시지의 등록 상태를 확인하지 못했습니다. 잠시 뒤 다시 확인해 주세요."); }
  }
  return {
    async inspect(binding: Binding): Promise<TemplateInspection> {
      // Ownership is already proven in our DB; recheck this exact sender's active profile.
      await createMerchantChannelProvider(credentials).existingProfile(binding);
      const result = await request(`/senders/${encodeURIComponent(binding.senderKey)}/templates?templateCode=${ORDER_READY_TEMPLATE_CODE}&pageNum=1&pageSize=1000`);
      const page = result.templateListResponse;
      if (!page || !Array.isArray(page.templates) || !Number.isInteger(page.totalCount) || page.totalCount < 0
        || page.totalCount !== page.templates.length) throw new MerchantTemplateProviderError("메시지 목록을 확인하지 못했습니다.");
      const matches = (page.templates as Template[]).filter(t => t.templateCode === ORDER_READY_TEMPLATE_CODE);
      if (matches.length > 1) throw new MerchantTemplateProviderError("안내 메시지 연결을 확인해야 합니다.");
      const found = matches[0];
      if (!found) return { status: "missing", content: null };
      if (found.senderKey !== binding.senderKey || found.plusFriendId !== binding.channelId) throw new MerchantTemplateProviderError("안내 메시지의 매장 채널이 일치하지 않습니다.");
      // List responses do not carry every block/dormancy field. Verify the full object.
      const detail = await request(`/senders/${encodeURIComponent(binding.senderKey)}/templates/${ORDER_READY_TEMPLATE_CODE}`);
      const t = (detail.template ?? detail.templates) as Template | undefined;
      if (!t || t.senderKey !== binding.senderKey || t.plusFriendId !== binding.channelId || t.templateCode !== ORDER_READY_TEMPLATE_CODE) {
        throw new MerchantTemplateProviderError("안내 메시지의 매장 채널이 일치하지 않습니다.");
      }
      if (!isOrderReadyTemplateContent(t.templateContent) || t.templateMessageType !== "BA" || t.templateEmphasizeType !== "NONE"
        || !Array.isArray(t.buttons ?? []) || (t.buttons?.length ?? 0) > 0 || !Array.isArray(t.quickReplies ?? []) || (t.quickReplies?.length ?? 0) > 0) return { status: "conflict", content: null };
      if (t.block !== false || t.dormant !== false) return { status: "blocked", content: ORDER_READY_TEMPLATE_CONTENT };
      const status = t.status === "TSC03" ? "approved" : t.status === "TSC04" ? "rejected" : ["TSC01", "TSC02"].includes(t.status ?? "") ? "pending" : null;
      if (!status) throw new MerchantTemplateProviderError("안내 메시지의 심사 상태를 확인하지 못했습니다.");
      return { status, content: ORDER_READY_TEMPLATE_CONTENT };
    },
    async register(binding: Binding) {
      // The caller persists an at-most-once submission marker before this POST.
      await request(`/senders/${encodeURIComponent(binding.senderKey)}/templates`, {
        templateCode: ORDER_READY_TEMPLATE_CODE, templateName: ORDER_READY_TEMPLATE_NAME,
        templateContent: ORDER_READY_TEMPLATE_CONTENT, templateMessageType: "BA", templateEmphasizeType: "NONE",
        categoryCode: ORDER_READY_TEMPLATE_CATEGORY, securityFlag: false, buttons: [], quickReplies: [],
      });
    },
  };
}
