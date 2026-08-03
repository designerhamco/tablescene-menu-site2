import type { ReactNode } from "react";

import type { TemplateKey } from "@/lib/templates";

import OrderCallEntryLayer from "./order-call/OrderCallEntryLayer";
import { getLockedOrderCallEntryConfig, type OrderCallEntryConfig } from "./order-call/types";

type PublicMenuExperienceShellProps = {
  templateKey: TemplateKey;
  storeName?: string | null;
  orderCallConfig?: OrderCallEntryConfig;
  children: ReactNode;
};

function supportsOrderCallExperienceShell(templateKey: TemplateKey) {
  return templateKey !== "display_menu_a";
}

export default function PublicMenuExperienceShell({
  templateKey,
  storeName,
  orderCallConfig,
  children,
}: PublicMenuExperienceShellProps) {
  if (!supportsOrderCallExperienceShell(templateKey)) {
    return <>{children}</>;
  }

  return (
    <OrderCallEntryLayer config={orderCallConfig ?? getLockedOrderCallEntryConfig({ storeName: storeName ?? undefined })}>
      {children}
    </OrderCallEntryLayer>
  );
}

