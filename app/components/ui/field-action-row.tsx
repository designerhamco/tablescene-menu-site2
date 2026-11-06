import type { ReactNode } from "react";

/** A field and its committing action remain adjacent at every viewport width. */
export function FieldActionRow({ field, action }: { field: ReactNode; action: ReactNode }) {
  return <div className="site-field-action-row"><div className="site-field-stack">{field}</div>{action}</div>;
}
