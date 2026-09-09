export type CallManagementActionState = {
  status: "idle" | "success" | "error";
  message: string;
  callId: string | null;
};

export const initialCallManagementActionState: CallManagementActionState = {
  status: "idle",
  message: "",
  callId: null,
};

export type CallItemActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

export const initialCallItemActionState: CallItemActionState = {
  status: "idle",
  message: "",
};
