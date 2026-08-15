import type { OrderCallEntryConfig } from "@/components/public-menu/order-call/types";
import type { MenuPreviewExperience } from "@/lib/menu-preview-devices";

const PREVIEW_ORDER_CATALOG = [
  {
    id: "22222222-2222-4222-8222-222222222222",
    name: "시그니처 라떼",
    price: 6500,
    optionGroups: [
      {
        id: "33333333-3333-4333-8333-333333333333",
        name: "온도",
        isRequired: true,
        minSelections: 1,
        maxSelections: 1,
        values: [
          { id: "44444444-4444-4444-8444-444444444444", name: "HOT", priceDelta: 0 },
          { id: "55555555-5555-4555-8555-555555555555", name: "ICE", priceDelta: 500 },
        ],
      },
    ],
  },
  {
    id: "66666666-6666-4666-8666-666666666666",
    name: "버터 크루아상",
    price: 4800,
    optionGroups: [],
  },
] satisfies NonNullable<OrderCallEntryConfig["orderCatalog"]>;

export function buildMenuPreviewOrderCallConfig({
  experience,
  menuSiteId,
  storeName,
}: {
  experience: MenuPreviewExperience;
  menuSiteId: string;
  storeName: string;
}): OrderCallEntryConfig | undefined {
  if (experience === "standard") return undefined;

  const orderEnabled = experience === "postpay" || experience === "prepay";

  return {
    mode: "active",
    orderEnabled,
    callEnabled: true,
    hasValidTableSession: true,
    orderingOpen: orderEnabled,
    languageSlotEnabled: true,
    storeName,
    tableLabel: "TABLE 3 · 화면 미리보기",
    cartCount: orderEnabled ? 2 : 0,
    menuSiteId,
    cartScope: orderEnabled ? `menu-preview-${experience}` : undefined,
    orderCatalog: orderEnabled ? PREVIEW_ORDER_CATALOG : undefined,
    checkoutMode: experience === "prepay" ? "prepay" : "postpay",
    previewOnly: true,
    previewInitialPanel: experience === "call" ? "call" : experience === "prepay" ? "checkout" : "cart",
  };
}
