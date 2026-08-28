import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const startRoute = readFileSync(new URL("../app/api/business-subscriptions/start/route.ts", import.meta.url), "utf8");
const renewalRoute = readFileSync(new URL("../app/api/cron/process-subscriptions/route.ts", import.meta.url), "utf8");
const migration = readFileSync(
  new URL("../supabase/migrations/20260828114923_add_business_subscription_free_trial.sql", import.meta.url),
  "utf8",
);

test("free trial registers a billing key without executing the initial payment", () => {
  assert.match(startRoute, /if \(startsWithFreeTrial\)/);
  assert.match(startRoute, /free_trial_billing_key_registered/);
  assert.match(startRoute, /else if \(isPaymentRecovery\)/);
  assert.match(startRoute, /paymentId: startsWithFreeTrial \? null : paymentId/);
  assert.match(startRoute, /last_paid_at: isFreeTrial \? null/);
});

test("free trial ends at the existing renewal boundary and cancellation wins over charging", () => {
  assert.match(startRoute, /nextBillingAt: trialPeriod\.endsAt/);
  assert.match(renewalRoute, /if \(renewalDisposition === "expire_at_period_end"\)/);
  assert.ok(
    renewalRoute.indexOf('renewalDisposition === "expire_at_period_end"')
      < renewalRoute.indexOf('renewalDisposition === "skip_missing_billing_key"'),
  );
});

test("database records one valid free-trial period per account", () => {
  assert.match(migration, /trial_started_at timestamptz/);
  assert.match(migration, /trial_ends_at timestamptz/);
  assert.match(migration, /trial_ends_at > trial_started_at/);
  assert.match(migration, /unique index if not exists business_subscriptions_one_free_trial_per_user_idx/);
  assert.match(migration, /where trial_started_at is not null/);
  assert.doesNotMatch(migration, /grant\s+/i);
  assert.doesNotMatch(migration, /policy\s+/i);
});
