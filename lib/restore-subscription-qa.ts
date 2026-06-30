export function isRestoreSubscriptionQaEnabled() {
  return process.env.NODE_ENV !== "production" && process.env.ENABLE_RESTORE_SUBSCRIPTION_QA === "true";
}
