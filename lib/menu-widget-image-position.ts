import type { MenuWidgetAspectRatio, MenuWidgetObjectFit, MenuWidgetObjectPosition } from "./menu-widgets";

export type WidgetImagePositionAxis = "horizontal" | "vertical";

export function getWidgetImagePositionAxis(
  width: number,
  height: number,
  aspectRatio: MenuWidgetAspectRatio,
  fit: MenuWidgetObjectFit,
): WidgetImagePositionAxis | null {
  if (![width, height].every(value => Number.isFinite(value) && value > 0)) return null;
  const [frameWidth, frameHeight] = aspectRatio.split(":").map(Number);
  const frameRatio = frameWidth / frameHeight;
  const imageRatio = width / height;
  if (!Number.isFinite(frameRatio) || frameRatio <= 0 || Math.abs(imageRatio / frameRatio - 1) < 0.000001) return null;
  const imageIsWider = imageRatio > frameRatio;
  return (fit === "cover" ? imageIsWider : !imageIsWider) ? "horizontal" : "vertical";
}

const HORIZONTAL = ["center-left", "center", "center-right"] as const;
const VERTICAL = ["top-center", "center", "bottom-center"] as const;

export function getWidgetImagePositionOptions(axis: WidgetImagePositionAxis) {
  return axis === "horizontal" ? HORIZONTAL : VERTICAL;
}

export function getWidgetImagePositionOnAxis(position: MenuWidgetObjectPosition, axis: WidgetImagePositionAxis) {
  if (axis === "horizontal") {
    if (position.endsWith("left")) return "center-left";
    if (position.endsWith("right")) return "center-right";
  } else {
    if (position.startsWith("top")) return "top-center";
    if (position.startsWith("bottom")) return "bottom-center";
  }
  return "center";
}
