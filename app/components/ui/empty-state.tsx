import type { ReactNode } from "react";
import { cn } from "./utils";

export function EmptyState({ icon, title, description, action, className }: {
  icon: ReactNode; title: string; description: ReactNode; action?: ReactNode; className?: string;
}) {
  return <section className={cn("site-empty-state site-empty-state-spacious", className)}>
    <span className="site-empty-state-icon" aria-hidden="true">{icon}</span>
    <h2 className="type-content-title">{title}</h2>
    <p className="type-body site-empty-state-description">{description}</p>
    {action ? <div className="site-empty-state-action">{action}</div> : null}
  </section>;
}
