import type { CSSProperties, ReactNode } from "react";

import type { SupportedLocale } from "@/lib/locales";
import type { TemplateKey } from "@/lib/templates";

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
};

export default function PublicMenuExperienceShell({
  templateKey,
  storeName,
  currentLocale,
  enabledLocales,
  orderCallConfig,
  typographyStyle,
  children,
}: PublicMenuExperienceShellProps) {
  if (!supportsOrderCallExperienceShell(templateKey)) {
    return <>{children}</>;
  }

  return (
    <OrderCallEntryLayer
      templateKey={templateKey}
      config={orderCallConfig ?? getLockedOrderCallEntryConfig({ storeName: storeName ?? undefined })}
      currentLocale={currentLocale}
      enabledLocales={enabledLocales}
      typographyStyle={typographyStyle}
    >
      {children}
    </OrderCallEntryLayer>
  );
}
