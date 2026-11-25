import "server-only";
import type { AlimtalkCategory } from "@/lib/merchant-alimtalk-channel";

export class MerchantChannelProviderError extends Error {
  constructor(message: string, public uncertain = false) { super(message); }
}
export function getMerchantChannelCredentials() {
  const appKey = process.env.ORDER_ALIMTALK_NHN_APP_KEY?.trim();
  const secretKey = process.env.ORDER_ALIMTALK_NHN_SECRET_KEY?.trim();
  if (!appKey || !/^[A-Za-z0-9_-]{1,100}$/.test(appKey) || !secretKey || /[\r\n]/.test(secretKey)) return null;
  return { appKey, secretKey };
}
// Operator-approved bootstrap only. Never infer channel ownership from an ID,
// a typed phone number or membership of the shared NHN project.
export function getApprovedExistingChannel(menuId: string, actorId: string) {
  const ownerId = process.env.ORDER_ALIMTALK_NHN_EXISTING_OWNER_ID?.trim();
  const approvedMenuId = process.env.ORDER_ALIMTALK_MENU_SITE_ID?.trim();
  const channelId = process.env.ORDER_ALIMTALK_NHN_CHANNEL_ID?.trim();
  const senderKey = process.env.ORDER_ALIMTALK_NHN_SENDER_KEY?.trim();
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!ownerId || !uuid.test(ownerId) || !approvedMenuId || !uuid.test(approvedMenuId)
    || ownerId !== actorId || approvedMenuId !== menuId
    || !channelId || !/^@[^\s@#{}<>\\/\x00-\x1f]{1,29}$/u.test(channelId)
    || !senderKey || !/^[a-f0-9]{40}$/i.test(senderKey)) return null;
  return { channelId, senderKey };
}
type Header = { isSuccessful?: boolean; resultCode?: number };
type RawCategory = { code?: string; name?: string; subCategories?: RawCategory[] };
function categories(rows: RawCategory[], depth = 1, parent = ""): AlimtalkCategory[] {
  if (depth > 3) throw new Error("업종 분류 깊이 오류");
  return rows.map(row => {
    const code = typeof row.code === "string" && depth > 1 && /^\d{4}$/.test(row.code) ? parent + row.code : row.code;
    if (typeof code !== "string" || !new RegExp(`^\\d{${depth === 1 ? 3 : depth === 2 ? 7 : 11}}$`).test(code)
      || !code.startsWith(parent)
      || typeof row.name !== "string" || !row.name.trim()) throw new Error("업종 분류 형식 오류");
    return { code, name: row.name, children: row.subCategories?.length ? categories(row.subCategories, depth + 1, code) : [] };
  });
}
export function createMerchantChannelProvider(config: NonNullable<ReturnType<typeof getMerchantChannelCredentials>>) {
  const base = `https://kakaotalk-bizmessage.api.nhncloudservice.com/alimtalk/v2.3/appkeys/${encodeURIComponent(config.appKey)}`;
  async function request(path: string, body?: object) {
    let response: Response;
    try {
      response = await fetch(base + path, {
        method: body ? "POST" : "GET", headers: { "X-Secret-Key": config.secretKey, "Content-Type": "application/json;charset=UTF-8" },
        body: body ? JSON.stringify(body) : undefined, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(8_000),
      });
    } catch { throw new MerchantChannelProviderError("NHN 응답을 확인하지 못했습니다. 잠시 후 다시 확인해 주세요.", true); }
    const result = await response.json().catch(() => null) as { header?: Header; categories?: RawCategory[]; sender?: {
      plusFriendId?: string; senderKey?: string; categoryCode?: string; status?: string;
      kakaoStatus?: string; kakaoProfileStatus?: string; block?: boolean; dormant?: boolean;
    } } | null;
    if (!response.ok || result?.header?.isSuccessful !== true || result.header.resultCode !== 0) {
      const code = result?.header?.resultCode;
      if (code === -1004) throw new MerchantChannelProviderError("이미 NHN에 등록된 채널입니다. 기존 연결을 확인해 주세요.");
      if (code === -1008) throw new MerchantChannelProviderError("인증번호가 올바르지 않거나 만료되었습니다.");
      if (response.status >= 500 || !result) throw new MerchantChannelProviderError("NHN 처리 결과를 확인하지 못했습니다.", true);
      throw new MerchantChannelProviderError("채널의 비즈니스 인증, 검색용 ID와 관리자 번호를 확인해 주세요.");
    }
    return result;
  }
  return {
    async existingProfile(binding: { channelId: string; senderKey: string }) {
      if (!/^[a-f0-9]{40}$/i.test(binding.senderKey)) throw new MerchantChannelProviderError("기존 채널의 연결 정보를 확인해 주세요.");
      const result = await request(`/senders/${encodeURIComponent(binding.senderKey)}`);
      const sender = result.sender;
      if (sender?.plusFriendId !== binding.channelId || sender.senderKey !== binding.senderKey
        || sender.status !== "YSC03" || sender.kakaoStatus !== "A" || sender.kakaoProfileStatus !== "A"
        || sender.block !== false || sender.dormant !== false || !sender.categoryCode || !/^\d{11}$/.test(sender.categoryCode)) {
        throw new MerchantChannelProviderError("기존 채널의 등록·활성 상태를 확인하지 못했습니다. NHN 연결을 확인해 주세요.");
      }
      return { channelId: sender.plusFriendId, senderKey: sender.senderKey, categoryCode: sender.categoryCode };
    },
    async categories(): Promise<AlimtalkCategory[]> {
      const result = await request("/sender/categories");
      if (!Array.isArray(result.categories) || !result.categories.length) throw new MerchantChannelProviderError("업종 목록을 불러오지 못했습니다.");
      return categories(result.categories);
    },
    async requestToken(input: { channelId: string; adminPhone: string; categoryCode: string }) {
      await request("/senders", { plusFriendId: input.channelId, phoneNo: input.adminPhone, categoryCode: input.categoryCode });
    },
    async verifyToken(channelId: string, token: string) {
      const result = await request("/sender/token", { plusFriendId: channelId, token: Number(token) });
      const sender = result.sender;
      if (sender?.plusFriendId !== channelId || sender.status !== "YSC03"
        || typeof sender.senderKey !== "string" || !/^[a-f0-9]{40}$/i.test(sender.senderKey)) {
        throw new MerchantChannelProviderError("채널 인증 결과를 확인하지 못했습니다.", true);
      }
      return { senderKey: sender.senderKey };
    },
  };
}
