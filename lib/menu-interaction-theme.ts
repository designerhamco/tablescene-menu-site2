/** Menu operations use the rendered menu palette, independently of the site UI. */
type RGB = [number, number, number];
const DARK = "#191c1b";
const LIGHT = "#ffffff";
function parseColor(value: string): { rgb: RGB; alpha: number } | null {
  const text = value.trim().toLowerCase();
  if (text === "transparent") return { rgb: [0, 0, 0], alpha: 0 };
  const hex = text.match(/^#([a-f\d]{3,4}|[a-f\d]{6}|[a-f\d]{8})$/i)?.[1];
  if (hex) {
    const full = hex.length < 5 ? [...hex].map(c => c + c).join("") : hex;
    return { rgb: [0, 2, 4].map(i => parseInt(full.slice(i, i + 2), 16)) as RGB,
      alpha: full.length === 8 ? parseInt(full.slice(6), 16) / 255 : 1 };
  }
  const match = text.match(/^rgba?\(([^)]+)\)$/);
  if (!match) return null;
  const parts = match[1].split(/[,\s/]+/).filter(Boolean);
  if (parts.length < 3 || parts.length > 4) return null;
  const channels = parts.map((part, i) => Number.parseFloat(part) * (part.endsWith("%") ? (i < 3 ? 2.55 : .01) : 1));
  if (channels.some(n => !Number.isFinite(n))) return null;
  return { rgb: channels.slice(0, 3).map(n => Math.max(0, Math.min(255, n))) as RGB,
    alpha: Math.max(0, Math.min(1, channels[3] ?? 1)) };
}
function luminance(rgb: RGB) {
  const linear = rgb.map(c => c / 255).map(c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4);
  return linear[0] * .2126 + linear[1] * .7152 + linear[2] * .0722;
}
function hexColor(rgb: RGB) { return "#" + rgb.map(c => Math.round(c).toString(16).padStart(2, "0")).join(""); }
function opaque(value: string) {
  const c = parseColor(value);
  return c && c.alpha === 1 ? hexColor(c.rgb) : null;
}
export function menuColorContrast(first: string, second: string) {
  const a = luminance(parseColor(first)?.rgb ?? [25, 28, 27]);
  const b = luminance(parseColor(second)?.rgb ?? [255, 255, 255]);
  return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
}
export function resolveMenuInteractionTheme({ category, pageTitle, surfaces, inks = [] }: {
  category: string; pageTitle?: string; surfaces: string[]; inks?: string[];
}) {
  // Ignore transparent/invalid swatches; never sample photos or include site colors.
  const backgrounds = surfaces.map(opaque).filter((c): c is string => Boolean(c));
  const panel = backgrounds[0] ?? LIGHT;
  const parsed = parseColor(pageTitle ?? category);
  const base = parseColor(panel)!.rgb;
  const accent = parsed ? hexColor(parsed.rgb.map((c, i) => c * parsed.alpha + base[i] * (1 - parsed.alpha)) as RGB) : DARK;
  const inksOnly = [accent, ...inks.map(opaque).filter((c): c is string => Boolean(c))];
  const palette = [...inksOnly, ...backgrounds];
  const sorted = [...palette].sort((a, b) => luminance(parseColor(a)!.rgb) - luminance(parseColor(b)!.rgb));
  const lightest = sorted.at(-1) ?? LIGHT;
  const readableInk = (background: string, candidates: string[]) =>
    candidates.find(c => menuColorContrast(c, background) >= 4.5) ??
    [DARK, LIGHT, "#000000"].find(color => menuColorContrast(color, background) >= 4.5) ?? DARK;
  const orderBackground = accent;
  // Prefer bright menu ink when readable. On a light fill, try the darkest
  // configured menu swatch first; neutral fallback is only the final option.
  const orderForeground = readableInk(orderBackground, [lightest, ...sorted]);
  const callCircleForeground = readableInk(accent, [lightest]);
  return {
    "--menu-order-bg": orderBackground,
    "--menu-order-ink": orderForeground,
    "--menu-order-border": orderBackground,
    "--menu-call-bg": lightest,
    "--menu-call-ink": accent,
    "--menu-call-border": accent,
    // Dining passes page-title ink as its accent. Basic retains category ink.
    // Circular Call matches Order, while its
    // label/icon use the lightest readable menu color.
    "--menu-call-circle-bg": accent,
    "--menu-call-circle-ink": callCircleForeground,
    "--menu-call-circle-border": accent,
  };
}

/** Prefer the requested copy ink, then real menu swatches by surface brightness. */
export function resolveMenuToolsInk({ preferred, surface, palette = [] }: {
  preferred: string; surface: string; palette?: string[];
}) {
  const background = opaque(surface) ?? LIGHT;
  const ink = opaque(preferred);
  if (ink && menuColorContrast(ink, background) >= 4.5) return ink;
  const candidates = [...new Set(palette.map(opaque).filter((c): c is string => Boolean(c)))];
  const darkSurface = luminance(parseColor(background)!.rgb) < .179;
  candidates.sort((a, b) => (luminance(parseColor(a)!.rgb) - luminance(parseColor(b)!.rgb)) * (darkSurface ? -1 : 1));
  return candidates.find(color => menuColorContrast(color, background) >= 4.5)
    ?? (menuColorContrast(LIGHT, background) > menuColorContrast(DARK, background) ? LIGHT : DARK);
}

/** Composite a cover overlay over a sampled photo without inventing new menu ink. */
export function compositeMenuSurface(background: string, overlay: string, opacity = 1) {
  const base = parseColor(background)?.rgb ?? [255, 255, 255];
  const foreground = parseColor(overlay);
  if (!foreground) return hexColor(base as RGB);
  const alpha = foreground.alpha * Math.max(0, Math.min(1, opacity));
  return hexColor(foreground.rgb.map((c, i) => c * alpha + base[i] * (1 - alpha)) as RGB);
}
