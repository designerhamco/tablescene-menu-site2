import edgeProfiles from "./hero-photo-edge-profiles.json";
import { HERO_CAFE_SCREENS } from "./hero-cafe-motion";

/** A centered 16:10 notebook frame scales with height, never ultrawide width. */
export function heroLandscapeFrame(width: number, height: number) {
  const frameWidth = Math.min(width, height * 1.6);
  return { width: frameWidth, left: (width - frameWidth) / 2 };
}

export function heroLandscapeScale(width: number, height: number) {
  return Math.max(heroLandscapeFrame(width, height).width / 1536, height / 1024);
}

/** Local frame coordinates preserve the authored notebook camera and device/UI plane. */
export function heroLandscapePosition(width: number, height: number, scale: number, focus: readonly number[]) {
  return {
    x: Math.min(0, Math.max(width - 1536 * scale, width * .66 - focus[0] * scale)),
    y: Math.min(0, Math.max(height - 1024 * scale, height * .53 - focus[1] * scale)),
  };
}

const televisionXs = HERO_CAFE_SCREENS.televisions.flatMap(quad => quad.map(([x]) => x));
const televisionLeft = Math.min(...televisionXs);
const televisionRight = Math.max(...televisionXs);

/** The opening's three televisions are centered as one group in the extended photo. */
export function heroOpeningCamera(width: number, height: number, desiredScale: number, focus: readonly number[]) {
  const frame = heroLandscapeFrame(width, height);
  const scale = Math.min(desiredScale, width * .94 / (televisionRight - televisionLeft));
  return {
    x: frame.width / 2 - (televisionLeft + televisionRight) / 2 * scale,
    y: heroLandscapePosition(frame.width, height, scale, focus).y,
    scale,
  };
}
const scenes = ["venue", "counter", "dining", "phone"] as const;
function compositionSources(profile: keyof typeof edgeProfiles.variants) {
  return Object.fromEntries(scenes.map(scene => [scene, `/assets/hero-cafe-v8/${scene}${profile === "normal" ? "" : `-${profile}`}-composition.svg`])) as Record<typeof scenes[number], string>;
}

/** One finished photo; browser-selected edges never change the camera or source pixels. */
export const HERO_COMPOSITIONS = compositionSources("normal");
export const HERO_RESPONSIVE_COMPOSITIONS = (["ultrawide", "wide"] as const).map(profile => ({
  profile,
  media: edgeProfiles.variants[profile].media,
  sources: compositionSources(profile),
}));
