import type { CSSProperties, ReactNode } from "react";

import type { OrderCallEntryConfig } from "./types";
import { LOCKED_ORDER_CALL_ENTRY_CONFIG } from "./types";

type OrderCallEntryLayerProps = {
  config?: OrderCallEntryConfig;
  children: ReactNode;
};

const lockedEntryStyle = {
  "--public-menu-entry-header-height": "0px",
} as CSSProperties;

export default function OrderCallEntryLayer({
  config = LOCKED_ORDER_CALL_ENTRY_CONFIG,
  children,
}: OrderCallEntryLayerProps) {
  if (config.mode === "locked") {
    return <>{children}</>;
  }

  return (
    <div
      data-public-menu-entry-layer=""
      data-order-call-mode={config.mode}
      style={lockedEntryStyle}
    >
      {children}
    </div>
  );
}

