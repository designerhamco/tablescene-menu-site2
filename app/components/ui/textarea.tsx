import * as React from "react";

import { cn } from "./utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "site-field flex w-full min-w-0 px-3 py-2",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
