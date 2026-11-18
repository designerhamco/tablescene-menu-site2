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
