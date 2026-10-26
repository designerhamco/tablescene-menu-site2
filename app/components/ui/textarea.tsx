import * as React from "react";

import { cn } from "./utils";

function Textarea({ className, fieldSize = "md", ...props }: React.ComponentProps<"textarea"> & { fieldSize?: "sm" | "md" | "lg" }) {
  return (
    <textarea
      data-slot="textarea"
      data-field-size={fieldSize}
      className={cn(
        "site-field flex w-full min-w-0 px-3 py-2",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
