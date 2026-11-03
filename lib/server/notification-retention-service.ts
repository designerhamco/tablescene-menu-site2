import "server-only";
import type { createAdminClient } from "@/lib/supabase/admin";

export type NotificationRetentionResult = {
  asOf: string; cutoff: string; dryRun: boolean; batchLimit: number;
  candidates: number; deleted: number; protectedUnfinished: number; protectedUnverified: number;
};
export async function pruneNotificationContent(admin: ReturnType<typeof createAdminClient>, execute = false) {
  const { data, error } = await admin.rpc("prune_notification_content", {
    p_execute: execute, p_batch_limit: 100,
  });
  if (error) throw new Error(`NOTIFICATION_RETENTION_FAILED: ${error.code}`);
  const result = data as unknown as NotificationRetentionResult;
  if (!result || typeof result.deleted !== "number" || result.dryRun !== !execute) {
    throw new Error("INVALID_NOTIFICATION_RETENTION_RESULT");
  }
  return result;
}
