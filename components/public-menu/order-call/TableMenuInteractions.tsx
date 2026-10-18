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
export function useMenuPresentationDevice(explicit?: MenuPreviewDevice) {
  const inferred = useSyncExternalStore(
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
};
const Context = createContext<Actions | null>(null);
export function TableMenuActionButtons() {
  const a = useContext(Context);
  if (!a) return null;
  return (
    <div className={styles.actions} data-table-menu-actions>
      {a.order ? (
        <button
          type="button"
          className={styles.circle}
          aria-label={`장바구니 ${a.count}개`}
          onClick={a.openCart}
        >
          <ShoppingCart aria-hidden="true" />
          {a.count > 0 ? (
            <span className={styles.badge}>
              {a.count > 99 ? "99+" : a.count}
            </span>
          ) : null}
        </button>
      ) : null}
      {a.call ? (
        <button
          type="button"
          className={styles.circle}
          aria-label="직원 호출"
          onClick={a.openCall}
        >
          <Bell aria-hidden="true" />
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
        iconOnly
        triggerVariant="cafe"
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
  typographyStyle,
  children,
}: {
  config: OrderCallEntryConfig;
  locale: SupportedLocale;
  locales: SupportedLocale[];
  device?: MenuPreviewDevice;
  embedded?: boolean;
  typographyStyle?: CSSProperties;
  children: ReactNode;
}) {
  const presentation = useMenuPresentationDevice(device);
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
            data-device={presentation}
            data-embedded={embedded ? "true" : "false"}
          >
            {!embedded && presentation === "mobile" ? (
              <TableMenuHeader />
            ) : null}
            <div className={styles.content}>{children}</div>
            {!embedded && presentation !== "mobile" ? (
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
                  presentation === "mobile" &&
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
              />
            ) : null}
          </div>
        </MenuOrderActionsProvider>
      </OnePageCallProvider>
    </Context.Provider>
  );
}
