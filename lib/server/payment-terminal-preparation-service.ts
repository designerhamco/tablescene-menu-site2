import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { MenuSiteAccessError } from "@/lib/menu-site-permissions";
import { parsePaymentTerminalDraft, PaymentTerminalPreparationError, type PaymentTerminalPreparation } from "@/lib/payment-terminal-preparation";
import { requireMenuSitePermission, requireMenuSiteWriteAccess } from "./menu-site-access-service";

function preparation(value: unknown): PaymentTerminalPreparation {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new PaymentTerminalPreparationError("준비 정보를 읽지 못했습니다.");
  const row = value as Record<string, unknown>;
  if (!Number.isSafeInteger(row.revision) || Number(row.revision) < 1 || typeof row.updatedAt !== "string" || !Number.isFinite(Date.parse(row.updatedAt)))
    throw new PaymentTerminalPreparationError("준비 정보의 저장 상태를 확인하지 못했습니다.");
  return { draft: parsePaymentTerminalDraft(row.draft), revision: Number(row.revision), updatedAt: row.updatedAt };
}

async function owner(menuSiteId: string) {
  const context = await requireMenuSitePermission(menuSiteId, "menu.read");
  if (!context.isOwner) throw new MenuSiteAccessError("MENU_SITE_PERMISSION_DENIED", "결제 연결 준비 정보는 사장님만 관리할 수 있습니다.", 403);
  return context;
}

export async function loadPaymentTerminalPreparations(menuSiteId: string): Promise<{ available: boolean; preparations: PaymentTerminalPreparation[] }> {
  const context = await owner(menuSiteId);
  const { data, error } = await createAdminClient().rpc("list_payment_terminal_preparations", { p_menu_site_id: menuSiteId, p_actor_user_id: context.actorUserId });
  if (error?.code === "PGRST202" || error?.code === "42883") return { available: false, preparations: [] };
  if (error || !Array.isArray(data)) throw new PaymentTerminalPreparationError("결제 연결 준비 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
  return { available: true, preparations: data.map(preparation) };
}

export async function savePaymentTerminalPreparation(menuSiteId: string, input: unknown, expectedRevision: number) {
  const context = await owner(menuSiteId);
  await requireMenuSiteWriteAccess(menuSiteId, "menu.edit", "menu_order_settings");
  const draft = parsePaymentTerminalDraft(input);
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) throw new PaymentTerminalPreparationError("저장 상태를 확인한 뒤 다시 시도해 주세요.");
  const { data, error } = await createAdminClient().rpc("save_payment_terminal_preparation", {
    p_menu_site_id: menuSiteId, p_actor_user_id: context.actorUserId,
    p_configuration: draft, p_expected_revision: expectedRevision,
  });
  if (error?.code === "40001") throw new PaymentTerminalPreparationError("다른 화면에서 준비 정보가 변경되었습니다. 새로고침 후 다시 확인해 주세요.");
  if (error?.code === "PGRST202" || error?.code === "42883") throw new PaymentTerminalPreparationError("연결 준비정보 저장 기능을 준비 중입니다. 입력 내용은 문의용 정보로 복사할 수 있습니다.");
  if (error) throw new PaymentTerminalPreparationError("연결 준비 정보를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  return preparation(data);
}
