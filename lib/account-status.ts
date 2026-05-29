export const DELETED_ACCOUNT_STATUSES = new Set(["deletion_requested", "deleted"]);

export function getAccountStatus(appMetadata: unknown) {
  if (!appMetadata || typeof appMetadata !== "object" || Array.isArray(appMetadata)) {
    return "active";
  }

  const value = (appMetadata as { account_status?: unknown }).account_status;
  return typeof value === "string" && value.trim() ? value.trim() : "active";
}

export function isDeletedAccountStatus(appMetadata: unknown) {
  return DELETED_ACCOUNT_STATUSES.has(getAccountStatus(appMetadata));
}
