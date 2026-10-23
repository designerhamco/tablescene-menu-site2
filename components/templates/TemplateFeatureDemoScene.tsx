"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import MenuPageRenderer from "@/components/menu/MenuPageRenderer";
import { DETAIL_FEATURES, type DetailFeatureId } from "@/lib/template-detail-features";
import type { MenuPageData } from "@/lib/menu-page-data";
import { applyTemplatePreviewOptions } from "@/lib/template-preview-data";
import { buildInteractivePreviewConfig } from "@/lib/preview-order-config";
import { readMenuAppearance } from "@/lib/menu-appearance";
import { getTemplateCapabilities } from "@/lib/template-capabilities";
import type { MenuWidget } from "@/lib/menu-widgets";
import styles from "./template-feature-demo-scene.module.css";

/** Only the catalog detail's isolated iframe imports this player. All actions use previewOnly. */
export default function TemplateFeatureDemoScene({ source, feature }: { source: MenuPageData; feature: DetailFeatureId }) {
  const definition = DETAIL_FEATURES.find(item => item.id === feature)!;
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [revision, setRevision] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [ready, setReady] = useState(false);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const duration = feature === "order" || feature === "call" ? 6500 : 4500;
  const categoryPrices = Boolean(getTemplateCapabilities(source.menuSite.template_key).supportsBasicPriceColumns);

  useEffect(() => {
    // Avoid leaving disposable demonstration carts in the normal preview session.
    const clear = () => {
      try {
        for (const key of Object.keys(sessionStorage)) if (key.startsWith(`artimenu-preview-cart:detail-demo-${feature}-`) || key.startsWith(`artimenu-preview-order-history:detail-demo-${feature}-`)) sessionStorage.removeItem(key);
      } catch {}
    };
    clear();
    return clear;
  }, [feature, revision]);

  useEffect(() => {
    let cancelled = false;
    async function prepare() {
      await document.fonts.ready;
      await Promise.all([...document.images].map(image => image.decode().catch(() => {})));
      if (cancelled) return;
      setReady(true);
      window.parent.postMessage({ type: "template-feature-status", ready: true }, location.origin);
    }
    void prepare();
    const receive = (event: MessageEvent) => {
      if (event.origin !== location.origin || event.source !== parent || event.data?.type !== "template-feature-command") return;
      if (typeof event.data.playing === "boolean") setPlaying(event.data.playing);
      if (Number.isInteger(event.data.step) && event.data.step >= 0 && event.data.step < definition.steps.length) {
        setStep(event.data.step);
        setElapsed(0);
        setRevision(value => value + 1);
      }
    };
    window.addEventListener("message", receive);
    return () => { cancelled = true; window.removeEventListener("message", receive); };
  }, [definition.steps.length]);

  useEffect(() => {
    if (!ready || !playing) return;
    const timer = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      setElapsed(value => value + 100);
    }, 100);
    return () => clearInterval(timer);
  }, [ready, playing]);

  useEffect(() => {
    if (elapsed < duration) return;
    // A new stage is a fresh deterministic example, including simulated cart/history.
    const timer = setTimeout(() => { setStep(value => (value + 1) % definition.steps.length); setElapsed(0); setRevision(value => value + 1); }, 0);
    return () => clearTimeout(timer);
  }, [elapsed, duration, definition.steps.length]);

  useEffect(() => {
    window.parent.postMessage({ type: "template-feature-status", step }, location.origin);
  }, [step]);

  const typing = feature === "prices" && step === 3 ? categoryPrices ? "ICE ONLY" : "잔으로 즐기기" : feature === "sale" && step === 2 ? "오늘의 특가" : "";
  const typed = typing.slice(0, playing ? Math.floor(elapsed / 140) : typing.length);
  const radius = feature === "images" && step >= 2 ? step === 3 || !playing ? 24 : [0, 8, 16, 24][Math.min(3, Math.floor(elapsed / 800))] : 0;
  const data = useMemo(() => {
    const base = structuredClone(source);
    // Keep this instructional sample short so every demonstrated change is visible on a tablet.
    const categories = base.categories.filter(category => !category.course_price && !category.course_price_label).slice(0, 2);
    if (categories.length) {
      base.categories = categories;
      base.items = categories.flatMap(category => base.items.filter(item => item.category_id === category.id).slice(0, 3));
      base.pages = base.pages.filter(page => categories.some(category => category.menu_page_id === page.id));
    }
    const ids = new Set(base.items.map(item => item.id));
    base.priceOptions = base.priceOptions.filter(option => ids.has(option.menu_item_id));
    base.featuredSlides = base.featuredSlides?.slice(0, 1);
    if (base.featuredSlides?.[0]) base.featuredSlides[0].featuredItemId = base.items[0]?.id ?? null;
    base.pageSettings.featured_item_id = base.items[0]?.id ?? null;
    base.timeSales = [];
    if (feature === "prices") {
      base.priceOptions = [];
      base.categories.forEach(category => { category.priceColumns = []; });
      base.items.forEach(item => { item.priceColumnValues = []; });
    }
    const next = applyTemplatePreviewOptions(base, {
      coverPreview: feature === "cover" && step > 0 ? "on" : "off",
      coverImagesPreview: "on", featuredPreview: "off", logoPreview: "off",
      imagesPreview: feature === "images" && step > 0 ? "on" : "off",
      priceOptionsPreview: feature === "prices" && step > 0 && (!categoryPrices || step < 3) ? "on" : "off",
      priceNotesPreview: "off", timeSalesPreview: feature === "sale" && step > 0 ? "on" : "off",
      widgetsPreview: "off", popupPreview: feature === "ads" && step > 0 ? "on" : "off", soldOutPreview: "off",
    });
    // This ID is private to the disposable scene; it never shares the normal preview cart.
    next.menuSite.id = `detail-demo-${feature}-${revision}`;
    if (feature === "images") {
      const photo = source.items.find(item => item.image_url)?.image_url || source.featuredSlides?.[0]?.imageUrl || "/menu-templates/cafe_design_a/real-matcha-latte-featured.jpg";
      for (const item of next.items) item.image_url = source.items.find(original => original.id === item.id)?.image_url || photo;
      if (step === 0) for (const item of next.items) item.image_url = null;
      const appearance = readMenuAppearance(next.menuSite.page_settings);
      appearance.imageRadii.item = radius;
      const saved = next.menuSite.page_settings as Record<string, unknown>;
      next.menuSite.page_settings = { ...saved, design: { ...(saved.design as Record<string, unknown>), appearance } } as typeof next.menuSite.page_settings;
    }
    if (feature === "prices" && step === 2) {
      if (!categoryPrices && next.items[0]) next.priceOptions = ["SMALL", "TALL", "LARGE"].map((label, index) => ({ id: `detail-size-${index}`, menu_item_id: next.items[0].id, label, price: (next.items[0].price ?? 5000) + index * 500, price_label: null, sort_order: index, visible: true }));
      for (const category of next.categories.filter(category => category.priceColumns.length)) {
        const labels = ["SMALL", "TALL", "LARGE"];
        category.priceColumns = labels.map((label, index) => ({ ...category.priceColumns[0], id: `${category.id}-size-${index}`, key: label.toLowerCase(), label, sortOrder: index }));
        for (const item of next.items.filter(item => item.category_id === category.id)) item.priceColumnValues = category.priceColumns.map((column, index) => ({ id: `${item.id}-${column.id}`, priceColumnId: column.id, price: (item.price ?? 5000) + index * 500, priceLabel: null, visible: true }));
      }
    }
    if (feature === "prices" && step === 3 && next.items[0]) {
      if (categoryPrices) next.items[0].priceNote = typed;
      else if (next.priceOptions[0]) next.priceOptions[0].label = typed;
    }
    if (feature === "sale") for (const sale of next.timeSales) {
      sale.badgeText = step === 2 ? typed || " " : "오늘의 특가";
      sale.displayText = null;
      sale.timeDisplayMode = "countdown";
      sale.endsAt = new Date(source.initialNowMs + 125000).toISOString();
    }
    if (feature === "widgets" && step > 0 && next.pages[0]) {
      const common = { id: "detail-demo-widget", menuSiteId: next.menuSite.id, menuPageId: next.pages[0].id, sortOrder: 1000, visible: true };
      const media = { schemaVersion: 1 as const, aspectRatio: "3:1" as const, objectFit: "contain" as const, objectPosition: "center" as const, placement: "bottom" as const, altText: "매장 이벤트 안내" };
      const image = "/menu-templates/cafe_round_focus_a/cheese-platter.jpg";
      const copy = { title: "매장에서 전하는 작은 소식", description: "시즌 한정 메뉴를 만나보세요. 맛있는 순간을 함께 나눠요." };
      const widget: MenuWidget = step === 1 ? { ...common, type: "image", imageUrl: image, imagePath: null, title: null, description: null, settings: media }
        : step === 2 ? { ...common, type: "text", imageUrl: null, imagePath: null, ...copy, settings: { schemaVersion: 1, textAlign: "left", placement: "bottom" } }
        : { ...common, type: "image_text", imageUrl: image, imagePath: null, ...copy, settings: { ...media, textAlign: "left" } };
      next.widgets = [widget];
    }
    if (feature === "ads") {
      const settings = next.menuSite.settings as Record<string, unknown>;
      settings.advertisementPopup = { enabled: step > 0, images: ["real-matcha-menu-featured.jpg", "real-matcha-latte-featured.jpg", "real-matcha-cream-latte-featured.jpg"].map(file => ({ imageUrl: `/menu-templates/cafe_design_a/${file}`, imagePath: null })) };
    }
    return next;
  }, [source, feature, step, revision, typed, radius, categoryPrices]);
  const config = useMemo(() => {
    const value = buildInteractivePreviewConfig(data, feature === "call", feature === "order");
    if (value) { value.checkoutModes = ["postpay"]; value.cartScope = `detail-demo-${revision}`; }
    return value;
  }, [data, feature, revision]);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const schedule = (delay: number, action: () => void) => { timers.push(setTimeout(() => { if (!cancelled) action(); }, delay)); };
    function click(selector: string, text?: string) {
      const element = [...document.querySelectorAll<HTMLButtonElement>(selector)].find(button => {
        const rect = button.getBoundingClientRect();
        return !button.disabled && (!text || button.textContent?.includes(text)) && rect.width > 0 && rect.right > 0 && rect.left < innerWidth && rect.bottom > 0 && rect.top < innerHeight && getComputedStyle(button).visibility !== "hidden";
      });
      if (!element) return;
      const bounds = element.getBoundingClientRect();
      setPointer({ x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 });
      element.click();
    }
    if (feature === "images" && step === 3) schedule(700, () => click('button[aria-label$="이미지 크게 보기"]'));
    if (feature === "ads" && step > 1) schedule(800, () => click(`[data-popup-dots] button:nth-child(${step})`));
    if (feature === "call" && step > 0) {
      schedule(700, () => click('button[aria-label="직원 호출"], button[aria-label="직원 호출하기"]'));
      schedule(1400, () => click('[aria-label="직원 호출 항목"] button', "물"));
      if (step >= 2) schedule(2300, () => click("[data-smart-call-submit]"));
    }
    if (feature === "order") {
      schedule(700, () => click("[data-menu-order-add]"));
      schedule(1500, () => click('[role="dialog"] button', "장바구니 담기"));
      if (step > 0) schedule(2400, () => click('[data-scroll-order], button[aria-label^="장바구니"], button[aria-label^="주문하기, 장바구니"]'));
      if (step > 1) schedule(3400, () => click('[data-menu-cart] button', "후불로 주문하기"));
      if (step > 2) schedule(4300, () => click('[data-tab="history"]'));
    }
    return () => { cancelled = true; timers.forEach(clearTimeout); };
  }, [feature, step, revision, ready]);

  const camera = feature === "sale" && step >= 2;
  return <div className={styles.scene} data-detail-demo-scene={feature} data-scene-step={step} data-scene-ready={ready}>
    <div ref={root} className={styles.menu} data-zoom={camera || undefined}>
      <MenuPageRenderer key={`${feature}-${revision}`} mode="preview" {...data} previewDevice="tablet" previewMotionPaused={!playing} pagePresentation="one" initialPreviewPageId={feature === "cover" ? null : data.pages[0]?.id} orderCallConfig={config} />
    </div>
    {typing ? <div className={styles.editor}><span>{feature === "prices" ? "메뉴 관리 · 가격 설명" : "기간 할인 텍스트칩"}</span><strong>{typed || " "}<i aria-hidden="true" /></strong></div> : null}
    {feature === "images" && step === 2 ? <div className={styles.editor}><span>메뉴 관리 · 이미지 모서리</span><strong>{radius}px <span className={styles.radiusSample} style={{ borderRadius: radius }} /></strong></div> : null}
    {pointer && (feature === "call" || feature === "order" || (feature === "images" && step === 3)) ? <span className={styles.pointer} style={{ left: pointer.x, top: pointer.y }} aria-hidden="true" /> : null}
  </div>;
}
