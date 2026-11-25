import "server-only";
import { normalizeOrderManagementId } from "@/lib/order-management";
import { MerchantChannelInputError, findAlimtalkCategory, normalizeMerchantAdminPhone, normalizeMerchantChannelId,
  normalizeMerchantToken, type MerchantChannelInput, type MerchantChannelPage, type MerchantChannelResult } from "@/lib/merchant-alimtalk-channel";
import { requireMenuSitePermission, requireMenuSiteWriteAccess } from "./menu-site-access-service";
import { createAdminClient } from "@/lib/supabase/admin";
import { MERCHANT_CHANNEL_COLUMNS as columns, merchantChannelView as view } from "./merchant-alimtalk-channel-record";
import { prepareMerchantAlimtalkTemplate } from "./merchant-alimtalk-template-service";
import { createMerchantChannelProvider, getApprovedExistingChannel, getMerchantChannelCredentials, MerchantChannelProviderError } from "./merchant-alimtalk-channel-provider";

export class MerchantChannelError extends Error {}
const dbMessages: Record<string, string> = {
  CHANNEL_ALREADY_CONNECTED: "이미 연결된 채널입니다.",
  CHANNEL_COOLDOWN: "인증번호는 60초 뒤 다시 요청할 수 있습니다.",
  CHANNEL_REQUEST_LIMIT: "인증번호 요청 횟수를 초과했습니다. 1시간 뒤 다시 시도해 주세요.",
  CHANNEL_IN_USE: "이미 연결됐거나 인증 중인 채널입니다. 기존 연결을 확인해 주세요.",
  CHANNEL_VERIFYING: "채널 인증을 확인 중입니다. 잠시 기다려 주세요.",
  CHANNEL_STALE: "인증 요청이 변경되었습니다. 새 인증번호를 요청해 주세요.",
  CHANNEL_EXPIRED: "인증 시간이 만료되었습니다. 새 인증번호를 요청해 주세요.",
  CHANNEL_VERIFY_LIMIT: "인증번호 입력 횟수를 초과했습니다. 새 인증번호를 요청해 주세요.",
  CHANNEL_NOT_PENDING: "진행 중인 인증 요청을 확인해 주세요.",
  CHANNEL_OWNER_REQUIRED: "채널 연결은 사장님만 변경할 수 있습니다.",
  CHANNEL_PENDING: "진행 중인 인증에서 ‘입력 변경’을 누른 뒤 기존 채널을 연결해 주세요.",
};
function databaseError(error: { message: string }) {
  const key = Object.keys(dbMessages).find(key => error.message.includes(key));
  return new MerchantChannelError(key ? dbMessages[key] : "채널 연결 정보를 저장하지 못했습니다. 다시 확인해 주세요.");
}
function provider() {
  const credentials = getMerchantChannelCredentials();
  if (!credentials) throw new MerchantChannelError("채널 연결을 준비하고 있습니다. 잠시 뒤 다시 시도해 주세요.");
  return createMerchantChannelProvider(credentials);
}
async function owner(menuId: string) {
  const context = await requireMenuSitePermission(menuId, "menu.edit");
  if (!context.isOwner) throw new MerchantChannelError("채널 연결은 사장님만 변경할 수 있습니다.");
  return context;
}

export async function loadMerchantChannelPage(menuIdInput: string): Promise<MerchantChannelPage> {
  const menuId = normalizeOrderManagementId(menuIdInput);
  const context = await owner(menuId);
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.from("menu_alimtalk_channels").select(columns).eq("menu_site_id", menuId).maybeSingle();
    if (error) throw databaseError(error);
    // A transferred menu must never inherit the former owner's channel proof.
    if (data && data.actor_id !== context.actorUserId) throw new MerchantChannelError("채널 연결의 소유자를 확인해야 합니다. 고객지원에 문의해 주세요.");
    const connection = data ? view(data) : null;
    const existing = connection?.state !== "connected" ? getApprovedExistingChannel(menuId, context.actorUserId) : null;
    return { available: true, connection, categories: connection?.state === "connected" ? [] : await provider().categories(),
      ...(existing ? { existingChannelId: existing.channelId } : {}) };
  } catch (error) {
    return { available: false, connection: null, categories: [],
      message: error instanceof MerchantChannelError ? error.message : "채널 연결을 불러오지 못했습니다. 잠시 뒤 다시 시도해 주세요." };
  }
}

export async function handleMerchantChannel(menuIdInput: string, input: MerchantChannelInput): Promise<MerchantChannelResult> {
  const menuId = normalizeOrderManagementId(menuIdInput);
  await owner(menuId);
  if (input?.intent === "prepare-template" || input?.intent === "refresh-template") {
    return prepareMerchantAlimtalkTemplate(menuId, { registerMissing: input.intent === "prepare-template" });
  }
  const { context, supabase } = await requireMenuSiteWriteAccess(menuId, "menu.edit", "menu_order_settings");
  if (!context.isOwner) throw new MerchantChannelError("채널 연결은 사장님만 변경할 수 있습니다.");
  if (!input || !["request", "verify", "cancel", "connect-existing"].includes(input.intent)) throw new MerchantChannelError("진행할 채널 인증을 확인해 주세요.");
  const nhn = provider();
  if (input.intent === "connect-existing") {
    const binding = getApprovedExistingChannel(menuId, context.actorUserId);
    if (!binding) throw new MerchantChannelError("이 매장에 승인된 기존 채널 연결이 없습니다. 인증번호로 채널을 연결해 주세요.");
    const profile = await nhn.existingProfile(binding);
    const result = await supabase.rpc("link_existing_menu_alimtalk_channel", {
      p_menu_id: menuId, p_actor_id: context.actorUserId, p_channel_id: profile.channelId,
      p_category_code: profile.categoryCode, p_sender_key: profile.senderKey,
    }).single();
    if (result.error) throw databaseError(result.error);
    if (!result.data) throw new MerchantChannelError("기존 채널 연결을 저장하지 못했습니다.");
    const prepared = await prepareMerchantAlimtalkTemplate(menuId).catch(() => ({} as MerchantChannelResult));
    return { ...prepared, connection: prepared.connection ?? view(result.data), notice: prepared.notice ?? "인증된 기존 매장 채널을 연결했습니다." };
  }
  if (input.intent === "request") {
    const channelId = normalizeMerchantChannelId(input.channelId);
    const adminPhone = normalizeMerchantAdminPhone(input.adminPhone);
    const categoryCode = typeof input.categoryCode === "string" ? input.categoryCode : "";
    const category = /^\d{11}$/.test(categoryCode) ? findAlimtalkCategory(await nhn.categories(), categoryCode) : undefined;
    if (!category || category.children.length) throw new MerchantChannelInputError("업종의 소분류까지 선택해 주세요.", "categoryCode");
    const { data, error } = await supabase.rpc("reserve_menu_alimtalk_request", {
      p_menu_id: menuId, p_actor_id: context.actorUserId, p_channel_id: channelId,
      p_category_code: categoryCode, p_masked_phone: `${adminPhone.slice(0, 3)}-****-${adminPhone.slice(-4)}`,
    }).single();
    if (error) throw databaseError(error);
    let uncertain = false;
    try { await nhn.requestToken({ channelId, adminPhone, categoryCode }); }
    catch (error) {
      if (!(error instanceof MerchantChannelProviderError) || !error.uncertain) {
        await supabase.from("menu_alimtalk_channels").update({ state: "failed" })
          .eq("menu_site_id", menuId).eq("actor_id", context.actorUserId).eq("challenge_id", data.challenge_id).eq("state", "requesting");
        throw error;
      }
      uncertain = true;
    }
    const saved = await supabase.from("menu_alimtalk_channels").update({ state: "pending" })
      .eq("menu_site_id", menuId).eq("actor_id", context.actorUserId).eq("challenge_id", data.challenge_id).eq("state", "requesting")
      .select(columns).maybeSingle();
    if (saved.error) throw databaseError(saved.error);
    if (!saved.data) throw new MerchantChannelError(dbMessages.CHANNEL_STALE);
    return { connection: view(saved.data), notice: uncertain
      ? "요청 결과를 확인하지 못했습니다. 카카오톡으로 번호를 받았다면 인증을 계속해 주세요."
      : "카카오톡으로 인증번호를 요청했습니다." };
  }

  const challengeId = normalizeOrderManagementId(input.challengeId);
  if (input.intent === "cancel") {
    const result = await supabase.from("menu_alimtalk_channels").update({ state: "failed" })
      .eq("menu_site_id", menuId).eq("actor_id", context.actorUserId).eq("challenge_id", challengeId)
      .in("state", ["pending", "requesting"]).select(columns).maybeSingle();
    if (result.error) throw databaseError(result.error);
    if (!result.data) throw new MerchantChannelError(dbMessages.CHANNEL_STALE);
    return { connection: view(result.data) };
  }

  const token = normalizeMerchantToken(input.token);
  const reserved = await supabase.rpc("reserve_menu_alimtalk_verification", {
    p_menu_id: menuId, p_actor_id: context.actorUserId, p_challenge_id: challengeId,
  }).single();
  if (reserved.error) throw databaseError(reserved.error);
  let verified: Awaited<ReturnType<typeof nhn.verifyToken>>;
  try { verified = await nhn.verifyToken(reserved.data.channel_id, token); }
  catch (error) {
    const restored = await supabase.from("menu_alimtalk_channels").update({ state: "pending" })
      .eq("menu_site_id", menuId).eq("actor_id", context.actorUserId).eq("challenge_id", challengeId).eq("state", "verifying")
      .select(columns).maybeSingle();
    if (restored.error) throw databaseError(restored.error);
    if (!restored.data) throw new MerchantChannelError(dbMessages.CHANNEL_STALE);
    return { connection: view(restored.data),
      field: error instanceof MerchantChannelProviderError && !error.uncertain ? "token" : undefined,
      error: error instanceof MerchantChannelProviderError ? error.message : "인증번호를 확인하지 못했습니다." };
  }
  const saved = await supabase.from("menu_alimtalk_channels").update({
    state: "connected", sender_key: verified.senderKey, verified_at: new Date().toISOString(), sending_enabled: false,
  }).eq("menu_site_id", menuId).eq("actor_id", context.actorUserId).eq("challenge_id", challengeId).eq("state", "verifying")
    .select(columns).maybeSingle();
  if (saved.error) throw databaseError(saved.error);
  if (!saved.data) throw new MerchantChannelError("인증 결과를 저장하지 못했습니다. 고객지원에 문의해 주세요.");
  const prepared = await prepareMerchantAlimtalkTemplate(menuId).catch(() => ({} as MerchantChannelResult));
  return { ...prepared, connection: prepared.connection ?? view(saved.data), notice: prepared.notice ?? "매장 채널을 연결했습니다." };
}
