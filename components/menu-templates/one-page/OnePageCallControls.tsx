"use client";

import { Bell, ShoppingCart } from "lucide-react";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import ScriptAwareText from "../shared/ScriptAwareText";

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

function colorLuminance(color: string) {
  const hex = color.match(/^#([a-f\d]{6})$/i)?.[1];
  const channels = hex
    ? [0, 2, 4].map((offset) =>
        Number.parseInt(hex.slice(offset, offset + 2), 16),
      )
    : (color
        .match(/[\d.]+/g)
        ?.slice(0, 3)
        .map(Number) ?? [25, 28, 27]);
  const linear = channels.map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}
function colorContrast(first: string, second: string) {
  const a = colorLuminance(first),
    b = colorLuminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** The bar follows the brand; buttons choose a visible accent from the menu palette. */
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
      const brand = [
        ...root.querySelectorAll<HTMLElement>(
          "[data-cafe-a-store-title],.cafe-a-store-title",
        ),
      ].find(visible);
      const brandColor = brand
        ? getComputedStyle(brand).color
        : getComputedStyle(root)
            .getPropertyValue("--menu-role-brand-color")
            .trim() || "#191c1b";
      const category = [
        ...root.querySelectorAll<HTMLElement>(".cafe-a-category-title"),
      ].find(visible);
      const categoryColor = category
        ? getComputedStyle(category).color
        : getComputedStyle(root)
            .getPropertyValue("--menu-role-category-color")
            .trim() || "#191c1b";
      setVariable("--cafe-a-language-trigger-ink", brandColor);
      setVariable("--cafe-a-language-menu-ink", categoryColor);

      if (!call.enabled) return;
      const button = [
        ...root.querySelectorAll<HTMLElement>("[data-one-page-call-button]"),
      ].find(visible);
      let panel = button?.parentElement ?? root;
      let background = "#ffffff";
      while (panel) {
        const candidate = getComputedStyle(panel).backgroundColor;
        if (
          candidate !== "transparent" &&
          !/rgba\([^)]*,\s*0\)$/.test(candidate)
        ) {
          background = candidate;
          break;
        }
        if (!panel.parentElement) break;
        panel = panel.parentElement;
      }
      const palette = [
        brandColor,
        ...[
          ...root.querySelectorAll<HTMLElement>(
            ".cafe-a-category-title,[data-cafe-a-menu-name]",
          ),
        ]
          .filter(visible)
          .map((element) => getComputedStyle(element).color),
        "#191c1b",
      ];
      const accent =
        palette.find((color) => colorContrast(color, background) >= 3) ??
        "#191c1b";
      const colors = {
        "--cafe-a-call-accent": accent,
        "--cafe-a-call-ink": brandColor,
      };
      const foreground =
        colorContrast(accent, "#ffffff") >= colorContrast(accent, "#191c1b")
          ? "#ffffff"
          : "#191c1b";
      for (const [key, value] of Object.entries({
        ...colors,
        "--cafe-a-call-foreground": foreground,
      })) {
        setVariable(key, value);
      }
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
  const actions = useOnePageCallActions();
  if (!actions.enabled) return null;
  const buttonClass = mobile
    ? "cafe-a-mobile-call-button"
    : "cafe-a-desktop-call-button";
  return (
    <div className="cafe-a-table-actions" data-one-page-table-actions="">
      {actions.orderEnabled ? (
        <button
          type="button"
          className={buttonClass}
          aria-label={`장바구니 ${actions.cartCount ?? 0}개`}
          data-one-page-call-button={mobile ? "mobile-cart" : "desktop-cart"}
          onClick={actions.openCart}
        >
          <ShoppingCart aria-hidden="true" strokeWidth={1.8} />
          {!mobile ? (
            <span>
              <ScriptAwareText text="장바구니" />
            </span>
          ) : null}
          {(actions.cartCount ?? 0) > 0 ? (
            <span className="cafe-a-cart-count">{actions.cartCount}</span>
          ) : null}
        </button>
      ) : null}
      {actions.callEnabled !== false ? (
        <button
          type="button"
          className={buttonClass}
          aria-label="직원 호출"
          data-one-page-call-button={mobile ? "mobile" : "desktop"}
          onClick={actions.openCall}
        >
          <Bell aria-hidden="true" strokeWidth={1.8} />
          {!mobile ? (
            <span>
              <ScriptAwareText text="호출" />
            </span>
          ) : null}
        </button>
      ) : null}
    </div>
  );
}

export function OnePageMobileCallBar({
  languageControl,
}: {
  languageControl: ReactNode;
}) {
  const call = useOnePageCallActions();
  if (!call.enabled) return null;
  return (
    <div className="cafe-a-mobile-call-bar" data-one-page-call-bar="">
      <div className="cafe-a-call-language-slot">{languageControl}</div>
      <span className="cafe-a-call-table-label" data-one-page-table-label="">
        {call.tableLabel}
      </span>
      <OnePageCallButton mobile />
    </div>
  );
}

/** Mobile-only persistent entry; uses the same simulated/real call action as the header. */
export function OnePageMobileCallDock() {
  const call = useOnePageCallActions();
  if (!call.enabled || call.callEnabled === false || call.orderEnabled)
    return null;
  return (
    <div className="cafe-a-mobile-call-dock" data-one-page-call-dock="">
      <button
        type="button"
        className="cafe-a-mobile-call-dock-button"
        aria-label="직원 호출하기"
        data-one-page-call-button="mobile-bottom"
        onClick={call.openCall}
      >
        <Bell aria-hidden="true" strokeWidth={1.8} />
        <span>직원 호출하기</span>
      </button>
    </div>
  );
}
