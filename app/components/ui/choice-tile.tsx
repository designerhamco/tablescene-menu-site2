"use client";

import { useId, type ComponentProps, type ReactNode } from "react";
import { cn } from "./utils";

type ChoiceTileProps = Omit<ComponentProps<"button">, "children"> & {
  icon: ReactNode;
  label: string;
  description?: string;
  selected?: boolean;
  presentation?: "inline" | "feature";
};

/** A selectable control, not a content card. Tab callers retain their ARIA/keyboard contract. */
export function ChoiceTile({ icon, label, description, selected = false, presentation = "inline", className, role, ...props }: ChoiceTileProps) {
  const descriptionId = useId();
  return <button type="button" role={role} aria-label={label} aria-describedby={description ? descriptionId : undefined}
    aria-pressed={role === "tab" ? undefined : selected} data-selected={selected} data-presentation={presentation}
    className={cn("site-choice site-choice-tile", className)} {...props}>
    <span className="site-choice-tile-icon" aria-hidden="true">{icon}</span>
    <span className="site-choice-tile-copy"><span className="site-choice-tile-label">{label}</span>
      {description ? <span id={descriptionId} className="site-choice-tile-description">{description}</span> : null}
    </span>
  </button>;
}
