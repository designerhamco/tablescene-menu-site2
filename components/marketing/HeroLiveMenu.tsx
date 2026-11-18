/* eslint-disable @next/next/no-img-element -- Reduced-motion stills retain the authored menu-screen geometry. */
"use client";

import { useEffect, useRef, useState } from "react";
import { Hand } from "@/app/components/ui/site-icon";
import { ArrowLeftRight, ArrowUpDown } from "@/app/components/ui/site-arrow";
import { HERO_CAFE_SCREENS, HERO_CHAPTER_DURATION_MS, heroTween } from "@/lib/hero-cafe-motion";
import styles from "./HomeHeroMotion.module.css";

const preview = (template: string, device: string, extra = "") => `/templates/${template}/preview?view=actual&embedded=1&heroDemo=1&device=${device}${extra}`;
const SOURCES = {
  counter: preview("cafe_real_matcha_a", "tablet"),
  dining: preview("dining_aube_table_a", "tablet", "&callPreview=on"),
  phone: preview("cafe_real_matcha_a", "mobile", "&callPreview=off&orderPreview=on&popupPreview=on&widgetsPreview=on&prepayPreview=off"),
};
export type HeroLiveKind = keyof typeof SOURCES;
type Gesture = "click" | "swipe-x" | "swipe-y";
type Cue = { id: string; x: number; y: number; gesture: Gesture };
type Action = { id: string; cueAt: number; actAt: number; gesture: Gesture; find: () => HTMLElement | null; act?: (target: HTMLElement) => boolean };

/** Native public catalog controls only. The fixed heroDemo URLs always use previewOnly reception. */
export default function HeroLiveMenu({ kind, active, chapter, fraction, playing, reduced, onDetail, onReady, onComplete }: {
  kind: HeroLiveKind; active: boolean; chapter: number; fraction: number; playing: boolean; reduced: boolean;
  onDetail?: (point: readonly [number, number]) => void;
  onReady: (kind: HeroLiveKind, ready: boolean) => void;
  onComplete: () => void;
}) {
  const frame = useRef<HTMLIFrameElement>(null), time = useRef(0), performed = useRef(new Set<string>());
  const armed = useRef({ id: "", at: 0 }), lastAction = useRef(0), cueUntil = useRef(0);
  const [ready, setReady] = useState(false), [step, setStep] = useState("preloading");
  const [cue, setCue] = useState<Cue | null>(null), [orderReceived, setOrderReceived] = useState(false);
  const [surface, setSurface] = useState({ slide: "", popup: "", request: "", scroll: 0, actions: "" });
  const seconds = active ? (kind === "phone" && chapter === 4 ? HERO_CHAPTER_DURATION_MS[3] / 1000 : 0) + fraction * HERO_CHAPTER_DURATION_MS[chapter] / 1000 : 0;
  useEffect(() => { time.current = seconds; }, [seconds]);
  useEffect(() => {
    const received = (event: MessageEvent) => {
      if (event.origin === location.origin && event.source === frame.current?.contentWindow && event.data?.type === "artimenu-preview-order") { setOrderReceived(true); onComplete(); }
    };
    window.addEventListener("message", received); return () => window.removeEventListener("message", received);
  }, [onComplete]);
  useEffect(() => {
    onReady(kind, false);
    if (reduced) return;
    let initialised = false;
    const timer = window.setInterval(() => {
      const doc = frame.current?.contentDocument; if (!doc) { setStep("await-document"); return; }
      const native = doc.querySelector(kind === "dining" ? "[data-aube-table]" : kind === "phone" ? '[data-cafe-a-mobile-style="true"]' : "[data-native-ready], [data-paged-ready]");
      if (!native || doc.fonts.status !== "loaded" || native.getAttribute("data-native-ready") === "false" || native.getAttribute("data-paged-ready") === "false") { setStep("await-menu"); return; }
      if (!initialised) {
        doc.scrollingElement?.scrollTo({ top: 0, behavior: "instant" });
        const first = doc.querySelector<HTMLButtonElement>('[aria-label="1번째 대표 슬라이드 보기"]');
        first?.click(); first?.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
        const popup = doc.querySelector<HTMLElement>("[data-menu-advertisement-popup]");
        popup?.querySelector<HTMLButtonElement>('[data-popup-dots] button')?.click();
        popup?.dispatchEvent(new PointerEvent("pointerover", { bubbles: true, pointerType: "mouse" }));
        initialised = true; return;
      }
      if ([...doc.images].some(image => { const r=image.getBoundingClientRect(); return r.width>0&&r.top<doc.documentElement.clientHeight&&r.bottom>0&&!image.complete; })) { setStep("await-images"); return; }
      setReady(true); setStep("ready"); onReady(kind, true); window.clearInterval(timer);
    }, 100);
    return () => window.clearInterval(timer);
  }, [reduced, kind, onReady]);
  useEffect(() => {
    if (!active || !ready || reduced || !playing) return;
    const timer = window.setInterval(() => {
      const doc = frame.current?.contentDocument;
      if (!doc || !frame.current?.src.includes("/templates/")) return;
      const t = time.current, now = performance.now(), width = doc.documentElement.clientWidth, height = doc.documentElement.clientHeight;
      const snapshot = {slide:doc.querySelector('[data-cafe-a-active-hero-index]')?.getAttribute('data-cafe-a-active-hero-index')??"",popup:doc.querySelector('[data-menu-advertisement-popup]')?.getAttribute('data-popup-active')??"closed",request:doc.querySelector('[aria-label="직원 호출 항목"] [aria-pressed="true"]')?.textContent??doc.querySelector('[data-call-status]')?.textContent??"",scroll:Math.round((kind==="counter"?doc.querySelector<HTMLElement>('[data-native-menu], [data-scroll-menu]')?.scrollTop:doc.scrollingElement?.scrollTop)??0),actions:kind==="phone"?[...doc.querySelectorAll('button')].slice(-8).map(item=>item.textContent?.trim()).join(" | "):""};
      setSurface(current=>JSON.stringify(current)===JSON.stringify(snapshot)?current:snapshot);
      let showingCue = false;
      const show = (next: Cue) => {
        showingCue = true; cueUntil.current = now + 1100;
        setCue(current => current?.id === next.id && current.gesture === next.gesture && Math.abs(current.x - next.x) < .2 && Math.abs(current.y - next.y) < .2 ? current : next);
      };
      const point = (target: HTMLElement, gesture: Gesture, id: string) => {
        const r = target.getBoundingClientRect();
        show({ id, gesture, x: (r.x + r.width / 2) / width * 100, y: (r.y + r.height / 2) / height * 100 });
      };
      const button = (selector: string) => doc.querySelector<HTMLButtonElement>(selector);
      // Arm a visible gesture before committing each native action, even after a large scroll seek.
      const run = (actions: Action[]) => {
        for (const action of actions) {
          if (performed.current.has(action.id)) continue;
          if (t < action.cueAt || now - lastAction.current < 1100) return;
          const target = action.find(); if (!target || (target as HTMLButtonElement).disabled) return;
          if (armed.current.id !== action.id) armed.current = { id: action.id, at: now };
          if (action.gesture === "click") point(target, action.gesture, action.id);
          else show({ id: action.id, gesture: action.gesture, x: 52, y: 52 });
          if (t >= action.actAt && now - armed.current.at >= 900) {
            const acted = action.act ? action.act(target) : (target.click(), true);
            if (acted) { performed.current.add(action.id); lastAction.current = now; setStep(action.id); }
          }
          return;
        }
      };
      if (kind === "counter") {
        const scrolling = doc.querySelector<HTMLElement>("[data-native-menu], [data-scroll-menu]");
        const sale = doc.querySelector<HTMLElement>('[data-native-tracks] [data-cafe-a-time-sale-digital-timer], [data-scroll-content] [data-cafe-a-time-sale-digital-timer]');
        if (scrolling && sale) {
          const target = Math.max(0, Math.min(scrolling.scrollHeight - scrolling.clientHeight, scrolling.scrollTop + sale.getBoundingClientRect().top - scrolling.getBoundingClientRect().top - scrolling.clientHeight * .28));
          const maximum = scrolling.scrollHeight - scrolling.clientHeight;
          scrolling.scrollTop = t < 10 ? maximum * heroTween(t, 4, 10) : maximum + (target - maximum) * heroTween(t, 10, 13);
          if (t >= 4 && t < 13) { show({ id: "menu-scroll", gesture: "swipe-y", x: 79, y: 58 }); setStep("menu-scroll"); }
          if (t >= 13) {
            const r = sale.getBoundingClientRect(), u = (r.x + r.width / 2) / width, v = (r.y + r.height / 2) / height, q = HERO_CAFE_SCREENS.counter;
            onDetail?.([q[0][0] * (1-u) * (1-v) + q[1][0] * u * (1-v) + q[2][0] * u * v + q[3][0] * (1-u) * v, q[0][1] * (1-u) * (1-v) + q[1][1] * u * (1-v) + q[2][1] * u * v + q[3][1] * (1-u) * v]);
            setStep("sale-focus");
          }
        }
      }
      if (kind === "dining") run([
        { id: "page1", cueAt: 4, actAt: 6, gesture: "swipe-x", find: () => button('[aria-label="다음 메뉴 페이지"]') },
        { id: "page2", cueAt: 9, actAt: 11, gesture: "swipe-x", find: () => button('[aria-label="다음 메뉴 페이지"]') },
        { id: "call", cueAt: 15, actAt: 18, gesture: "click", find: () => button('[aria-label="직원 호출하기"]') },
        { id: "wine", cueAt: 22, actAt: 25, gesture: "click", find: () => [...doc.querySelectorAll<HTMLButtonElement>('[aria-label="직원 호출 항목"] button')].find(item => item.textContent?.includes("와인 문의")) ?? null },
        { id: "send", cueAt: 28, actAt: 31, gesture: "click", find: () => button('[data-smart-call-submit]') },
      ]);
      if (kind === "phone") {
        const lastItem = () => [...doc.querySelectorAll<HTMLButtonElement>('button[aria-label$=" 담기"]')].at(-1) ?? null;
        const scrolling = doc.scrollingElement;
        if (performed.current.has("popup") && !performed.current.has("item") && scrolling && t >= 19) {
          if (t < 30) {
            scrolling.scrollTop = (scrolling.scrollHeight - scrolling.clientHeight) * heroTween(t, 19, 29);
            if (t < 29) { show({ id: "menu-scroll", gesture: "swipe-y", x: 67, y: 57 }); setStep("menu-scroll"); }
          } else if (lastItem()) scrolling.scrollTop += lastItem()!.getBoundingClientRect().top - height * .58;
        }
        run([
          { id: "advert1", cueAt: 6, actAt: 9, gesture: "swipe-x", find: () => doc.querySelector('[data-menu-advertisement-popup] [role="region"]'), act: target => { target.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })); return true; } },
          { id: "advert2", cueAt: 11, actAt: 13, gesture: "swipe-x", find: () => doc.querySelector('[data-menu-advertisement-popup] [role="region"]'), act: target => { target.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })); return true; } },
          { id: "popup", cueAt: 15, actAt: 18, gesture: "click", find: () => button('[data-menu-advertisement-popup] button[aria-label="닫기"]') },
          { id: "item", cueAt: 31, actAt: 33, gesture: "click", find: lastItem },
          { id: "add", cueAt: 35, actAt: 37, gesture: "click", find: () => [...doc.querySelectorAll<HTMLButtonElement>("button")].find(item => item.textContent?.includes("· 장바구니 담기")) ?? null },
          { id: "cart", cueAt: 39, actAt: 41, gesture: "click", find: () => button('[aria-label^="주문하기, 장바구니"]') },
          { id: "phone", cueAt: 42, actAt: 42, gesture: "click", find: () => doc.querySelector('input[type="tel"]') ?? [...doc.querySelectorAll<HTMLButtonElement>('button')].find(item=>item.textContent==='후불로 주문하기') ?? null, act: target => {
            if(target.tagName!=="INPUT")return true;
            const input = target as HTMLInputElement, setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), "value")?.set;
            setter?.call(input, "01000000000"); input.dispatchEvent(new Event("input", { bubbles: true })); return true;
          } },
          { id: "order", cueAt: 44, actAt: 47, gesture: "click", find: () => [...doc.querySelectorAll<HTMLButtonElement>("button")].find(item => item.textContent === "후불로 주문하기") ?? null },
        ]);
      }
      if (!showingCue && now > cueUntil.current) setCue(null);
    }, 80);
    return () => window.clearInterval(timer);
  }, [active, ready, reduced, playing, kind, onDetail]);
  return <div className={styles.live} data-hero-live={kind} data-ready={ready} data-demo-time={seconds.toFixed(2)} data-demo-step={step} data-demo-order={orderReceived ? "received" : "none"} data-demo-cue={cue?.gesture ?? "none"} data-demo-slide={surface.slide} data-demo-popup={surface.popup} data-demo-request={surface.request} data-demo-scroll={surface.scroll} data-demo-actions={surface.actions}>
    {reduced ? <img className={styles.fallback} src={`/assets/hero-cafe-v1/screen-${kind === "counter" ? "matcha" : kind}.webp`} alt=""/> : <iframe ref={frame} src={SOURCES[kind]} title={`아티메뉴 ${kind === "phone" ? "모바일" : kind === "dining" ? "다이닝" : "태블릿"} 시연`} tabIndex={-1} aria-hidden="true" loading="eager" className={styles.preview} style={{ opacity: ready ? 1 : 0 }}/>} 
    {cue && active && playing && !reduced ? <span key={cue.id} className={styles.cue} data-gesture={cue.gesture} style={{ left: `${cue.x}%`, top: `${cue.y}%` }}>{cue.gesture !== "click" ? <><Hand/>{cue.gesture === "swipe-x" ? <ArrowLeftRight/> : <ArrowUpDown/>}</> : null}</span> : null}
  </div>;
}
