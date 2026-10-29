"use server";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { registerTableTerminal, unregisterTableTerminal } from "@/lib/server/table-terminal-service";
import { TABLE_VISIT_SESSION_COOKIE, TABLE_VISIT_SESSION_COOKIE_SECURITY, getTableVisitSessionCookieMaxAge, isValidTableAccessToken } from "@/lib/table-qr-session-tokens";

import { MenuSiteAccessError } from "@/lib/menu-site-permissions";
import {
  archiveMenuTable,
  createMenuTable,
  MenuTableManagementError,
  rotateMenuTableToken,
  updateMenuTable,
} from "@/lib/server/menu-table-management-service";
import { initialMenuTableActionState, type MenuTableActionState } from "./action-state";

function revalidateTableOperations(menuSiteId: string) {
  for (const section of ["tables", "qr", "orders", "calls", "orders/settings", "calls/settings"]) {
    revalidatePath(`/mypage/menus/${menuSiteId}/${section}`);
  }
  revalidatePath("/mypage/operations");
}

function getFormString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function actionError(error: unknown): MenuTableActionState {
  if (error instanceof MenuTableManagementError || error instanceof MenuSiteAccessError) {
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
    });
    revalidateTableOperations(menuSiteId);
    return {
      status: "success",
      message: `${result.table.label} 테이블을 만들었습니다. QR 관리에서 테이블별 QR을 다운로드할 수 있습니다.`,
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
      const result=await registerTableTerminal(menuSiteId,tableId,(await headers()).get("user-agent") ?? "",isValidTableAccessToken(previous)?previous:undefined);
      // Do not hand a customer a browser that is still signed into store management.
      const {error:signOutError}=await (await createClient()).auth.signOut({scope:"local"});
      if(signOutError)throw new Error("관리자 로그아웃을 완료하지 못했습니다. 공용 단말 연결을 다시 시도해 주세요.");
      (await cookies()).set(TABLE_VISIT_SESSION_COOKIE,result.token,{...TABLE_VISIT_SESSION_COOKIE_SECURITY,expires:new Date(result.expiresAt),maxAge:getTableVisitSessionCookieMaxAge(result.expiresAt,new Date(),"terminal")});
      path=result.path;
    } catch(error) { return {...initialMenuTableActionState,status:"error",message:error instanceof Error ? error.message : "공용 단말 연결에 실패했습니다."}; }
    redirect(path);
  }
  if (intent === "unregister-terminal") {
    try {
      const cookieStore=await cookies(),token=cookieStore.get(TABLE_VISIT_SESSION_COOKIE)?.value;
      if (isValidTableAccessToken(token)) await unregisterTableTerminal(menuSiteId,token);
      cookieStore.delete(TABLE_VISIT_SESSION_COOKIE);
      return {...initialMenuTableActionState,status:"success",message:"이 브라우저의 공용 단말 연결을 해제했습니다."};
    } catch(error) {return actionError(error);}
  }

  try {
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

    if (intent === "update") {
      const table = await updateMenuTable({
        menuSiteId,
        tableId,
        label: getFormString(formData, "label"),
        status: getFormString(formData, "status"),
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
