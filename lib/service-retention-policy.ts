export const SERVICE_DATA_RETENTION_DAYS = 7;

export function getServiceDataRetentionUntil(expiredAt: string | Date) {
  const date = typeof expiredAt === "string" ? new Date(expiredAt) : new Date(expiredAt);

  if (!Number.isFinite(date.getTime())) {
    return null;
  }

  date.setDate(date.getDate() + SERVICE_DATA_RETENTION_DAYS);
  return date.toISOString();
}
