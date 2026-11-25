import "server-only";
import { randomUUID } from "node:crypto";
import { isAlimtalkPaymentId, isAlimtalkTopupAmount, type AlimtalkWalletInput, type AlimtalkWalletResult, type AlimtalkWalletView } from "@/lib/alimtalk-wallet";
import { createAdminClient } from "@/lib/supabase/admin";
import { portOneStoreId, portOneChannelKey, requirePortOneApiSecret } from "@/lib/portone";
import { normalizeOrderManagementId } from "@/lib/order-management";
import { requireMenuSitePermission, requireMenuSiteWriteAccess } from "./menu-site-access-service";
import { verifyAlimtalkPayment, type AlimtalkPayment } from "./alimtalk-payment-verification";

export class AlimtalkWalletError extends Error {}
async function owner(menuId: string) {
  const context = await requireMenuSitePermission(menuId, "menu.edit");
  if (!context.isOwner) throw new AlimtalkWalletError("충전과 잔액 조회는 사장님만 이용할 수 있습니다.");
  return context.actorUserId;
}
export async function loadAlimtalkWallet(menuIdInput: string): Promise<AlimtalkWalletView> {
  const menuId = normalizeOrderManagementId(menuIdInput), ownerId = await owner(menuId), db = createAdminClient();
  const [wallet, policy, entries, pending] = await Promise.all([
    db.from("alimtalk_wallets").select("balance,reserved,frozen").eq("owner_id", ownerId).maybeSingle(),
    db.from("alimtalk_billing_policy").select("unit_price,topup_enabled").eq("id", true).single(),
    db.from("alimtalk_wallet_entries").select("id,menu_site_id,kind,amount,balance_after,reserved_after,created_at,attempt_id").eq("owner_id", ownerId).order("created_at", { ascending: false }).order("id", { ascending: false }).limit(50),
    db.from("alimtalk_topups").select("payment_id,amount,created_at").eq("owner_id", ownerId).eq("state", "pending").order("created_at", { ascending: false }).limit(5),
  ]);
  if (wallet.error || policy.error || entries.error || pending.error) throw new AlimtalkWalletError("알림톡 잔액을 불러오지 못했습니다. 잠시 뒤 새로고침해 주세요.");
  const menuIds = [...new Set((entries.data ?? []).map(row => row.menu_site_id))];
  // Only names of menus the current account STILL owns may be returned.
  const sites = menuIds.length ? await db.from("menu_sites").select("id,name").eq("user_id", ownerId).in("id", menuIds) : null;
  const names = new Map(sites?.data?.map(row => [row.id, row.name]));
  const attemptIds = (entries.data ?? []).flatMap(row => row.attempt_id && names.has(row.menu_site_id) ? [row.attempt_id] : []);
  const attempts = attemptIds.length ? await db.from("menu_order_alimtalk_attempts").select("id,order_id").in("id", attemptIds) : null;
  const orderIds = [...new Set(attempts?.data?.map(row => row.order_id) ?? [])];
  const orders = orderIds.length ? await db.from("menu_customer_orders").select("id,order_number").in("id", orderIds).in("menu_site_id", [...names.keys()]) : null;
  if (sites?.error || attempts?.error || orders?.error) throw new AlimtalkWalletError("이용 내역을 불러오지 못했습니다.");
  const orderNumbers = new Map(orders?.data?.map(row => [row.id, row.order_number]));
  const attemptNumbers = new Map(attempts?.data?.map(row => [row.id, orderNumbers.get(row.order_id) ?? null]));
  return {
    balance: wallet.data?.balance ?? 0, reserved: wallet.data?.reserved ?? 0, frozen: wallet.data?.frozen ?? false,
    unitPrice: policy.data.unit_price,
    checkoutEnabled: policy.data.topup_enabled && Boolean(portOneStoreId && portOneChannelKey && process.env.PORTONE_API_SECRET) && !wallet.data?.frozen,
    entries: (entries.data ?? []).map(row => ({ id: row.id, kind: row.kind as "topup" | "hold" | "charge" | "release", amount: row.amount,
      balance: row.balance_after, reserved: row.reserved_after, createdAt: row.created_at,
      menuName: names.get(row.menu_site_id) ?? "이전 매장", orderNumber: row.attempt_id ? attemptNumbers.get(row.attempt_id) ?? null : null })),
    pendingTopups: (pending.data ?? []).map(row => ({ paymentId: row.payment_id, amount: row.amount, createdAt: row.created_at })),
  };
}

// Webhooks are untrusted hints: only a fresh authenticated PortOne API GET is authoritative.
// An existing random server-created payment ID is required before making that API call.
export async function reconcileAlimtalkTopup(paymentId: string, expectedOwnerId?: string) {
  if (!isAlimtalkPaymentId(paymentId)) throw new AlimtalkWalletError("충전 결제 정보를 확인해 주세요.");
  const db = createAdminClient();
  const { data: intent, error } = await db.from("alimtalk_topups").select("*").eq("payment_id", paymentId).maybeSingle();
  if (error) throw new AlimtalkWalletError("충전 결제 내역을 조회하지 못했습니다.");
  if (!intent || (expectedOwnerId && intent.owner_id !== expectedOwnerId)) throw new AlimtalkWalletError("충전 결제 정보를 확인해 주세요.");
  const response = await fetch(`https://api.portone.io/payments/${encodeURIComponent(paymentId)}?storeId=${encodeURIComponent(intent.store_id)}`, {
    headers: { Authorization: `PortOne ${requirePortOneApiSecret()}` }, cache: "no-store", signal: AbortSignal.timeout(10_000),
  });
  if (response.status === 404 && intent.state === "pending") return "pending";
  if (!response.ok) throw new AlimtalkWalletError("결제 결과를 확인하지 못했습니다. 다시 결제하지 말고 ‘결제 결과 확인’을 눌러 주세요.");
  let outcome: ReturnType<typeof verifyAlimtalkPayment>;
  try { outcome = verifyAlimtalkPayment(await response.json() as AlimtalkPayment, intent); }
  catch { throw new AlimtalkWalletError("충전 결제 정보가 일치하지 않습니다. 고객지원에 문의해 주세요."); }
  if (outcome === "review") {
    const result = await db.rpc("flag_alimtalk_topup_review", { p_payment_id: paymentId });
    if (result.error) throw new AlimtalkWalletError("결제 취소 결과를 저장하지 못했습니다.");
    return "review";
  }
  if (outcome === "pending") return "pending";
  const result = await db.rpc("credit_alimtalk_topup", { p_payment_id: paymentId, p_owner_id: intent.owner_id, p_verified_amount: intent.amount });
  if (result.error) throw new AlimtalkWalletError("결제 확인 후 충전을 마치지 못했습니다. 다시 결제하지 말고 ‘결제 결과 확인’을 눌러 주세요.");
  return "credited";
}

export async function handleAlimtalkWallet(menuIdInput: string, input: AlimtalkWalletInput): Promise<AlimtalkWalletResult> {
  const menuId = normalizeOrderManagementId(menuIdInput), ownerId = await owner(menuId);
  if (!input || !["refresh", "topup", "complete"].includes(input.intent)) throw new AlimtalkWalletError("진행할 작업을 확인해 주세요.");
  if (input.intent === "refresh") return { wallet: await loadAlimtalkWallet(menuId) };
  if (input.intent === "complete") {
    // Settlement must work even when checkout is subsequently disabled or the service expires.
    const outcome = await reconcileAlimtalkTopup(input.paymentId, ownerId);
    return { wallet: await loadAlimtalkWallet(menuId), notice: outcome === "credited" ? "알림톡 잔액을 충전했습니다."
      : outcome === "review" ? "취소된 충전 결제가 있습니다. 고객지원에 문의해 주세요." : "아직 완료된 결제를 확인하지 못했습니다. 잠시 뒤 다시 확인해 주세요." };
  }
  await requireMenuSiteWriteAccess(menuId, "menu.edit", "menu_order_settings");
  if (!isAlimtalkTopupAmount(input.amount)) throw new AlimtalkWalletError("충전 금액을 확인해 주세요.");
  if (!portOneStoreId || !portOneChannelKey || !process.env.PORTONE_API_SECRET) throw new AlimtalkWalletError("충전 결제 설정을 준비하고 있습니다.");
  const paymentId = `alimtalk_${randomUUID()}`, db = createAdminClient();
  const { error } = await db.rpc("create_alimtalk_topup", { p_menu_id: menuId, p_actor_id: ownerId, p_payment_id: paymentId,
    p_amount: input.amount, p_store_id: portOneStoreId, p_channel_key: portOneChannelKey });
  if (error) throw new AlimtalkWalletError(error.message.includes("WALLET_FROZEN") ? "충전 결제 확인이 필요합니다. 고객지원에 문의해 주세요."
    : error.message.includes("WALLET_TOPUP_LIMIT") ? "충전 시도가 많습니다. 기존 결제 결과를 먼저 확인해 주세요." : "현재 알림톡 충전 결제를 사용할 수 없습니다.");
  return { checkout: { paymentId, amount: input.amount, storeId: portOneStoreId, channelKey: portOneChannelKey, ownerId } };
}
