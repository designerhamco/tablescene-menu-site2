"use client";
import { OnePageCallProvider } from "@/components/menu-templates/one-page/OnePageCallControls";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Bell, ShoppingCart } from "lucide-react";
import ScriptAwareText from "@/components/menu-templates/shared/ScriptAwareText";
import MenuLanguageSwitcher from "@/components/menu-templates/shared/MenuLanguageSwitcher";
import type { SupportedLocale } from "@/lib/locales";
import type { MenuPreviewDevice } from "@/lib/menu-preview-devices";
import { MenuOrderActionsProvider } from "./MenuOrderAddButton";
import PostpayOrderCartDrawer from "./PostpayOrderCartDrawer";
import StaffCallDialog from "./StaffCallDialog";
import {
  getOrderCallEntryVisibility,
  type OrderCallEntryConfig,
} from "./types";
import styles from "./TableMenuInteractions.module.css";
const subscribe = (listener: () => void) => {
  window.addEventListener("resize", listener);
  return () => window.removeEventListener("resize", listener);
};
export function useMenuPresentationDevice(explicit?: MenuPreviewDevice): MenuPreviewDevice {
  const inferred = useSyncExternalStore<MenuPreviewDevice>(
    subscribe,
    () =>
      window.innerWidth < 768
        ? "mobile"
        : window.innerWidth < 1280
          ? "tablet"
          : "pc",
    () => "pc",
  );
  return explicit ?? inferred;
}
type Actions = {
  call: boolean;
  order: boolean;
  count: number;
  table: string;
  openCall: () => void;
  openCart: () => void;
  locale: SupportedLocale;
  locales: SupportedLocale[];
  presentation: "cafe" | "aube";
};
const Context = createContext<Actions | null>(null);
export function TableMenuActionButtons({ appearance = "circle" }: { appearance?: "circle" | "inline" }) {
  const a = useContext(Context);
  if (!a || (!a.call && !a.order)) return null;
  const inline = appearance === "inline";
  return (
    <div className={styles.actions} data-table-menu-actions data-appearance={appearance}>
      {a.call ? (
        <button
          type="button"
          className={inline ? styles.inlineAction : styles.circle}
          aria-label="직원 호출"
          onClick={a.openCall}
        >
          <Bell aria-hidden="true" />
          {inline ? <ScriptAwareText text="호출" /> : null}
        </button>
      ) : null}
      {a.order ? (
        <button
          type="button"
          className={inline ? styles.inlineAction : styles.circle}
          aria-label={`장바구니 ${a.count}개`}
          onClick={a.openCart}
        >
          <ShoppingCart aria-hidden="true" />
          {inline ? <ScriptAwareText text="장바구니" /> : null}
          {a.count > 0 ? (
            <span className={styles.badge}>
              {a.count > 99 ? "99+" : a.count}
            </span>
          ) : null}
        </button>
      ) : null}
    </div>
  );
}
export function TableMenuHeader({ actions = true }: { actions?: boolean }) {
  const a = useContext(Context);
  if (!a) return null;
  return (
    <header className={styles.header} data-table-menu-header>
      <MenuLanguageSwitcher
        currentLocale={a.locale}
        enabledLocales={a.locales}
        compact
        iconOnly={a.presentation !== "aube"}
        triggerVariant={a.presentation}
        menuAlign="left"
      />
      <span className={styles.table}>{a.table}</span>
      {actions ? <TableMenuActionButtons /> : <span />}
    </header>
  );
}
export default function TableMenuInteractions({
  config,
  locale,
  locales,
  device,
  embedded = false,
  presentation = "cafe",
  typographyStyle,
  children,
}: {
  config: OrderCallEntryConfig;
  locale: SupportedLocale;
  locales: SupportedLocale[];
  device?: MenuPreviewDevice;
  embedded?: boolean;
  presentation?: "cafe" | "aube";
  typographyStyle?: CSSProperties;
  children: ReactNode;
}) {
  const devicePresentation = useMenuPresentationDevice(device);
  const [cartOpen, setCartOpen] = useState(false);
  const [callOpen, setCallOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const [toast, setToast] = useState("");
  const visibility = getOrderCallEntryVisibility(config);
  const order =
    visibility.showCart &&
    config.mode === "active" &&
    Boolean(config.menuSiteId && config.cartScope && config.orderCatalog);
  const call =
    visibility.showCall &&
    config.mode === "active" &&
    Boolean(config.menuSiteId);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 2200);
    return () => clearTimeout(id);
  }, [toast]);
  const actions: Actions = {
    call,
    order,
    count,
    table: config.tableLabel || "Table 1",
    openCall: () => setCallOpen(true),
    openCart: () => {
      setSelected(null);
      setCartOpen(true);
    },
    locale,
    locales,
    presentation,
  };
  return (
    <Context.Provider value={actions}>
      <OnePageCallProvider
        value={{
          enabled: call || order,
          callEnabled: call,
          orderEnabled: order,
          cartCount: count,
          tableLabel: actions.table,
          openCall: actions.openCall,
          openCart: actions.openCart,
        }}
      >
        <MenuOrderActionsProvider
          catalog={order ? (config.orderCatalog ?? []) : []}
          onOpenItem={(id) => {
            setSelected(id);
            setCartOpen(true);
          }}
        >
          <div
            className={`menu-typography ${styles.shell}`}
            style={typographyStyle}
            data-menu-interaction-shell
            data-device={devicePresentation}
            data-presentation={presentation}
            data-embedded={embedded ? "true" : "false"}
          >
            {!embedded && devicePresentation === "mobile" ? (
              <TableMenuHeader />
            ) : null}
            <div className={styles.content}>{children}</div>
            {!embedded && devicePresentation !== "mobile" ? (
              <div className={styles.dock}>
                <TableMenuActionButtons />
              </div>
            ) : null}
            {toast ? (
              <div className={styles.toast} role="status">
                {toast}
              </div>
            ) : null}
            {order ? (
              <PostpayOrderCartDrawer
                open={cartOpen}
                onClose={() => {
                  setCartOpen(false);
                  setSelected(null);
                }}
                menuSiteId={config.menuSiteId!}
                cartScope={config.cartScope || "preview"}
                catalog={config.orderCatalog ?? []}
                previewOnly={config.previewOnly}
                typographyStyle={typographyStyle}
                checkoutModes={
                  devicePresentation === "mobile" &&
                  config.checkoutModes?.includes("prepay")
                    ? ["postpay", "prepay"]
                    : ["postpay"]
                }
                selectedMenuItemId={selected}
                onCountChange={setCount}
                onItemAdded={(name) => {
                  setCartOpen(false);
                  setSelected(null);
                  setToast(name + " 장바구니에 담았어요.");
                }}
              />
            ) : null}
            {call ? (
              <StaffCallDialog
                open={callOpen}
                onClose={() => setCallOpen(false)}
                menuSiteId={config.menuSiteId!}
                tableLabel={config.tableLabel}
                previewOnly={config.previewOnly}
                callItems={config.callItems}
                presentation={presentation === "aube" ? "aube" : "default"}
              />
            ) : null}
          </div>
        </MenuOrderActionsProvider>
      </OnePageCallProvider>
    </Context.Provider>
  );
}
