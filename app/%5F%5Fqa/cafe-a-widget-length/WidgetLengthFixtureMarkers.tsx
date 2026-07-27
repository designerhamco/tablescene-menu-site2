"use client";

import { useEffect } from "react";

import type { CafeAWidgetLengthFixtureMeta } from "@/lib/template-demo-data/cafe-a-widget-length-fixture";

type WidgetLengthFixtureMarkersProps = {
  widgets: CafeAWidgetLengthFixtureMeta[];
};

export default function WidgetLengthFixtureMarkers({ widgets }: WidgetLengthFixtureMarkersProps) {
  useEffect(() => {
    const widgetElements = Array.from(document.querySelectorAll<HTMLElement>("[data-cafe-a-menu-widget-block]"));

    widgetElements.forEach((element, index) => {
      const widget = widgets[index % widgets.length];
      if (!widget) return;

      element.setAttribute("data-fixture-widget-index", String(widget.index));
      element.setAttribute("data-fixture-widget-id", widget.widgetId);
      element.setAttribute("data-fixture-title-utf16-length", String(widget.titleUtf16Length));
      element.setAttribute("data-fixture-title-codepoint-length", String(widget.titleCodepointLength));
      element.setAttribute("data-fixture-body-utf16-length", String(widget.bodyUtf16Length));
      element.setAttribute("data-fixture-body-codepoint-length", String(widget.bodyCodepointLength));
    });
  }, [widgets]);

  return null;
}
