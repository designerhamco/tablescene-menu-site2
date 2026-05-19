import "server-only";

import { AI_FEATURE_CREDIT_COSTS, getIncludedAiCredits, type AiCreditBalance, type AiFeatureKey } from "@/lib/ai-credits";
import { getMenuSiteAccessStateForMenuSite, MENU_SITE_INACTIVE_AI_MESSAGE } from "@/lib/server/menu-site-access-service";
import { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

type AccountCreditBalanceRow = {
  id: string;
  user_id: string;
  granted_credits: number | null;
  purchased_credits: number | null;
  used_credits: number | null;
};

type MenuSiteOwnerRow = {
  id: string;
  user_id: string;
};

function isMissingAiCreditTable(error: { code?: string; message?: string } | null | undefined) {
  const message = error?.message ?? "";
  return error?.code === "42P01"
    || error?.code === "42703"
    || error?.code === "42883"
    || message.includes("ai_account_credit_balances")
    || message.includes("ai_credit_transactions")
    || message.includes("does not exist");
}

function positiveInteger(value: number | null | undefined) {
  return Math.max(0, Math.floor(value ?? 0));
}

function emptyBalance(): AiCreditBalance {
  return toBalance(null);
}

function toBalance(row: Pick<AccountCreditBalanceRow, "granted_credits" | "purchased_credits" | "used_credits"> | null): AiCreditBalance {
  const accountGrantedCredits = positiveInteger(row?.granted_credits);
  const accountPurchasedCredits = positiveInteger(row?.purchased_credits);
  const accountUsedCredits = positiveInteger(row?.used_credits);
  const accountRemainingCredits = Math.max(0, accountGrantedCredits + accountPurchasedCredits - accountUsedCredits);

  return {
    accountGrantedCredits,
    accountPurchasedCredits,
    accountUsedCredits,
    accountRemainingCredits,
    totalRemainingCredits: accountRemainingCredits,
    includedCredits: accountGrantedCredits,
    purchasedCredits: accountPurchasedCredits,
    usedCredits: accountUsedCredits,
    remainingCredits: accountRemainingCredits,
  };
}

async function getMenuSiteOwner(adminSupabase: AdminClient, menuSiteId: string) {
  const { data, error } = await adminSupabase
    .from("menu_sites")
    .select("id, user_id")
    .eq("id", menuSiteId)
    .maybeSingle();

  if (error) throw new Error(`메뉴판 소유자 확인에 실패했습니다: ${error.message}`);
  return data as MenuSiteOwnerRow | null;
}

async function getAccountBalance(adminSupabase: AdminClient, userId: string) {
  const { data, error } = await adminSupabase
    .from("ai_account_credit_balances" as never)
    .select("id, user_id, granted_credits, purchased_credits, used_credits")
    .eq("user_id" as never, userId as never)
    .maybeSingle();

  if (error) {
    if (isMissingAiCreditTable(error)) return null;
    throw new Error(`계정 AI 크레딧 정보를 불러오지 못했습니다: ${error.message}`);
  }

  return data as unknown as AccountCreditBalanceRow | null;
}

export async function getAiCreditBalanceForMenuSite(menuSiteId: string): Promise<AiCreditBalance | null> {
  const adminSupabase = createAdminClient();
  const menuSite = await getMenuSiteOwner(adminSupabase, menuSiteId);
  if (!menuSite) return null;

  const accountBalance = await getAccountBalance(adminSupabase, menuSite.user_id);
  return accountBalance ? toBalance(accountBalance) : emptyBalance();
}

export async function getAiCreditBalanceForUser(userId: string): Promise<AiCreditBalance> {
  const adminSupabase = createAdminClient();
  const accountBalance = await getAccountBalance(adminSupabase, userId);
  return accountBalance ? toBalance(accountBalance) : emptyBalance();
}

export async function getAiCreditBalancesForMenuSites(menuSiteIds: string[]) {
  if (menuSiteIds.length === 0) return new Map<string, AiCreditBalance>();

  const adminSupabase = createAdminClient();
  const { data: menuSites, error: menuSitesError } = await adminSupabase
    .from("menu_sites")
    .select("id, user_id")
    .in("id", menuSiteIds);

  if (menuSitesError) throw new Error(`메뉴판 소유자 확인에 실패했습니다: ${menuSitesError.message}`);

  const ownerRows = (menuSites ?? []) as MenuSiteOwnerRow[];
  if (ownerRows.length === 0) return new Map<string, AiCreditBalance>();

  const userIds = Array.from(new Set(ownerRows.map((row) => row.user_id).filter(Boolean)));
  const { data, error } = await adminSupabase
    .from("ai_account_credit_balances" as never)
    .select("id, user_id, granted_credits, purchased_credits, used_credits")
    .in("user_id" as never, userIds as never);

  if (error) {
    if (isMissingAiCreditTable(error)) return new Map(ownerRows.map((row) => [row.id, emptyBalance()]));
    throw new Error(`계정 AI 크레딧 정보를 불러오지 못했습니다: ${error.message}`);
  }

  const accountBalanceByUserId = new Map<string, AccountCreditBalanceRow>();
  for (const row of (data ?? []) as unknown as AccountCreditBalanceRow[]) {
    if (row.user_id) accountBalanceByUserId.set(row.user_id, row);
  }

  const balances = new Map<string, AiCreditBalance>();
  for (const menuSite of ownerRows) {
    balances.set(menuSite.id, toBalance(accountBalanceByUserId.get(menuSite.user_id) ?? null));
  }

  return balances;
}

export async function ensureAiCreditBalanceForMenuSite({
  adminSupabase = createAdminClient(),
  userId,
  menuSiteId,
  planType,
}: {
  adminSupabase?: AdminClient;
  userId: string;
  menuSiteId: string;
  planType: string | null | undefined;
}) {
  const grantedCredits = getIncludedAiCredits(planType);
  const { error } = await adminSupabase.rpc("grant_ai_menu_creation_credits" as never, {
    p_user_id: userId,
    p_menu_site_id: menuSiteId,
    p_plan_type: planType ?? "personal_trial",
    p_credits: grantedCredits,
  } as never);

  if (error) {
    if (isMissingAiCreditTable(error)) return { ok: false, missingTable: true };
    throw new Error(error.message || "AI 크레딧 기본 지급에 실패했습니다.");
  }

  return { ok: true, missingTable: false };
}

function getMenuCreationGrantPlanType({
  serviceType,
  productKey,
  planType,
}: {
  serviceType: "basic" | "display";
  productKey: string;
  planType?: string | null;
}) {
  if (serviceType === "display" || planType === "business_display") return "business_display";
  if (productKey === "personal_trial_basic_1month" || planType === "personal_trial") return "personal_trial";
  return "business_basic";
}

export async function grantAiCreditsForMenuSiteCreation({
  adminSupabase = createAdminClient(),
  userId,
  menuSiteId,
  serviceType,
  productKey,
  planType,
  reason,
}: {
  adminSupabase?: AdminClient;
  userId: string;
  menuSiteId: string;
  serviceType: "basic" | "display";
  productKey: string;
  planType?: string | null;
  reason: "personal_trial_created" | "business_subscription_created" | "display_subscription_created";
}) {
  const grantPlanType = getMenuCreationGrantPlanType({ serviceType, productKey, planType });
  const grantedCredits = getIncludedAiCredits(grantPlanType);
  const { data, error } = await adminSupabase.rpc("grant_ai_menu_creation_credits" as never, {
    p_user_id: userId,
    p_menu_site_id: menuSiteId,
    p_plan_type: grantPlanType,
    p_credits: grantedCredits,
  } as never);

  if (error) {
    if (isMissingAiCreditTable(error)) {
      return {
        ok: false,
        missingTable: true,
        grantedCredits: 0,
        alreadyProcessed: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        },
      };
    }
    throw Object.assign(new Error(error.message || "AI 크레딧 기본 지급에 실패했습니다."), {
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
  }

  const result = Array.isArray(data) ? data[0] : data;
  const alreadyProcessed = Boolean((result as { already_processed?: unknown } | null)?.already_processed);

  if (!alreadyProcessed) {
    await adminSupabase
      .from("ai_credit_transactions" as never)
      .update(({ product_key: productKey, metadata: { reason, product_key: productKey, plan_type: grantPlanType, service_type: serviceType, policy: "account_shared_menu_creation_grant" } }) as never)
      .eq("menu_site_id" as never, menuSiteId as never)
      .in("transaction_type" as never, ["grant", "included_grant"] as never);
  }

  return { ok: true, missingTable: false, grantedCredits, alreadyProcessed, planType: grantPlanType };
}

export async function reclaimUnusedPersonalTrialGrantCredits({
  adminSupabase = createAdminClient(),
  menuSiteId,
  reason = "personal_trial_retention_expired",
}: {
  adminSupabase?: AdminClient;
  menuSiteId: string;
  reason?: "personal_trial_retention_expired";
}) {
  const { data, error } = await adminSupabase.rpc("expire_personal_trial_unused_grant_credits" as never, {
    p_menu_site_id: menuSiteId,
    p_reason: reason,
  } as never);

  if (error) {
    if (isMissingAiCreditTable(error)) {
      return { ok: false, missingTable: true, reclaimedCredits: 0, alreadyProcessed: false, skippedReason: "missing_ai_credit_tables" as const };
    }
    throw new Error(error.message || "AI 크레딧 잔여 지급분 회수에 실패했습니다.");
  }

  const result = Array.isArray(data) ? data[0] : data;
  const reclaimedCredits = typeof (result as { reclaimed_credits?: unknown } | null)?.reclaimed_credits === "number"
    ? (result as { reclaimed_credits: number }).reclaimed_credits
    : 0;
  const alreadyProcessed = Boolean((result as { already_processed?: unknown } | null)?.already_processed);
  const skippedReason = typeof (result as { skipped_reason?: unknown } | null)?.skipped_reason === "string"
    ? (result as { skipped_reason: string }).skipped_reason
    : null;

  return { ok: true, missingTable: false, reclaimedCredits, alreadyProcessed, skippedReason };
}

export async function purchaseAiCredits({
  adminSupabase,
  userId,
  menuSiteId,
  credits,
  productKey,
  paymentId,
  orderId,
}: {
  adminSupabase: AdminClient;
  userId: string;
  menuSiteId?: string | null;
  credits: number;
  productKey: string;
  paymentId: string;
  orderId?: string | null;
}) {
  const { error } = await adminSupabase.rpc("grant_ai_account_credits" as never, {
    p_user_id: userId,
    p_context_menu_site_id: menuSiteId || null,
    p_product_key: productKey,
    p_payment_id: paymentId,
    p_order_id: orderId || null,
    p_credits: credits,
  } as never);

  if (error) {
    if (isMissingAiCreditTable(error)) {
      throw Object.assign(new Error("AI 크레딧 테이블 migration 적용이 필요합니다."), {
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
    }
    throw Object.assign(new Error(error.message || "AI 크레딧 충전에 실패했습니다."), {
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
  }

  const accountBalance = await getAccountBalance(adminSupabase, userId);
  return accountBalance ? toBalance(accountBalance) : emptyBalance();
}

export async function spendAiCredits({
  userId,
  menuSiteId,
  featureKey,
}: {
  userId: string;
  menuSiteId: string;
  featureKey: AiFeatureKey;
}) {
  const cost = AI_FEATURE_CREDIT_COSTS[featureKey];
  const adminSupabase = createAdminClient();
  const accessState = await getMenuSiteAccessStateForMenuSite({ menuSiteId, userId });
  if (!accessState?.canUseAi) {
    throw new Error(MENU_SITE_INACTIVE_AI_MESSAGE);
  }

  const { data, error } = await adminSupabase.rpc("consume_ai_account_credits" as never, {
    p_user_id: userId,
    p_menu_site_id: menuSiteId,
    p_feature_key: featureKey,
    p_credit_cost: cost,
    p_metadata: {},
  } as never);

  if (error) {
    if (isMissingAiCreditTable(error)) {
      throw new Error("AI 크레딧 테이블 migration 적용이 필요합니다.");
    }
    throw new Error(error.message || "AI 크레딧 차감에 실패했습니다.");
  }

  const result = Array.isArray(data) ? data[0] : data;
  const remainingCredits = typeof (result as { remaining_credits?: unknown } | null)?.remaining_credits === "number"
    ? (result as { remaining_credits: number }).remaining_credits
    : null;

  if (remainingCredits === null) {
    throw new Error("AI 크레딧이 부족합니다. 크레딧을 충전하면 계속 사용할 수 있습니다.");
  }

  const usedCredits = typeof (result as { used_credits?: unknown } | null)?.used_credits === "number"
    ? (result as { used_credits: number }).used_credits
    : cost;
  const totalCredits = remainingCredits + usedCredits;

  return {
    cost,
    usedCredits,
    totalCredits,
    remainingCredits,
  };
}
