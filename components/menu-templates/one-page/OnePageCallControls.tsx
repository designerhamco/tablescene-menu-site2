"use client";

import { Bell } from "lucide-react";
import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import ScriptAwareText from "../shared/ScriptAwareText";

type OnePageCallActions = { enabled: boolean; tableLabel: string; openCall: () => void };
const OnePageCallContext = createContext<OnePageCallActions>({ enabled: false, tableLabel: "", openCall: () => {} });
export const OnePageCallProvider = OnePageCallContext.Provider;
export function useOnePageCallActions() { return useContext(OnePageCallContext); }

/** Read the rendered title/name so saved colors and template panel colors both work. */
export function OnePageCallPalette() {
  const marker = useRef<HTMLSpanElement>(null);
  const call = useOnePageCallActions();
  useEffect(() => {
    if (!call.enabled) return;
    const root = marker.current?.closest<HTMLElement>(".cafe-a-typography");
    if (!root) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const visible = (element: Element) => element.getBoundingClientRect().width > 0;
      const brand = [...root.querySelectorAll<HTMLElement>("[data-cafe-a-store-title],.cafe-a-store-title")].find(visible);
      const name = [...root.querySelectorAll<HTMLElement>("[data-cafe-a-menu-name]")].find(visible);
      const colors = {
        "--cafe-a-call-accent": brand ? getComputedStyle(brand).color : "#191c1b",
        "--cafe-a-call-ink": name ? getComputedStyle(name).color : "#191c1b",
      };
      const rgb = colors["--cafe-a-call-accent"].match(/[\d.]+/g)?.map(Number);
      const foreground = rgb && rgb.length >= 3 && rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722 > 180 ? "#191c1b" : "#ffffff";
      for (const [key, value] of Object.entries({ ...colors, "--cafe-a-call-foreground": foreground })) {
        if (root.style.getPropertyValue(key) !== value) root.style.setProperty(key, value);
      }
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const observer = new MutationObserver(schedule);
    observer.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ["class", "style", "data-fit-presentation-state"] });
    window.addEventListener("resize", schedule);
    schedule();
    return () => { observer.disconnect(); cancelAnimationFrame(frame); window.removeEventListener("resize", schedule); };
  }, [call.enabled]);
  return call.enabled ? <span ref={marker} hidden aria-hidden="true" /> : null;
}

export function OnePageCallButton({ mobile = false }: { mobile?: boolean }) {
  const call = useOnePageCallActions();
  if (!call.enabled) return null;
  return (
    <button type="button" className={mobile ? "cafe-a-mobile-call-button" : "cafe-a-desktop-call-button"}
      aria-label="직원 호출" data-one-page-call-button={mobile ? "mobile" : "desktop"} onClick={call.openCall}>
      <Bell aria-hidden="true" strokeWidth={1.8} />
      {!mobile ? <span><ScriptAwareText text="호출" /></span> : null}
    </button>
  );
}

export function OnePageMobileCallBar({ languageControl }: { languageControl: ReactNode }) {
  const call = useOnePageCallActions();
  if (!call.enabled) return null;
  return <div className="cafe-a-mobile-call-bar" data-one-page-call-bar="">
    <OnePageCallButton mobile />
    <span className="cafe-a-call-table-label" data-one-page-table-label=""><ScriptAwareText text={call.tableLabel} /></span>
    <div className="cafe-a-call-language-slot">{languageControl}</div>
  </div>;
}
