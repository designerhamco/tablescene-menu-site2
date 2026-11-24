import type { PostpayOrderCatalogItem } from "@/components/public-menu/order-call/types";
import type { PostpayOrderLineInput } from "@/lib/postpay-order-payload";

export type ManualOrderCategory = { id: string; name: string; items: PostpayOrderCatalogItem[] };

export type ManualOrderSubmission = {
  tableId: string;
  clientRequestId: string;
  lines: PostpayOrderLineInput[];
  notificationPhone: string;
  expectedTotal: number;
};

export type ManualOrderActions = {
  load: () => Promise<{ catalog: ManualOrderCategory[] } | { error: string }>;
  submit: (input: ManualOrderSubmission) => Promise<{ orderId: string } | { error: string; refreshCatalog?: boolean }>;
};
