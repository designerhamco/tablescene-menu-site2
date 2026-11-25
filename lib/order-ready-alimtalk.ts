export type OrderAlimtalkAttempt = {
  id: string;
  number: number;
  status: "pending" | "sent" | "failed";
};

export type OrderAlimtalkDetails = {
  sendingEnabled: boolean;
  maskedPhone: string | null;
  attempt: OrderAlimtalkAttempt | null;
};

export type OrderAlimtalkRequest = {
  orderId: string;
  expectedAttemptId: string | null;
  intent: "send" | "check";
};

export type OrderAlimtalkAction = (input: OrderAlimtalkRequest) => Promise<
  | { attempt: OrderAlimtalkAttempt; error?: never }
  | { error: string; attempt?: never }
>;
