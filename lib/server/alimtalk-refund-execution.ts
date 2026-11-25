import { verifyAlimtalkPayment, type AlimtalkPayment, type AlimtalkPaymentIntent } from "./alimtalk-payment-verification";

export type RefundJob = {
  id: string; refund_id: string; payment_id: string; before_cancelled: number; target_cancelled: number;
  state: string; submission_started_at: string | null;
};
export type RefundJobState = "queued" | "pending" | "completed" | "review";
export type RefundExecutionDependencies = {
  enabled(): Promise<boolean>;
  read(): Promise<AlimtalkPayment>;
  start(cancelled: number): Promise<boolean>;
  cancel(input: { amount: number; currentCancellableAmount: number; idempotencyKey: string }): Promise<void>;
  settle(cancelled: number): Promise<string>;
  save(state: RefundJobState, code: string | null): Promise<void>;
};

// No secrets, network defaults or environment overrides: the server adapter
// supplies all effects. Tests exercise exactly this execution path in memory.
export async function executeAlimtalkRefundJob(job: RefundJob, intent: AlimtalkPaymentIntent, deps: RefundExecutionDependencies) {
  if (!(await deps.enabled()) || ["completed", "review"].includes(job.state)) return;
  if (job.payment_id !== intent.payment_id || !Number.isSafeInteger(job.before_cancelled) ||
    !Number.isSafeInteger(job.target_cancelled) || job.before_cancelled < 0 ||
    job.target_cancelled <= job.before_cancelled || job.target_cancelled > intent.amount) {
    await deps.save("review", "INVALID_REFUND_SNAPSHOT"); return;
  }
  const inspect = (payment: AlimtalkPayment) => {
    verifyAlimtalkPayment(payment, intent);
    if (payment.method?.type !== "PaymentMethodCard") throw new Error("CARD_REQUIRED");
    if (!["PAID", "PARTIAL_CANCELLED", "CANCELLED"].includes(String(payment.status))) throw new Error("PAYMENT_NOT_PAID");
    const cancelled = payment.amount!.cancelled as number;
    if (cancelled < job.before_cancelled || cancelled > job.target_cancelled) throw new Error("CANCELLATION_MISMATCH");
    return cancelled;
  };
  const accept = async (cancelled: number) => {
    if (cancelled > job.before_cancelled) {
      const result = await deps.settle(cancelled);
      if (!["expected", "unchanged"].includes(result)) {
        await deps.save("review", "LEDGER_REVIEW_REQUIRED"); return true;
      }
    }
    if (cancelled === job.target_cancelled) { await deps.save("completed", null); return true; }
    return false;
  };
  let payment: AlimtalkPayment;
  try { payment = await deps.read(); }
  catch { await deps.save(job.submission_started_at ? "pending" : "queued", "PAYMENT_LOOKUP_PENDING"); return; }
  let cancelled: number;
  try { cancelled = inspect(payment); }
  catch { await deps.save("review", "PAYMENT_VERIFICATION_FAILED"); return; }
  if (await accept(cancelled)) return;
  // Only fresh, unchanged originals may be submitted. A partial/unknown result
  // is reconciled read-only forever; it is never turned into a second POST.
  if (job.submission_started_at || job.state !== "queued") {
    await deps.save("pending", "CANCELLATION_RESULT_PENDING"); return;
  }
  if (cancelled !== job.before_cancelled || payment.cancellations?.some(c => c.status === "REQUESTED")) {
    await deps.save("review", "EXTERNAL_CANCELLATION_PENDING"); return;
  }
  if (!(await deps.enabled()) || !(await deps.start(cancelled))) return;
  let code: string | null = null;
  try {
    // Job ID/body are immutable. PortOne requires an RFC 8941 quoted key.
    await deps.cancel({ amount: job.target_cancelled - job.before_cancelled,
      currentCancellableAmount: intent.amount - cancelled, idempotencyKey: `"alimtalk-refund-${job.id}"` });
  } catch { code = "CANCELLATION_RESULT_PENDING"; }
  // HTTP success alone is not a refund receipt. A fresh provider GET settles it.
  try { payment = await deps.read(); }
  catch { await deps.save("pending", "PAYMENT_LOOKUP_PENDING"); return; }
  try { cancelled = inspect(payment); }
  catch { await deps.save("review", "PAYMENT_VERIFICATION_FAILED"); return; }
  if (!(await accept(cancelled))) await deps.save("pending", code ?? "CANCELLATION_RESULT_PENDING");
}
