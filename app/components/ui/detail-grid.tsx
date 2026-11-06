import type { ReactNode } from "react";

/** Read-only facts stay on one surface; values never become nested cards. */
export function DetailGrid({ children, columns = 2 }: { children: ReactNode; columns?: 2 | 3 | 4 }) {
  return <dl className="site-detail-grid" data-columns={columns}>{children}</dl>;
}

export function DetailField({ label, children, full = false }: { label: ReactNode; children: ReactNode; full?: boolean }) {
  return (
    <div className="site-detail-field" data-full={full || undefined}>
      <dt className="type-label site-copy-muted">{label}</dt>
      <dd className="type-body">{children}</dd>
    </div>
  );
}
