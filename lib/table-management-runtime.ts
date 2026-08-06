export function isTableManagementRuntimeEnabled(value = process.env.TABLE_MANAGEMENT_ENABLED) {
  return value?.trim().toLowerCase() === "true";
}
