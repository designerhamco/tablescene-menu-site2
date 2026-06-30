export function isYearlyRefundConfirmQaEnabled() {
  return process.env.NODE_ENV !== "production" && process.env.ENABLE_YEARLY_REFUND_CONFIRM_QA === "true";
}
