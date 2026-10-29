"use client";
import { useMenuText } from "@/components/menu-templates/shared/MenuLocaleScope";
import { OnePageCallProvider } from "@/components/menu-templates/one-page/OnePageCallControls";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react";
import { StaffCallIcon, MenuOrderIcon } from "./MenuActionIcons";
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
import MenuCartCountBadge from "./MenuCartCountBadge";
import styles from "./TableMenuInteractions.module.css";
import useMenuInteractionTheme from "./useMenuInteractionTheme";
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
  device: MenuPreviewDevice;
};
const Context = createContext<Actions | null>(null);
export function TableMenuActionButtons({ appearance = "circle", headerOnly = false, hideCall = false }: { appearance?: "circle" | "inline"; headerOnly?: boolean; hideCall?: boolean }) {
  const t = useMenuText();
  const a = useContext(Context);
  if (!a || ((!a.call || hideCall) && !a.order)) return null;
  const inline = appearance === "inline";
  return (
    <div className={styles.actions} data-table-menu-actions data-appearance={appearance}>
      {a.call && !hideCall && (!headerOnly || !a.order) ? (
        <button
          type="button"
          className={inline ? styles.inlineAction : styles.circle}
          aria-label={t("직원 호출")}
          onClick={a.openCall}
        >
          <StaffCallIcon aria-hidden="true" />
          {inline ? <ScriptAwareText text={t("호출")} /> : null}
        </button>
      ) : null}
      {a.order ? (
        <button
          type="button"
          className={inline ? styles.inlineAction : styles.circle}
          aria-label={t("장바구니 {0}개", a.count)}
          onClick={a.openCart}
        >
          <MenuOrderIcon variant={a.presentation === "aube" ? "document" : "cart"} purpose="view" />
          {inline ? <ScriptAwareText text={t("장바구니")} /> : null}
          {a.count > 0 ? (
            inline ? <span className={styles.badge}>{a.count > 99 ? "99+" : a.count}</span>
              : <MenuCartCountBadge className={styles.badge} count={a.count} />
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
      {actions ? <TableMenuActionButtons headerOnly /> : <span />}
    </header>
  );
}
/** Lives in Dining's fixed language slot, outside the moving page stage. */
export function DiningMenuToolbar({ children }: { children: ReactNode }) {
  const t = useMenuText();
  const actions = useContext(Context);
  if (!actions || actions.device === "mobile") return <>{children}</>;
  return <div className={styles.diningToolbar} data-dining-menu-toolbar role="group" aria-label={t("메뉴판 도구")}>
    <MenuLanguageSwitcher currentLocale={actions.locale} enabledLocales={actions.locales} compact triggerVariant="aube" menuAlign="right" />
    <TableMenuActionButtons hideCall />
  </div>;
}
function TableMenuMobileDock() {
  const t = useMenuText();
  const actions = useContext(Context);
  if (!actions || (!actions.call && !actions.order)) return null;
  return <div className={styles.mobileDock} data-table-mobile-dock>
    {actions.order ? <button type="button" className={styles.mobileOrder} onClick={actions.openCart} aria-label={t("주문하기, 장바구니 {0}개", actions.count)}>
      <MenuOrderIcon variant={actions.presentation === "aube" ? "document" : "cart"} purpose="view" /><span>{t("주문하기")}{actions.count ? ` (${actions.count})` : ""}</span>
    </button> : null}
    {actions.call ? <button type="button" className={actions.order ? styles.mobileCall : styles.mobileCallOnly} onClick={actions.openCall} aria-label={t("직원 호출하기")}>
      <StaffCallIcon aria-hidden="true" /><span>{t("호출하기")}</span>
    </button> : null}
  </div>;
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
  const t = useMenuText();
  const contentRef = useRef<HTMLDivElement>(null);
  const interactionStyle = useMenuInteractionTheme(contentRef);
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
    device: devicePresentation,
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
          iconVariant={presentation === "aube" ? "document" : "cart"}
          catalog={order ? (config.orderCatalog ?? []) : []}
          onOpenItem={(id) => {
            setSelected(id);
            setCartOpen(true);
          }}
        >
          <div
            className={`menu-typography ${styles.shell}`}
            style={{ ...typographyStyle, ...interactionStyle }}
            data-menu-interaction-shell
            data-device={devicePresentation}
            data-presentation={presentation}
            data-embedded={embedded ? "true" : "false"}
            data-mobile-dock={!embedded && devicePresentation === "mobile" && (call || order) ? "true" : "false"}
          >
            {!embedded && devicePresentation === "mobile" ? (
              <TableMenuHeader />
            ) : null}
            <div ref={contentRef} className={styles.content}>{children}</div>
            {!embedded && devicePresentation === "mobile" ? <TableMenuMobileDock /> : null}
            {!embedded && devicePresentation !== "mobile" && presentation !== "aube" ? (
              <div className={styles.dock}>
                <TableMenuActionButtons />
              </div>
            ) : null}
            {!embedded && devicePresentation !== "mobile" && presentation === "aube" && call ? (
              <button type="button" className={styles.diningFloatingCall} data-dining-floating-call aria-label={t("직원 호출하기")} onClick={actions.openCall}>
                <StaffCallIcon aria-hidden="true" /><span>{t("호출")}</span>
              </button>
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
                channel={config.channel ?? (devicePresentation === "mobile" ? "customer" : "terminal")}
                orderExpiresAt={config.orderExpiresAt}
                customerPhone={config.customerPhone}
                typographyStyle={typographyStyle}
                interactionStyle={interactionStyle}
                tableLabel={actions.table}
                iconVariant={presentation === "aube" ? "document" : "cart"}
                device={devicePresentation}
                checkoutModes={config.channel === "terminal" ? ["postpay"] : config.checkoutModes}
                selectedMenuItemId={selected}
                onCountChange={setCount}
                onItemAdded={(name) => {
                  setCartOpen(false);
                  setSelected(null);
                  setToast(name + t(" 장바구니에 담았어요."));
                }}
              />
            ) : null}
            {call ? (
              <StaffCallDialog
                open={callOpen}
                onClose={() => setCallOpen(false)}
                menuSiteId={config.menuSiteId!}
                tableLabel={actions.table}
                interactionStyle={interactionStyle}
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
