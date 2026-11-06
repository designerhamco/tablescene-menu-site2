"use client";

import { useId, type ReactNode } from "react";

/** Related settings stay in one row; category boundaries are shared, not per page. */
export function ControlCategoryRow({ label, children }: { label: string; children: ReactNode }) {
  return <div className="site-control-category-row" role="group" aria-label={label}>{children}</div>;
}

export function ControlCategory({ title, children }: { title: string; children: ReactNode }) {
  const titleId = useId();
  return <div className="site-control-category" role="group" aria-labelledby={titleId}>
    <h4 id={titleId} className="type-content-title">{title}</h4>
    {children}
  </div>;
}
