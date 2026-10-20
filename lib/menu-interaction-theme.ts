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
export function resolveMenuInteractionTheme({ brand, surfaces, inks = [] }: {
  brand: string; surfaces: string[]; inks?: string[];
}) {
  // Ignore transparent/invalid swatches; never sample photos or include site colors.
  const backgrounds = surfaces.map(opaque).filter((c): c is string => Boolean(c));
  const panel = backgrounds[0] ?? LIGHT;
  const parsed = parseColor(brand);
  const base = parseColor(panel)!.rgb;
  const accent = parsed ? hexColor(parsed.rgb.map((c, i) => c * parsed.alpha + base[i] * (1 - parsed.alpha)) as RGB) : DARK;
  const inksOnly = [accent, ...inks.map(opaque).filter((c): c is string => Boolean(c))];
  const palette = [...inksOnly, ...backgrounds];
  const sorted = [...palette].sort((a, b) => luminance(parseColor(a)!.rgb) - luminance(parseColor(b)!.rgb));
  const lightest = sorted.at(-1) ?? LIGHT;
  const darkest = sorted[0] ?? DARK;
  const readableInk = (background: string, candidates: string[]) =>
    candidates.find(c => menuColorContrast(c, background) >= 4.5) ??
    [DARK, LIGHT].sort((a, b) => menuColorContrast(b, background) - menuColorContrast(a, background))[0];
  const callForeground = readableInk(lightest, inksOnly);
  const orderBackground = menuColorContrast(darkest, lightest) >= 4.5 ? darkest : readableInk(lightest, [DARK]);
  const orderForeground = readableInk(orderBackground, [lightest, ...palette]);
  return {
    "--menu-order-bg": orderBackground,
    "--menu-order-ink": orderForeground,
    "--menu-order-border": orderBackground,
    "--menu-call-bg": lightest,
    "--menu-call-ink": callForeground,
    "--menu-call-border": callForeground,
    // Existing solid call circles retain the saved/rendered representative color.
    "--menu-call-circle-bg": accent,
    "--menu-call-circle-ink": readableInk(accent, [lightest, ...palette]),
  };
}
