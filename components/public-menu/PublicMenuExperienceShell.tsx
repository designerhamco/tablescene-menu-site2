import type { CSSProperties, ReactNode } from "react";

import type { SupportedLocale } from "@/lib/locales";
import type { TemplateKey } from "@/lib/templates";

import { usesOnePageProportionPolicy } from "@/lib/one-page-proportion-policy";
import TableMenuInteractions from "./order-call/TableMenuInteractions";
import type { MenuPreviewDevice } from "@/lib/menu-preview-devices";
import OrderCallEntryLayer from "./order-call/OrderCallEntryLayer";
import {
  getLockedOrderCallEntryConfig,
  supportsOrderCallExperienceShell,
  type OrderCallEntryConfig,
} from "./order-call/types";

type PublicMenuExperienceShellProps = {
  templateKey: TemplateKey;
  storeName?: string | null;
  currentLocale: SupportedLocale;
  enabledLocales: SupportedLocale[];
  orderCallConfig?: OrderCallEntryConfig;
  typographyStyle?: CSSProperties;
  children: ReactNode;
  pagePresentation?: "one" | "multi";
  previewDevice?: MenuPreviewDevice;
};

export default function PublicMenuExperienceShell({
  templateKey,
  storeName,
  currentLocale,
  enabledLocales,
  orderCallConfig,
  typographyStyle,
  children,
  pagePresentation,
  previewDevice,
}: PublicMenuExperienceShellProps) {
  if (!supportsOrderCallExperienceShell(templateKey)) {
    return <>{children}</>;
  }

  if (
    orderCallConfig &&
    (orderCallConfig.orderEnabled || orderCallConfig.callEnabled)
  ) {
    return (
      <TableMenuInteractions
        config={orderCallConfig}
        locale={currentLocale}
        locales={enabledLocales}
        device={previewDevice}
        typographyStyle={typographyStyle}
        embedded={
          templateKey === "cafe_real_matcha_paged_test" ||
          usesOnePageProportionPolicy(templateKey, pagePresentation)
        }
      >
        {children}
      </TableMenuInteractions>
    );
  }

  return (
    <OrderCallEntryLayer
      templateKey={templateKey}
      config={
        orderCallConfig ??
        getLockedOrderCallEntryConfig({ storeName: storeName ?? undefined })
      }
      currentLocale={currentLocale}
      enabledLocales={enabledLocales}
      typographyStyle={typographyStyle}
      pagePresentation={pagePresentation}
    >
      {children}
    </OrderCallEntryLayer>
  );
}
