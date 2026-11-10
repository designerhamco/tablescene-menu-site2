import { IMAGE_RADIUS_PRESETS, MENU_SHAPE_PRESETS } from "./menu-appearance";
import { MENU_TEXT_COLOR_GROUPS, type MenuTextColors, type MenuTextColorGroup } from "./menu-text-colors";

export type PreviewDesignSelection = { value: string; label?: string };
export type PreviewRenderedDesign = {
  nativeTextColors: MenuTextColors;
  alignment: PreviewDesignSelection;
  radius: PreviewDesignSelection;
};

/** The picker edits RGB ink; native alpha/opacity stays in the renderer until edited. */
export function previewCssColorHex(color: string): string | undefined {
  if (/^#[\da-f]{6}$/i.test(color)) return color.toUpperCase();
  const rgb = color.match(/^rgba?\(([^)]+)\)/i);
  const srgb = color.match(/^color\(srgb\s+([^)]+)\)/i);
  const channels = (rgb?.[1] ?? srgb?.[1])?.split(/[\s,/]+/).slice(0, 3);
  if (!channels || channels.length !== 3) return;
  const values = channels.map(channel => parseFloat(channel) * (srgb ? 255 : channel.includes("%") ? 2.55 : 1));
  if (values.some(value => !Number.isFinite(value))) return;
  return "#" + values.map(value => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, "0")).join("").toUpperCase();
}

export function previewRadiusSelection(images: (number|string)[], chips: (number|string)[]): PreviewDesignSelection {
  const unique = (values: (number|string)[]) => [...new Set(values.flatMap<number|string>(value => {
    if (typeof value === "number") return Number.isFinite(value) ? [Math.round(value * 100) / 100] : [];
    if (/^[\d.]+px$/.test(value)) return [Math.round(parseFloat(value) * 100) / 100];
    return value.trim() ? [value.trim()] : [];
  }))].sort((a,b) => typeof a === "number" && typeof b === "number" ? a-b : String(a).localeCompare(String(b)));
  const imageValues = unique(images), chipValues = unique(chips);
  const chipRadius = Object.values(MENU_SHAPE_PRESETS).map(preset => preset.chipRadius);
  const presets = IMAGE_RADIUS_PRESETS.filter(preset => preset.radius !== undefined);
  // A shared choice describes both image and chip shapes, not a guessed image size.
  const index = presets.findIndex((preset, i) => imageValues.length === 1 && imageValues[0] === preset.radius && chipValues.length <= 1 && (!chipValues.length || chipValues[0] === chipRadius[i]));
  if (index !== -1) return { value: presets[index].value };
  const range = (values: (number|string)[]) => values.length === 1 ? typeof values[0] === "number" ? `${values[0]}px` : values[0] : values.every(value => typeof value === "number") ? `${values[0]}–${values.at(-1)}px` : values.map(value => typeof value === "number" ? `${value}px` : value).join(", ");
  const parts = [imageValues.length ? `이미지 ${range(imageValues)}` : "", chipValues.length ? `칩 ${range(chipValues)}` : ""].filter(Boolean);
  return { value: "current", label: parts.join(" · ") || "표시 대상 없음" };
}

const samples: Record<MenuTextColorGroup, string[]> = {
  brand: [".cafe-a-store-title", ".aube-table-cover h1"],
  pageTitle: [".aube-table-page-header h1"],
  sectionDescription: [".aube-table-page-description", ".aube-table-course:not([data-course-priced=\"true\"]) .aube-table-course-description"],
  category: [".cafe-a-category-title", ".aube-table-course-header h2", ".aube-table-course-title h2"],
  price: [".aube-table-item-price", ".aube-table-course-price"],
  product: [".cafe-a-menu-title", ".aube-table-item-heading h3", ".cafe-a-featured-title"],
  representative: [".cafe-a-store-description", "[data-cafe-a-store-description]", ".cafe-a-topline-description", ".aube-table-cover-description", ".aube-table-cover-notices"],
  supporting: [".cafe-a-menu-description:not([data-cafe-a-category-description]):not(.cafe-a-store-description):not([data-cafe-a-store-description]):not(.cafe-a-time-sale-time-text)", ".cafe-a-menu-meta", ".aube-table-item-description", ".aube-table-item-secondary", ".aube-table-course[data-course-priced=\"true\"] .aube-table-course-description"],
  information: ["[data-cafe-a-footer-info] .cafe-a-description-text", ".cafe-a-topline-notice-text", ".cafe-a-round-focus-notice", ".cafe-a-mobile-notice-list .cafe-a-description-text", "[data-native-notices]", "[data-paged-notices]", "[data-cafe-a-widget-body]"],
};

/** Read a native color without changing the live menu, its data, or its fit inputs. */
function nativeColor(element: Element, group: MenuTextColorGroup, doc: Document): string | undefined {
  const win = doc.defaultView;
  if (!win) return;
  if (!element.closest(`[data-text-color-${group === "pageTitle" ? "page-title" : group === "sectionDescription" ? "section-description" : group}]`)) return previewCssColorHex(win.getComputedStyle(element).color);
  const ancestors: Element[] = [];
  for (let node: Element | null = element; node && node !== doc.body; node = node.parentElement) ancestors.unshift(node);
  if (!ancestors.length) return;
  let sample: HTMLElement | undefined, cursor: Element | undefined;
  for (const ancestor of ancestors) {
    const copy = ancestor.cloneNode(ancestor === element) as HTMLElement;
    copy.removeAttribute("id");
    if (group === "pageTitle" || group === "sectionDescription" || group === "price") copy.style.removeProperty(`--menu-text-${group}`);
    copy.removeAttribute(`data-text-color-${group === "pageTitle" ? "page-title" : group === "sectionDescription" ? "section-description" : group}`);
    if (!sample) sample = copy; else cursor!.append(copy);
    cursor = copy;
  }
  if (!sample || !cursor) return;
  sample.querySelectorAll("script,style,link").forEach(node => node.remove());
  sample.dataset.previewNativeSample = "";
  sample.inert = true;
  sample.setAttribute("aria-hidden", "true");
  Object.assign(sample.style, { position: "fixed", left: "-100000px", top: "0", width: `${ancestors[0].getBoundingClientRect().width}px`, visibility: "hidden", pointerEvents: "none" });
  try {
    doc.body.append(sample);
    return previewCssColorHex(win.getComputedStyle(cursor).color);
  } finally { sample.remove(); }
}

export function readPreviewRenderedDesign(doc: Document): PreviewRenderedDesign | undefined {
  const root = doc.querySelector("[data-menu-appearance]");
  const win = doc.defaultView;
  if (!root || !win || root.querySelector('[data-native-ready="false"]')) return;
  const visible = (element: Element) => {
    const style = win.getComputedStyle(element), rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none" && !element.closest('[aria-hidden="true"], [data-cafe-a-reference-copy]');
  };
  const pick = (selectors: string[]) => {
    for (const selector of selectors) {
      const found = [...root.querySelectorAll(selector)].find(visible);
      if (found) return found;
    }
  };
  const nativeTextColors: MenuTextColors = {};
  // Dining mounts one page at a time. Its inherited palette also describes
  // category/product/body copy before those pages have been opened.
  const dining = root.querySelector(".aube-table-root");
  if (dining) {
    const style = win.getComputedStyle(dining);
    const token = (...names: string[]) => names.map(name => previewCssColorHex(style.getPropertyValue(name).trim())).find(Boolean);
    nativeTextColors.brand = token("--menu-role-brand-color", "--aube-accent");
    nativeTextColors.pageTitle = token("--menu-role-category-color", "--aube-accent");
    nativeTextColors.sectionDescription = token("--menu-role-supporting-color", "--aube-muted");
    nativeTextColors.category = token("--menu-role-category-color", "--aube-ink");
    nativeTextColors.price = token("--menu-role-price-color", "--aube-accent");
    nativeTextColors.product = token("--menu-role-item-name-color", "--aube-ink");
    nativeTextColors.supporting = token("--aube-item-copy");
  }
  for (const group of MENU_TEXT_COLOR_GROUPS) {
    const element = pick(samples[group]);
    if (element) nativeTextColors[group] = nativeColor(element, group, doc);
  }
  const align = (element?: Element) => {
    if (!element) return;
    const style = win.getComputedStyle(element), value = style.textAlign;
    if (value === "start") return style.direction === "rtl" ? "right" : "left";
    if (value === "end") return style.direction === "rtl" ? "left" : "right";
    return ["left", "center", "right"].includes(value) ? value : undefined;
  };
  const brandAlign = align(pick(samples.brand)), descriptionAlign = align(pick(samples.representative));
  const labels: Record<string,string> = { left: "왼쪽", center: "가운데", right: "오른쪽" };
  const alignment = brandAlign && descriptionAlign && brandAlign !== descriptionAlign
    ? { value: "current", label: `가게명 ${labels[brandAlign]} · 설명 ${labels[descriptionAlign]}` }
    : { value: brandAlign ?? descriptionAlign ?? "current", ...(brandAlign || descriptionAlign ? {} : {label:"표시 대상 없음"}) };
  const radii = (selector: string) => [...root.querySelectorAll(selector)].filter(visible).map(element => win.getComputedStyle(element).borderTopLeftRadius);
  const images = radii(".ad-viewer-frame, .cafe-a-cover-frame, .cafe-a-cover-hero, .cafe-a-menu-item-image-slot, [data-cafe-a-widget-media], .aube-table-image-trigger");
  const chips = radii(".cafe-a-menu-badge, .cafe-a-featured-badge, .cafe-a-menu-chip, .cafe-a-sold-out-chip, .aube-table-sold-out");
  // Registered defaults and saved overrides also describe currently unmounted
  // Dining pages. Do not infer the preset from an unrelated full-bleed cover.
  const style = win.getComputedStyle(root);
  const resolvedImages = ["advertisement", ...(root.hasAttribute("data-radius-cover") ? ["cover"] : []), "item", "widget"]
    .map(key => style.getPropertyValue(`--menu-image-radius-${key}`).trim()).filter(Boolean);
  const resolvedChip = style.getPropertyValue("--menu-chip-radius").trim();
  return { nativeTextColors, alignment, radius: previewRadiusSelection(resolvedImages.length ? resolvedImages : images, resolvedChip ? [resolvedChip] : chips) };
}
