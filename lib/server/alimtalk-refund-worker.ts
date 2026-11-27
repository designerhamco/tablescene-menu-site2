import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePortOneApiSecret } from "@/lib/portone";
import { executeAlimtalkRefundJob, type RefundJobState } from "./alimtalk-refund-execution";
import type { AlimtalkPayment } from "./alimtalk-payment-verification";

export async function alimtalkRefundExecutionEnabled() {
  if (process.env.ALIMTALK_REFUND_EXECUTION_ENABLED !== "true") return false;
  const { data, error } = await createAdminClient().from("alimtalk_billing_policy")
    .select("refund_execution_enabled,pg_reviewed_at,approved_store_id,approved_channel_key").eq("id", true).single();
  return !error && Boolean(data?.refund_execution_enabled && data.pg_reviewed_at && data.approved_store_id && data.approved_channel_key);
}

// One bounded batch, independent of the administrator's payment-table page.
// Submission is claimed atomically in SQL. Concurrent workers only re-read jobs
// already submitted; none may submit the same job twice.
export async function processAlimtalkRefundJobs(requestId?: string) {
  if (!(await alimtalkRefundExecutionEnabled())) return { processed: 0 };
  const db = createAdminClient(), cutoff = new Date(Date.now() - 90_000).toISOString();
  let query = db.from("alimtalk_refund_jobs").select("*").in("state", ["queued", "submitting", "pending"])
    .or(`checked_at.is.null,checked_at.lt.${cutoff}`).order("checked_at", { nullsFirst: true }).order("created_at").limit(4);
  if (requestId) query = query.eq("refund_id", requestId);
  const jobs = await query;
  if (jobs.error) throw new Error("Refund queue unavailable");
  const results = await Promise.allSettled(jobs.data.map(async job => {
    const intent = await db.from("alimtalk_topups").select("*").eq("payment_id", job.payment_id).single();
    if (intent.error || !intent.data) throw new Error("Refund funding unavailable");
    if (!intent.data.credited_at || intent.data.state !== "credited") {
      const result=await db.from("alimtalk_refund_jobs").update({state:"review",last_error_code:"FUNDING_REVIEW_REQUIRED",checked_at:new Date().toISOString()})
        .eq("id",job.id).not("state","in","(completed,review)");
      if(result.error)throw new Error("Refund funding review unavailable");
      return;
    }
    const original = intent.data, headers = { Authorization: `PortOne ${requirePortOneApiSecret()}`, "Content-Type": "application/json" };
    const url = `https://api.portone.io/payments/${encodeURIComponent(original.payment_id)}`;
    let startedHere = false;
    const save = async (state: RefundJobState, code: string | null) => {
      // A stale read-only worker cannot overwrite another worker's terminal state.
      let update = db.from("alimtalk_refund_jobs").update({ state, last_error_code: code, checked_at: new Date().toISOString() })
        .eq("id", job.id).not("state", "in", "(completed,review)");
      update = job.submission_started_at || startedHere ? update.not("submission_started_at", "is", null) : update.is("submission_started_at", null);
      const result = await update;
      if (result.error) throw new Error("Refund result persistence unavailable");
    };
    await executeAlimtalkRefundJob(job, original, {
      enabled: alimtalkRefundExecutionEnabled,
      async read() {
        const response = await fetch(`${url}?storeId=${encodeURIComponent(original.store_id)}`, { headers, cache: "no-store", signal: AbortSignal.timeout(10_000) });
        if (!response.ok) throw new Error("Refund lookup unavailable");
        return await response.json() as AlimtalkPayment;
      },
      async start(cancelled) {
        const result = await db.rpc("start_alimtalk_refund_job", { p_job_id: job.id, p_verified_cancelled: cancelled });
        if (result.error) throw new Error("Refund submission claim unavailable");
        startedHere = result.data;
        return result.data;
      },
      async cancel(input) {
        if (!(await alimtalkRefundExecutionEnabled())) throw new Error("Refund execution disabled");
        const response = await fetch(`${url}/cancel`, { method: "POST", cache: "no-store",
          headers: { ...headers, "Idempotency-Key": input.idempotencyKey }, signal: AbortSignal.timeout(65_000),
          body: JSON.stringify({ storeId: original.store_id, amount: input.amount, currentCancellableAmount: input.currentCancellableAmount,
            reason: "아티메뉴 알림톡 미사용 충전금 환불", requester: "ADMIN" }) });
        if (!response.ok) throw new Error("Refund cancellation outcome unconfirmed");
      },
      async settle(cancelled) {
        const result = await db.rpc("reconcile_alimtalk_refund", { p_payment_id: original.payment_id, p_verified_cancelled: cancelled });
        if (result.error) throw new Error("Refund reconciliation unavailable");
        return result.data;
      }, save,
    });
  }));
  return { processed: jobs.data.length, needsCheck: results.some(r => r.status === "rejected") };
}

// Drain ordinary multi-payment refunds after approval even if the browser is
// closed. Leave enough time for a final 65s cancellation plus receipt lookup.
// Longer queues and interrupted runs remain durable for the guarded worker.
export async function drainAlimtalkRefundJobs(requestId:string) {
  const started=Date.now();
  for(let batch=0;batch<20&&Date.now()-started<150_000;batch++) {
    const result=await processAlimtalkRefundJobs(requestId);
    if(result.processed===0||result.needsCheck)break;
  }
}
