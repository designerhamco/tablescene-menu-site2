import * as React from "react";

import { cn } from "./utils";

function Input({ className, type, fieldSize = "md", ...props }: React.ComponentProps<"input"> & { fieldSize?: "sm" | "md" | "lg" }) {
  return (
    <input
      type={type}
      data-slot="input"
      data-field-size={fieldSize}
      className={cn(
        "site-field flex w-full min-w-0 px-3 py-2 file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-copy file:font-medium",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
