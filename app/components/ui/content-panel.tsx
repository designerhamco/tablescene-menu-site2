import type { ComponentPropsWithoutRef } from "react";

type ContentPanelProps = Omit<ComponentPropsWithoutRef<"section">, "className" | "style"> & {
  as?: "section" | "article" | "aside" | "div";
  surface?: "white" | "muted" | "notice";
  density?: "default" | "compact";
};

/** Work surfaces own their paint, padding and child rhythm; callers choose roles. */
export function ContentPanel({ as: Tag = "section", surface = "white", density = "default", children, ...props }: ContentPanelProps) {
  return <Tag {...props} className="site-content-panel" data-surface={surface} data-density={density}>{children}</Tag>;
}
