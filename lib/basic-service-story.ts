export const BASIC_INTRO_TRAVEL = 1.6;
export const BASIC_FEATURE_TRAVEL = 1.2;
export const BASIC_FEATURE_COUNT = 8;
export const BASIC_STORY_TRAVEL = BASIC_INTRO_TRAVEL + BASIC_FEATURE_COUNT * BASIC_FEATURE_TRAVEL;
export const BASIC_STORY_SVH = (1 + BASIC_STORY_TRAVEL) * 100;

const clamp = (value: number) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
function ease(value: number, from: number, to: number) {
  const t = clamp((value - from) / (to - from));
  return t * t * (3 - 2 * t);
}

/** Pure scroll positions: stopping holds the image; reversing restores every entrance. */
export function basicStoryAt(progress: number) {
  const position = clamp(progress) * BASIC_STORY_TRAVEL;
  return {
    chapter: position < BASIC_INTRO_TRAVEL ? -1 : Math.min(BASIC_FEATURE_COUNT - 1, Math.floor((position - BASIC_INTRO_TRAVEL) / BASIC_FEATURE_TRAVEL)),
    introCopy: ease(position, 0, .28),
    tablet: ease(position, .24, .94),
    intro: 1 - ease(position, BASIC_INTRO_TRAVEL - .16, BASIC_INTRO_TRAVEL + .16),
    features: Array.from({ length: BASIC_FEATURE_COUNT }, (_, index) => {
      const start = BASIC_INTRO_TRAVEL + index * BASIC_FEATURE_TRAVEL;
      const enter = ease(position, start - .16, start + .16);
      return index === BASIC_FEATURE_COUNT - 1 ? enter : enter * (1 - ease(position, start + BASIC_FEATURE_TRAVEL - .16, start + BASIC_FEATURE_TRAVEL + .16));
    }),
  };
}
