import "server-only";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { notFound } from "next/navigation";
import { MerchantChannelInputError, findAlimtalkCategory, normalizeMerchantAdminPhone, normalizeMerchantChannelId, normalizeMerchantToken,
  type MerchantChannelInput, type MerchantChannelResult, type MerchantChannelView } from "@/lib/merchant-alimtalk-channel";
import { createMerchantChannelProvider, getApprovedExistingChannel, getMerchantChannelCredentials } from "@/lib/server/merchant-alimtalk-channel-provider";

// Use the same read-only category API as the real settings page.
// Registration, OTP verification and customer messaging remain simulated.
export async function loadMerchantDemoCategories() {
  if (process.env.NODE_ENV !== "development") notFound();
  const credentials = getMerchantChannelCredentials();
  if (!credentials) throw new Error("채널 연결 인증키를 확인해 주세요.");
  return createMerchantChannelProvider(credentials).categories();
}
export function merchantDemoExistingBinding() {
  if (process.env.NODE_ENV !== "development") notFound();
  return getApprovedExistingChannel(process.env.ORDER_ALIMTALK_MENU_SITE_ID ?? "", process.env.ORDER_ALIMTALK_NHN_EXISTING_OWNER_ID ?? "");
}
const path = "/qa-merchant-alimtalk-local";
const name = "qa-merchant-alimtalk-local";
export async function readMerchantDemo() {
  if (process.env.NODE_ENV !== "development") notFound();
  const jar = await cookies();
  let connection: MerchantChannelView | null = null;
  try { connection = JSON.parse(jar.get(name)?.value ?? "null"); } catch { /* Reset invalid demo state. */ }
  return { connection,
    save(next: MerchantChannelView | null) { jar.set(name, JSON.stringify(next), { httpOnly: true, sameSite: "strict", path }); },
  };
}

export async function merchantDemo(input: MerchantChannelInput): Promise<MerchantChannelResult> {
  const { connection, save } = await readMerchantDemo();
  try {
    if (input.intent === "prepare-template" || input.intent === "refresh-template") {
      if (connection?.state !== "connected") return { error: "매장 채널을 먼저 연결해 주세요." };
      const next: MerchantChannelView = { ...connection, template: { status: input.intent === "prepare-template" ? "pending" : "approved",
        checkedAt: new Date().toISOString(), registrationStarted: true } };
      save(next);
      return { connection: next, notice: "모의 심사 상태를 갱신했습니다. 실제 등록과 고객 발송은 하지 않았습니다." };
    }
    if (input.intent === "connect-existing") {
      if (connection?.state === "connected") return { error: "이미 연결된 채널입니다." };
      if (connection && ["pending", "requesting", "verifying"].includes(connection.state) && Date.now() < Date.parse(connection.expiresAt)) {
        return { error: "진행 중인 인증에서 ‘입력 변경’을 누른 뒤 기존 채널을 연결해 주세요." };
      }
      const binding = merchantDemoExistingBinding();
      const credentials = getMerchantChannelCredentials();
      if (!binding || !credentials) return { error: "체험할 기존 채널 연결 정보를 확인해 주세요." };
      const profile = await createMerchantChannelProvider(credentials).existingProfile(binding);
      const next: MerchantChannelView = { challengeId: randomUUID(), channelId: profile.channelId, categoryCode: profile.categoryCode,
        maskedPhone: null, state: "connected", requestedAt: new Date().toISOString(), expiresAt: new Date().toISOString(),
        verifiedAt: new Date().toISOString(), attemptsRemaining: 5, sendingEnabled: false, verificationMethod: "operator_binding" };
      save(next);
      return { connection: next, notice: "인증된 기존 채널 연결을 체험했습니다. 운영 DB에는 저장하지 않았습니다." };
    }
    if (input.intent === "request") {
      if (connection?.state === "connected") return { error: "이미 연결된 채널입니다." };
      if (connection && Date.now() - Date.parse(connection.requestedAt) < 60_000) return { error: "인증번호는 60초 뒤 다시 요청할 수 있습니다." };
      const channelId = normalizeMerchantChannelId(input.channelId);
      const phone = normalizeMerchantAdminPhone(input.adminPhone);
      const category = findAlimtalkCategory(await loadMerchantDemoCategories(), input.categoryCode);
      if (!/^\d{11}$/.test(input.categoryCode) || !category || category.children.length) throw new MerchantChannelInputError("업종의 소분류까지 선택해 주세요.", "categoryCode");
      const next: MerchantChannelView = { challengeId: randomUUID(), channelId, categoryCode: input.categoryCode,
        maskedPhone: `${phone.slice(0, 3)}-****-${phone.slice(-4)}`, state: "pending", requestedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 600_000).toISOString(), verifiedAt: null, attemptsRemaining: 5, sendingEnabled: false };
      save(next);
      return { connection: next, notice: "모의 인증번호를 요청했습니다. 체험 번호는 123456입니다." };
    }
    if (!connection || connection.challengeId !== input.challengeId || connection.state !== "pending") return { error: "진행 중인 인증 요청을 확인해 주세요." };
    if (input.intent === "cancel") {
      const next = { ...connection, state: "failed" as const };
      save(next);
      return { connection: next };
    }
    const token = normalizeMerchantToken(input.token);
    if (Date.now() >= Date.parse(connection.expiresAt) || !connection.attemptsRemaining) return { error: "인증 시간이 만료되었거나 입력 횟수를 초과했습니다." };
    const next = { ...connection, attemptsRemaining: connection.attemptsRemaining - 1 };
    if (token !== "123456") {
      save(next);
      return { connection: next, field: "token", error: "인증번호가 올바르지 않습니다." };
    }
    const verified = { ...next, state: "connected" as const, verifiedAt: new Date().toISOString() };
    save(verified);
    return { connection: verified, notice: "매장 채널을 연결했습니다. (로컬 체험)" };
  } catch (e) {
    if (e instanceof MerchantChannelInputError) return { error: e.message, field: e.field };
    return { error: "체험 요청을 처리하지 못했습니다." };
  }
}
