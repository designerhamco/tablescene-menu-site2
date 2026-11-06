import type { OrderPointLabelError } from "@/lib/order-point-name";
export type MenuTableActionState = {
  status: "idle" | "success" | "error";
  message: string;
  tableId: string | null;
  qrPath: string | null;
  registrationRoomId?: string;
  labelError?: OrderPointLabelError;
};

export const initialMenuTableActionState: MenuTableActionState = {
  status: "idle",
  message: "",
  tableId: null,
  qrPath: null,
};
