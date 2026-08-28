import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { AI_FIRST_MENU_WELCOME_CREDITS } from "./ai-credits";

const migration = readFileSync(
  new URL("../supabase/migrations/20260828083457_grant_first_menu_welcome_credits.sql", import.meta.url),
  "utf8",
);
const creditService = readFileSync(new URL("./server/ai-credits-service.ts", import.meta.url), "utf8");
const personalPaymentRoute = readFileSync(new URL("../app/api/payment/complete/route.ts", import.meta.url), "utf8");
const subscriptionStartRoute = readFileSync(new URL("../app/api/business-subscriptions/start/route.ts", import.meta.url), "utf8");
const restoreService = readFileSync(new URL("./server/menu-site-restore-service.ts", import.meta.url), "utf8");
const retentionCron = readFileSync(new URL("../app/api/cron/expire-personal-trials/route.ts", import.meta.url), "utf8");

test("AI 웰컴 크레딧은 계정당 6개 1회로 고정한다", () => {
  assert.equal(AI_FIRST_MENU_WELCOME_CREDITS, 6);
  assert.match(migration, /v_welcome_credits constant integer := 6/i);
  assert.match(
    migration,
    /unique index[\s\S]*on public\.ai_credit_transactions\(user_id\)[\s\S]*account_first_menu_welcome_grant/i,
  );
});

test("첫 메뉴 생성·소유권·동시성을 DB에서 원자적으로 검증한다", () => {
  assert.match(migration, /pg_advisory_xact_lock/i);
  assert.match(migration, /menu_site\.id = p_menu_site_id[\s\S]*menu_site\.user_id = p_user_id/i);
  assert.match(migration, /other_menu_site\.created_at < v_menu_site_created_at/i);
  assert.match(migration, /for update/i);
  assert.doesNotMatch(migration, /delete\s+from\s+public\.ai_/i);
});

test("웰컴 지급 RPC는 service role에만 열고 search_path를 고정한다", () => {
  assert.match(migration, /security invoker[\s\S]*set search_path = ''/i);
  assert.match(
    migration,
    /revoke execute on function public\.grant_ai_first_menu_welcome_credits\(uuid, uuid\)[\s\S]*from public, anon, authenticated/i,
  );
  assert.match(
    migration,
    /grant execute on function public\.grant_ai_first_menu_welcome_credits\(uuid, uuid\)[\s\S]*to service_role/i,
  );
});

test("첫 메뉴 생성 완료 경로만 웰컴 RPC를 호출한다", () => {
  assert.match(creditService, /grantAiWelcomeCreditsForFirstMenuCreation/);
  assert.match(creditService, /grant_ai_first_menu_welcome_credits/);
  assert.match(creditService, /PGRST202/);
  assert.match(personalPaymentRoute, /grantAiWelcomeCreditsForFirstMenuCreation/);
  assert.match(subscriptionStartRoute, /mode === "new"[\s\S]*grantAiWelcomeCreditsForFirstMenuCreation/);
  assert.doesNotMatch(restoreService, /grantAiCredits|aiCreditGrant/);
  assert.doesNotMatch(retentionCron, /reclaimUnusedPersonalTrialGrantCredits/);
});
