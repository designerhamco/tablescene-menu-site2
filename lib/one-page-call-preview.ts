import type { OrderCallEntryConfig } from "../components/public-menu/order-call/types";
import { usesOnePageProportionPolicy } from "./one-page-proportion-policy";

/** Design preview only: never enables a public call endpoint or table session. */
export function buildOnePageCallPreviewConfig({ enabled, templateKey, pagePresentation, menuSiteId, storeName }: {
  enabled: boolean;
  templateKey: string;
  pagePresentation?: "one" | "multi";
  menuSiteId: string;
  storeName: string;
}): OrderCallEntryConfig | undefined {
  if (!enabled || !usesOnePageProportionPolicy(templateKey, pagePresentation)) return undefined;
  return {
    mode: "active", callEnabled: true, orderEnabled: false,
    hasValidTableSession: true, orderingOpen: false, languageSlotEnabled: true,
    tableLabel: "Table 1", menuSiteId, storeName, previewOnly: true,
  };
}
