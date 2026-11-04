"use server";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTableTerminalMenuPath, registerTableTerminal, revokeTableTerminalConnection, TableTerminalConnectionError, unregisterTableTerminal } from "@/lib/server/table-terminal-service";
import { TABLE_VISIT_SESSION_COOKIE, TABLE_VISIT_SESSION_COOKIE_SECURITY, getTableVisitSessionCookieMaxAge, isValidTableAccessToken } from "@/lib/table-qr-session-tokens";

import { MenuSiteAccessError } from "@/lib/menu-site-permissions";
import {
  archiveMenuTable,
  createMenuTable,
  MenuTableManagementError,
  rotateMenuTableToken,
  restoreMenuTable,
  updateMenuTable,
  setOrderPointFeature,
  previewOrderPointDeletion,
  deleteOrderPoint,
} from "@/lib/server/menu-table-management-service";
import type { OrderPointChannel, OrderPointFeature } from "@/lib/order-point-policy";
import { initialMenuTableActionState, type MenuTableActionState } from "./action-state";

function revalidateTableOperations(menuSiteId: string) {
  for (const section of ["tables", "kiosks", "qr", "orders", "calls", "orders/settings", "calls/settings"]) {
    revalidatePath(`/mypage/menus/${menuSiteId}/${section}`);
  }
  revalidatePath("/mypage/operations");
  revalidatePath("/menu", "layout");
}

function getFormString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function actionError(error: unknown): MenuTableActionState {
  if (error instanceof MenuTableManagementError || error instanceof MenuSiteAccessError || error instanceof TableTerminalConnectionError) {
    return { ...initialMenuTableActionState, status: "error", message: error.message };
  }
  return {
    ...initialMenuTableActionState,
    status: "error",
    message: "테이블 작업을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.",
  };
}

export async function createMenuTableAction(
  _previousState: MenuTableActionState,
  formData: FormData,
): Promise<MenuTableActionState> {
  const menuSiteId = getFormString(formData, "menuSiteId");
  try {
    const result = await createMenuTable({
      menuSiteId,
      label: getFormString(formData, "label"),
      kind: getFormString(formData, "kind") === "kiosk" ? "kiosk" : "table",
    });
    revalidateTableOperations(menuSiteId);
    return {
      status: "success",
      message: `${result.table.label}을 만들었습니다.`,
      tableId: result.table.id,
      qrPath: result.qrPath,
    };
  } catch (error) {
    return actionError(error);
  }
}

export async function mutateMenuTableAction(
  _previousState: MenuTableActionState,
  formData: FormData,
): Promise<MenuTableActionState> {
  const menuSiteId = getFormString(formData, "menuSiteId");
  const tableId = getFormString(formData, "tableId");
  const intent = getFormString(formData, "intent");

  if (intent === "register-terminal") {
    let path: string;
    try {
      const previous=(await cookies()).get(TABLE_VISIT_SESSION_COOKIE)?.value;
      let deviceInfo: unknown;
      try { const raw = getFormString(formData, "deviceInfo"); if (raw.length <= 2048) deviceInfo = JSON.parse(raw); } catch {}
      const result=await registerTableTerminal(menuSiteId,tableId,(await headers()).get("user-agent") ?? "",isValidTableAccessToken(previous)?previous:undefined,deviceInfo);
      const { error } = await (await createClient()).auth.signOut({ scope: "local" });
      if (error) throw new TableTerminalConnectionError("관리자 로그아웃을 완료하지 못했습니다. 태블릿 연결을 다시 시도해 주세요.");
      (await cookies()).set(TABLE_VISIT_SESSION_COOKIE,result.token,{...TABLE_VISIT_SESSION_COOKIE_SECURITY,expires:new Date(result.expiresAt),maxAge:getTableVisitSessionCookieMaxAge(result.expiresAt,new Date(),"terminal")});
      path = result.path;
    } catch(error) { return {...initialMenuTableActionState,status:"error",message:error instanceof Error ? error.message : "공용 단말 연결에 실패했습니다."}; }
    redirect(path);
  }
  if (intent === "open-terminal-menu") {
    let path: string;
    try {
      path = await getTableTerminalMenuPath(menuSiteId, tableId, (await cookies()).get(TABLE_VISIT_SESSION_COOKIE)?.value, (await headers()).get("user-agent") ?? "");
      // Sign out only when the operator explicitly opens the customer screen.
      const { error } = await (await createClient()).auth.signOut({ scope: "local" });
      if (error) throw new TableTerminalConnectionError("관리자 로그아웃을 완료하지 못했습니다. 다시 ‘메뉴판 열기’를 눌러 주세요.");
    } catch (error) { return actionError(error); }
    redirect(path);
  }
  if (intent === "unregister-terminal") {
    try {
      const cookieStore=await cookies(),token=cookieStore.get(TABLE_VISIT_SESSION_COOKIE)?.value;
      await unregisterTableTerminal(menuSiteId, tableId, token, (await headers()).get("user-agent") ?? "");
      cookieStore.delete(TABLE_VISIT_SESSION_COOKIE);
      revalidateTableOperations(menuSiteId);
      return {...initialMenuTableActionState,status:"success",message:"현재 기기의 연결을 해제했습니다. 기존 주문 기록은 유지됩니다."};
    } catch(error) {return actionError(error);}
  }
  if (intent === "revoke-terminal-connection") {
    try {
      const cookieStore = await cookies();
      const result = await revokeTableTerminalConnection(menuSiteId, tableId, getFormString(formData, "connectionId"), cookieStore.get(TABLE_VISIT_SESSION_COOKIE)?.value, (await headers()).get("user-agent") ?? "");
      if (result.current) cookieStore.delete(TABLE_VISIT_SESSION_COOKIE);
      revalidateTableOperations(menuSiteId);
      return { ...initialMenuTableActionState, status: "success", message: "선택한 기기의 연결을 해제했습니다. 기존 주문 기록은 유지됩니다." };
    } catch (error) {
      revalidateTableOperations(menuSiteId);
      return actionError(error);
    }
  }

  try {
    if (intent === "restore") {
      const table = await restoreMenuTable({ menuSiteId, tableId, label: getFormString(formData, "label") });
      revalidateTableOperations(menuSiteId);
      return { ...initialMenuTableActionState, status: "success", message: `${table.label}을 일시정지 상태로 복원했습니다. 사용할 때 상태를 사용 중으로 바꿔 주세요.`, tableId: table.id };
    }
    if (intent === "rotate-token") {
      const result = await rotateMenuTableToken({ menuSiteId, tableId });
      revalidateTableOperations(menuSiteId);
      return {
        status: "success",
        message: `${result.table.label}의 QR을 교체했습니다. 이전 QR과 방문 세션은 더 이상 유효하지 않습니다.`,
        tableId: result.table.id,
        qrPath: result.qrPath,
      };
    }

    if (intent === "archive") {
      await archiveMenuTable({ menuSiteId, tableId });
      revalidateTableOperations(menuSiteId);
      return {
        ...initialMenuTableActionState,
        status: "success",
        message: "테이블을 보관했습니다. 연결된 방문 세션도 종료됩니다.",
      };
    }

    if (intent === "update" || intent === "rename") {
      const table = await updateMenuTable({
        menuSiteId,
        tableId,
        label: getFormString(formData, "label"),
        ...(intent === "update" ? { status: getFormString(formData, "status") } : {}),
      });
      revalidateTableOperations(menuSiteId);
      return {
        ...initialMenuTableActionState,
        status: "success",
        message: `${table.label} 정보를 저장했습니다.`,
        tableId: table.id,
      };
    }

    return {
      ...initialMenuTableActionState,
      status: "error",
      message: "올바른 테이블 작업을 선택해 주세요.",
    };
  } catch (error) {
    return actionError(error);
  }
}

export async function updateOrderPointStatus(input: {
  menuSiteId: string; tableId: string; status: "active" | "disabled"; expectedStatus: "active" | "disabled";
}): Promise<{ status: "success" | "error"; message: string }> {
  try {
    const point = await updateMenuTable({ menuSiteId: input.menuSiteId, tableId: input.tableId, status: input.status, expectedStatus: input.expectedStatus });
    revalidateTableOperations(input.menuSiteId);
    return { status: "success", message: `${point.label}을 ${point.status === "active" ? "사용 중" : "일시정지"}으로 변경했습니다.` };
  } catch (error) {
    // Refresh a stale switch without overwriting a change from another operator.
    revalidateTableOperations(input.menuSiteId);
    return { status: "error", message: actionError(error).message };
  }
}

export async function updateOrderPointFeature(input: {
  menuSiteId: string; tableId: string; channel: OrderPointChannel; feature: OrderPointFeature;
  enabled: boolean; expectedEnabled: boolean;
}): Promise<{ status: "success" | "error"; message: string }> {
  try {
    await setOrderPointFeature(input);
    revalidateTableOperations(input.menuSiteId);
    return { status: "success", message: `${input.channel === "terminal" ? "매장 기기" : "손님 휴대폰·QR"}의 ${input.feature === "orders" ? "주문" : "호출"} 허용을 ${input.enabled ? "ON" : "OFF"}으로 저장했습니다.` };
  } catch (error) {
    if (input && typeof input.menuSiteId === "string" && /^[0-9a-f-]{36}$/i.test(input.menuSiteId)) revalidateTableOperations(input.menuSiteId);
    return { status: "error", message: error instanceof Error ? error.message : "설정을 저장하지 못했습니다." };
  }
}

export async function previewOrderPointDeletionAction(input: { menuSiteId: string; tableId: string }) {
  try { return { status: "success" as const, summary: await previewOrderPointDeletion(input) }; }
  catch (error) { return { status: "error" as const, message: actionError(error).message }; }
}
export async function deleteOrderPointAction(input: { menuSiteId: string; tableId: string; fingerprint: string; confirmationLabel: string; withHistory: boolean }) {
  try {
    await deleteOrderPoint(input); revalidateTableOperations(input.menuSiteId);
    revalidatePath(`/mypage/menus/${input.menuSiteId}/sales`);
    return { status: "success" as const, message: input.withHistory ? "등록과 관련 주문·호출 데이터를 영구 삭제했습니다." : "사용 이력이 없는 등록을 삭제했습니다." };
  } catch (error) { return { status: "error" as const, message: actionError(error).message }; }
}
