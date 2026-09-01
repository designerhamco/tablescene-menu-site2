import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getPublicMenuDataBySlug } from "@/lib/menu-page-data";
import {
  assertPickupQueueTransition,
  getPickupQueueNextStatus,
  normalizePickupQueueId,
  normalizePickupQueueNumber,
  PickupQueueInputError,
  type PickupQueueStatus,
} from "@/lib/pickup-queue";
import {
  isPickupQueueRuntimeEnabledForSite,
  isPickupQueueTemplate,
} from "@/lib/pickup-queue-runtime";
import {
  requireMenuSitePermission,
  requireMenuSiteWriteAccess,
} from "@/lib/server/menu-site-access-service";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";

type PickupQueueRow = {
  id: string;
  menu_site_id: string;
  business_date: string;
  queue_number: number;
  status: string;
  source: string;
  external_order_ref: string | null;
  created_by: string;
  updated_by: string;
  ready_by: string | null;
  completed_by: string | null;
  cancelled_by: string | null;
  ready_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
};

type PickupQueueDatabase = Omit<Database, "public"> & {
  public: Omit<Database["public"], "Tables"> & {
    Tables: Database["public"]["Tables"] & {
      menu_pickup_queue_entries: {
        Row: PickupQueueRow;
        Insert: {
          id?: string;
          menu_site_id: string;
          business_date?: string;
          queue_number: number;
          status?: string;
          source?: string;
          external_order_ref?: string | null;
          created_by: string;
          updated_by: string;
          ready_by?: string | null;
          completed_by?: string | null;
          cancelled_by?: string | null;
          ready_at?: string | null;
          completed_at?: string | null;
          cancelled_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<PickupQueueRow>;
        Relationships: [];
      };
    };
  };
};

export type PickupQueueEntry = {
  id: string;
  queueNumber: number;
  status: PickupQueueStatus;
  nextStatus: "ready" | "completed" | null;
  createdAt: string;
  readyAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
};

export type PickupQueueDashboardData = {
  menuSite: { id: string; name: string; slug: string };
  businessDate: string;
  entries: PickupQueueEntry[];
};

export type PublicPickupQueueData = {
  menuSite: { id: string; name: string; slug: string };
  businessDate: string;
  waitingNumbers: number[];
  readyNumbers: number[];
};

type DatabaseError = { code?: string; message?: string };

export class PickupQueueServiceError extends Error {
  constructor(
    public readonly code:
      | "INVALID_INPUT"
      | "QUEUE_UNAVAILABLE"
      | "QUEUE_NOT_FOUND"
      | "QUEUE_CONFLICT"
      | "QUEUE_READ_FAILED"
      | "QUEUE_WRITE_FAILED",
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "PickupQueueServiceError";
  }
}

function pickupClient() {
  return createAdminClient() as unknown as SupabaseClient<PickupQueueDatabase>;
}

function getKstBusinessDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  if (!year || !month || !day) {
    throw new PickupQueueServiceError("QUEUE_READ_FAILED", "영업일을 확인하지 못했습니다.", 500);
  }
  return `${year}-${month}-${day}`;
}

function normalizeId(value: unknown) {
  try {
    return normalizePickupQueueId(value);
  } catch (error) {
    if (error instanceof PickupQueueInputError) {
      throw new PickupQueueServiceError("INVALID_INPUT", error.message, 400);
    }
    throw error;
  }
}

function normalizeNumber(value: unknown) {
  try {
    return normalizePickupQueueNumber(value);
  } catch (error) {
    if (error instanceof PickupQueueInputError) {
      throw new PickupQueueServiceError("INVALID_INPUT", error.message, 400);
    }
    throw error;
  }
}

function failRead(error: DatabaseError | null): never {
  console.warn("[pickup-queue] read failed", { code: error?.code ?? "unknown", message: error?.message ?? "unknown" });
  throw new PickupQueueServiceError("QUEUE_READ_FAILED", "대기번호 정보를 불러오지 못했습니다.", 500);
}

function failWrite(error: DatabaseError | null): never {
  console.warn("[pickup-queue] write failed", { code: error?.code ?? "unknown", message: error?.message ?? "unknown" });
  if (error?.code === "23505") {
    throw new PickupQueueServiceError("QUEUE_CONFLICT", "오늘 이미 사용 중인 대기번호입니다.", 409);
  }
  throw new PickupQueueServiceError("QUEUE_WRITE_FAILED", "대기번호를 변경하지 못했습니다.", 500);
}

function assertRuntime(menuSiteId: string) {
  if (!isPickupQueueRuntimeEnabledForSite(menuSiteId)) {
    throw new PickupQueueServiceError(
      "QUEUE_UNAVAILABLE",
      "대기번호 기능은 운영 승인된 Display 메뉴판에서만 사용할 수 있습니다.",
      403,
    );
  }
}

async function assertDisplayMenuSite(menuSiteId: string) {
  const result = await pickupClient()
    .from("menu_sites")
    .select("id, name, slug, template_key")
    .eq("id", menuSiteId)
    .maybeSingle();
  if (result.error) failRead(result.error);
  if (!result.data) {
    throw new PickupQueueServiceError("QUEUE_NOT_FOUND", "메뉴판을 찾을 수 없습니다.", 404);
  }
  if (!isPickupQueueTemplate(result.data.template_key)) {
    throw new PickupQueueServiceError("QUEUE_UNAVAILABLE", "Display 메뉴판에서만 대기번호를 사용할 수 있습니다.", 403);
  }
  return { id: result.data.id, name: result.data.name, slug: result.data.slug };
}

function toEntry(row: PickupQueueRow): PickupQueueEntry {
  const status = row.status as PickupQueueStatus;
  return {
    id: row.id,
    queueNumber: row.queue_number,
    status,
    nextStatus: getPickupQueueNextStatus(status),
    createdAt: row.created_at,
    readyAt: row.ready_at,
    completedAt: row.completed_at,
    cancelledAt: row.cancelled_at,
  };
}

export async function listPickupQueueDashboard(menuSiteIdValue: unknown): Promise<PickupQueueDashboardData> {
  const menuSiteId = normalizeId(menuSiteIdValue);
  assertRuntime(menuSiteId);
  await requireMenuSitePermission(menuSiteId, "pickup.manage");
  const menuSite = await assertDisplayMenuSite(menuSiteId);
  const businessDate = getKstBusinessDate();
  const result = await pickupClient()
    .from("menu_pickup_queue_entries")
    .select("*")
    .eq("menu_site_id", menuSiteId)
    .eq("business_date", businessDate)
    .order("created_at", { ascending: false })
    .limit(200);
  if (result.error) failRead(result.error);
  return { menuSite, businessDate, entries: (result.data ?? []).map(toEntry) };
}

export async function createManualPickupQueueEntry({
  menuSiteId: menuSiteIdValue,
  queueNumber: queueNumberValue,
}: {
  menuSiteId: unknown;
  queueNumber: unknown;
}) {
  const menuSiteId = normalizeId(menuSiteIdValue);
  const queueNumber = normalizeNumber(queueNumberValue);
  assertRuntime(menuSiteId);
  const { context } = await requireMenuSiteWriteAccess(menuSiteId, "pickup.manage", "pickup_queue_create");
  await assertDisplayMenuSite(menuSiteId);
  const result = await pickupClient()
    .from("menu_pickup_queue_entries")
    .insert({
      menu_site_id: menuSiteId,
      business_date: getKstBusinessDate(),
      queue_number: queueNumber,
      source: "manual",
      created_by: context.actorUserId,
      updated_by: context.actorUserId,
    })
    .select("*")
    .single();
  if (result.error) failWrite(result.error);
  return toEntry(result.data);
}

export async function transitionPickupQueueEntry({
  menuSiteId: menuSiteIdValue,
  entryId: entryIdValue,
  nextStatus,
}: {
  menuSiteId: unknown;
  entryId: unknown;
  nextStatus: unknown;
}) {
  const menuSiteId = normalizeId(menuSiteIdValue);
  const entryId = normalizeId(entryIdValue);
  assertRuntime(menuSiteId);
  const { context } = await requireMenuSiteWriteAccess(menuSiteId, "pickup.manage", "pickup_queue_transition");
  await assertDisplayMenuSite(menuSiteId);
  const supabase = pickupClient();
  const currentResult = await supabase
    .from("menu_pickup_queue_entries")
    .select("*")
    .eq("menu_site_id", menuSiteId)
    .eq("id", entryId)
    .maybeSingle();
  if (currentResult.error) failRead(currentResult.error);
  if (!currentResult.data) {
    throw new PickupQueueServiceError("QUEUE_NOT_FOUND", "대기번호를 찾을 수 없습니다.", 404);
  }

  let normalizedNext: "ready" | "completed" | "cancelled";
  try {
    normalizedNext = assertPickupQueueTransition(currentResult.data.status, nextStatus);
  } catch (error) {
    if (error instanceof PickupQueueInputError) {
      throw new PickupQueueServiceError("QUEUE_CONFLICT", error.message, 409);
    }
    throw error;
  }

  const now = new Date().toISOString();
  const actorFields = normalizedNext === "ready"
    ? { ready_by: context.actorUserId, ready_at: now }
    : normalizedNext === "completed"
      ? { completed_by: context.actorUserId, completed_at: now }
      : { cancelled_by: context.actorUserId, cancelled_at: now };
  const updateResult = await supabase
    .from("menu_pickup_queue_entries")
    .update({ status: normalizedNext, updated_by: context.actorUserId, ...actorFields })
    .eq("menu_site_id", menuSiteId)
    .eq("id", entryId)
    .eq("status", currentResult.data.status)
    .select("*")
    .maybeSingle();
  if (updateResult.error) failWrite(updateResult.error);
  if (!updateResult.data) {
    throw new PickupQueueServiceError("QUEUE_CONFLICT", "다른 사용자가 먼저 상태를 변경했습니다.", 409);
  }
  return toEntry(updateResult.data);
}

export async function getPublicPickupQueue(slug: string): Promise<PublicPickupQueueData | null> {
  const normalizedSlug = slug.trim();
  if (!normalizedSlug) return null;
  const menuData = await getPublicMenuDataBySlug(normalizedSlug);
  if (!menuData || !isPickupQueueTemplate(menuData.menuSite.template_key)) return null;
  const menuSiteId = menuData.menuSite.id;
  if (!isPickupQueueRuntimeEnabledForSite(menuSiteId)) return null;
  const businessDate = getKstBusinessDate();
  const result = await pickupClient()
    .from("menu_pickup_queue_entries")
    .select("queue_number, status, created_at")
    .eq("menu_site_id", menuSiteId)
    .eq("business_date", businessDate)
    .in("status", ["waiting", "ready"])
    .order("created_at", { ascending: true });
  if (result.error) failRead(result.error);
  const rows = result.data ?? [];
  return {
    menuSite: { id: menuSiteId, name: menuData.menuSite.name, slug: menuData.menuSite.slug },
    businessDate,
    waitingNumbers: rows.filter((row) => row.status === "waiting").map((row) => row.queue_number),
    readyNumbers: rows.filter((row) => row.status === "ready").map((row) => row.queue_number),
  };
}
