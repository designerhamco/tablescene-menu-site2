import type { ComponentProps } from "react";
import { cn } from "./utils";

export type InputGroupSize = "sm" | "md" | "lg" | "search";

/** One field boundary; text, units and sibling actions share the same center. */
export function InputGroup({ fieldSize = "md", className, ...props }: ComponentProps<"div"> & { fieldSize?: InputGroupSize }) {
  return <div data-slot="input-group" data-field-size={fieldSize} className={cn("site-field site-input-group", className)} {...props} />;
}

export function InputGroupInput({ className, ...props }: ComponentProps<"input">) {
  return <input data-slot="input-group-control" className={cn("site-input-group-control", className)} {...props} />;
}

export function InputGroupAddon({ className, ...props }: ComponentProps<"span">) {
  return <span data-slot="input-group-addon" className={cn("site-input-group-addon", className)} {...props} />;
}

export function InputGroupAction({ className, ...props }: ComponentProps<"span">) {
  return <span data-slot="input-group-action" className={cn("site-input-group-action", className)} {...props} />;
}
