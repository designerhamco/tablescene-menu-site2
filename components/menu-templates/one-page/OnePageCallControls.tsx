"use client";
import { useMenuText } from "@/components/menu-templates/shared/MenuLocaleScope";

import MenuCartCountBadge from "@/components/public-menu/order-call/MenuCartCountBadge";
import { ShoppingCart } from "lucide-react";
import { StaffCallIcon } from "@/components/public-menu/order-call/MenuActionIcons";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import ScriptAwareText from "../shared/ScriptAwareText";
import { getRenderedMenuBrandColor } from "../shared/rendered-menu-colors";

type OnePageCallActions = {
  enabled: boolean;
  tableLabel: string;
  openCall: () => void;
  callEnabled?: boolean;
  orderEnabled?: boolean;
  cartCount?: number;
  openCart?: () => void;
};
const OnePageCallContext = createContext<OnePageCallActions>({
  enabled: false,
  tableLabel: "",
  openCall: () => {},
});
export const OnePageCallProvider = OnePageCallContext.Provider;
export function useOnePageCallActions() {
  return useContext(OnePageCallContext);
}

/** Language UI follows the rendered brand and category; action colors come from the menu shell. */
export function OnePageCallPalette() {
  const marker = useRef<HTMLSpanElement>(null);
  const call = useOnePageCallActions();
  useEffect(() => {
    const root = marker.current?.closest<HTMLElement>(".cafe-a-typography");
    if (!root) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const setVariable = (key: string, value: string) => {
        if (root.style.getPropertyValue(key) !== value)
          root.style.setProperty(key, value);
      };
      const visible = (element: Element) =>
        element.getBoundingClientRect().width > 0;
      const brandColor = getRenderedMenuBrandColor(root);
      const category = [
        ...root.querySelectorAll<HTMLElement>(".cafe-a-category-title"),
      ].find(visible);
      const categoryColor = category
        ? getComputedStyle(category).color
        : getComputedStyle(root)
            .getPropertyValue("--menu-role-category-color")
            .trim() || "#191c1b";
      setVariable("--cafe-a-call-ink", brandColor);
      setVariable("--cafe-a-language-trigger-ink", brandColor);
      setVariable("--cafe-a-language-menu-ink", categoryColor);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const observer = new MutationObserver(schedule);
    observer.observe(root, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["class", "style", "data-fit-presentation-state"],
    });
    window.addEventListener("resize", schedule);
    schedule();
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", schedule);
    };
  }, [call.enabled]);
  return <span ref={marker} hidden aria-hidden="true" />;
}

export function OnePageCallButton({ mobile = false }: { mobile?: boolean }) {
  const t = useMenuText();
  const actions = useOnePageCallActions();
  if (!actions.enabled) return null;
  const buttonClass = mobile
    ? "cafe-a-mobile-call-button"
    : "cafe-a-desktop-call-button";
  return (
    <div className="cafe-a-table-actions" data-one-page-table-actions="">
      {actions.callEnabled !== false && (!mobile || !actions.orderEnabled) ? (
        <button
          type="button"
          className={buttonClass}
          aria-label={t("직원 호출")}
          data-one-page-call-button={mobile ? "mobile" : "desktop"}
          onClick={actions.openCall}
        >
          <StaffCallIcon aria-hidden="true" strokeWidth={1.8} />
          {!mobile ? (
            <span>
              <ScriptAwareText text={t("호출")} />
            </span>
          ) : null}
        </button>
      ) : null}
      {actions.orderEnabled ? (
        <button
          type="button"
          className={buttonClass}
          aria-label={t("장바구니 {0}개", actions.cartCount ?? 0)}
          data-one-page-call-button={mobile ? "mobile-cart" : "desktop-cart"}
          onClick={actions.openCart}
        >
          <ShoppingCart aria-hidden="true" strokeWidth={1.8} />
          {!mobile ? (
            <span>
              <ScriptAwareText text={t("장바구니")} />
            </span>
          ) : null}
          {(actions.cartCount ?? 0) > 0 ? (
            <MenuCartCountBadge className="cafe-a-cart-count" count={actions.cartCount!} />
          ) : null}
        </button>
      ) : null}
    </div>
  );
}

export function OnePageMobileCallBar({
  languageControl,
  showActions = true,
}: {
  languageControl: ReactNode;
  showActions?: boolean;
}) {
  const call = useOnePageCallActions();
  if (!call.enabled) return null;
  return (
    <div className="cafe-a-mobile-call-bar" data-one-page-call-bar="">
      <div className="cafe-a-call-language-slot">{languageControl}</div>
      <span className="cafe-a-call-table-label" data-one-page-table-label="">
        {call.tableLabel}
      </span>
      {showActions ? <OnePageCallButton mobile /> : <span aria-hidden="true" />}
    </div>
  );
}

/** Mobile entries share the same call/cart actions as the header. */
export function OnePageMobileCallDock() {
  const t = useMenuText();
  const call = useOnePageCallActions();
  if (!call.enabled) return null;
  const showCall = call.callEnabled !== false;
  const showOrder = Boolean(call.orderEnabled);
  if (!showCall && !showOrder) return null;
  return (
    <div className="cafe-a-mobile-call-dock" data-one-page-call-dock="" data-has-order={showOrder ? "true" : "false"}>
      {showOrder ? <button type="button" className="cafe-a-mobile-call-dock-button cafe-a-mobile-order-dock-button"
        aria-label={t("주문하기, 장바구니 {0}개", call.cartCount ?? 0)} data-one-page-call-button="mobile-order-bottom" onClick={call.openCart}>
        <ShoppingCart aria-hidden="true" strokeWidth={1.8} /><span>{t("주문하기")}{(call.cartCount ?? 0) > 0 ? ` (${call.cartCount})` : ""}</span>
      </button> : null}
      {showCall ? <button type="button" className="cafe-a-mobile-call-dock-button" aria-label={t("직원 호출하기")}
        data-one-page-call-button="mobile-bottom" onClick={call.openCall}>
        <StaffCallIcon aria-hidden="true" strokeWidth={1.8} /><span>{showOrder ? t("호출하기") : t("직원 호출하기")}</span>
      </button> : null}
    </div>
  );
}
