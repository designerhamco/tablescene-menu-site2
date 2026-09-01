"use server";

import { revalidatePath } from "next/cache";

import { MenuSiteAccessError } from "@/lib/menu-site-permissions";
import {
  archiveMenuTable,
  createMenuTable,
  MenuTableManagementError,
  rotateMenuTableToken,
  updateMenuTable,
} from "@/lib/server/menu-table-management-service";

export type MenuTableActionState = {
  status: "idle" | "success" | "error";
  message: string;
  tableId: string | null;
  qrPath: string | null;
};

export const initialMenuTableActionState: MenuTableActionState = {
  status: "idle",
  message: "",
  tableId: null,
  qrPath: null,
};

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
    revalidatePath(`/mypage/menus/${menuSiteId}/tables`);
    return {
      status: "success",
      message: `${result.table.label} 테이블을 만들었습니다. QR은 아래 목록에서 언제든 다시 받을 수 있습니다.`,
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

  try {
    if (intent === "rotate-token") {
      const result = await rotateMenuTableToken({ menuSiteId, tableId });
      revalidatePath(`/mypage/menus/${menuSiteId}/tables`);
      return {
        status: "success",
        message: `${result.table.label}의 QR을 교체했습니다. 이전 QR과 방문 세션은 더 이상 유효하지 않습니다.`,
        tableId: result.table.id,
        qrPath: result.qrPath,
      };
    }

    if (intent === "archive") {
      await archiveMenuTable({ menuSiteId, tableId });
      revalidatePath(`/mypage/menus/${menuSiteId}/tables`);
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
      revalidatePath(`/mypage/menus/${menuSiteId}/tables`);
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
