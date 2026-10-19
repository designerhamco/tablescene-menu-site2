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
  const callBackground = [...backgrounds].sort((a, b) => luminance(parseColor(b)!.rgb) - luminance(parseColor(a)!.rgb))[0] ?? LIGHT;
  const palette = [accent, ...inks.map(opaque).filter((c): c is string => Boolean(c))];
  const readableInk = (background: string, candidates: string[]) =>
    candidates.find(c => menuColorContrast(c, background) >= 4.5) ??
    ["#000000", LIGHT].sort((a, b) => menuColorContrast(b, background) - menuColorContrast(a, background))[0];
  const orderForeground = readableInk(accent, [callBackground, ...palette]);
  const callForeground = readableInk(callBackground, palette);
  return {
    "--menu-order-bg": accent,
    "--menu-order-ink": orderForeground,
    "--menu-order-border": menuColorContrast(accent, panel) >= 3 ? accent : orderForeground,
    "--menu-call-bg": callBackground,
    "--menu-call-ink": callForeground,
    "--menu-call-border": callForeground,
  };
}
