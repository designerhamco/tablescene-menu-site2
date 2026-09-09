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
