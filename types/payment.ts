import type { MenuOrderPayload } from "@/lib/payments";

export type ApplyOrderPayload = MenuOrderPayload;

export type PaymentCompleteRequest = {
  paymentId: string;
  order: ApplyOrderPayload;
};

export type PaymentCompleteResponse =
  | {
      ok: true;
      message: string;
      paymentId: string;
      orderId: string;
      paymentRecordId?: string;
      menuSiteId: string;
      slug: string;
      alreadyProcessed?: boolean;
    }
  | {
      ok: false;
      message: string;
    };

export type CreateMenuSiteResult = {
  id: string;
  slug: string;
};
