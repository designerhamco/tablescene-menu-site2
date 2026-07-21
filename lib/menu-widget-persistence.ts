import type { MenuWidget } from "@/lib/menu-widgets";

export type MenuWidgetDeletePlan = {
  widgetId: string;
  menuSiteId: string;
  menuPageId: string;
  imagePath: string | null;
};

export type MenuWidgetAssetChange = {
  widgetId: string;
  menuSiteId: string;
  menuPageId: string;
  previousImagePath: string | null;
  nextImagePath: string | null;
  shouldCleanupPreviousImage: boolean;
};

export function createMenuWidgetDeletePlan(widget: MenuWidget): MenuWidgetDeletePlan {
  return {
    widgetId: widget.id,
    menuSiteId: widget.menuSiteId,
    menuPageId: widget.menuPageId,
    imagePath: widget.imagePath,
  };
}

export function getMenuWidgetAssetChange(previous: MenuWidget, next: MenuWidget): MenuWidgetAssetChange {
  const previousImagePath = previous.imagePath;
  const nextImagePath = next.imagePath;

  return {
    widgetId: previous.id,
    menuSiteId: previous.menuSiteId,
    menuPageId: previous.menuPageId,
    previousImagePath,
    nextImagePath,
    shouldCleanupPreviousImage: Boolean(previousImagePath && previousImagePath !== nextImagePath),
  };
}
