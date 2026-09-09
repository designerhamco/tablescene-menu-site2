export type OrderManagementActionState = {
  status: "idle" | "success" | "error";
  message: string;
  orderId: string | null;
};

export const initialOrderManagementActionState: OrderManagementActionState = {
  status: "idle",
  message: "",
  orderId: null,
};
