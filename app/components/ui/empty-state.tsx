import type { ReactNode } from "react";
import { cn } from "./utils";

export function EmptyState({ icon, title, description, action, className, headingLevel = 2 }: {
  icon: ReactNode; title: string; description: ReactNode; action?: ReactNode; className?: string; headingLevel?: 2 | 3 | 4;
}) {
  const Heading = `h${headingLevel}` as "h2" | "h3" | "h4";
  return <section className={cn("site-empty-state site-empty-state-spacious", className)}>
    <span className="site-empty-state-icon" aria-hidden="true">{icon}</span>
    <Heading className="type-content-title">{title}</Heading>
    <p className="type-body site-empty-state-description">{description}</p>
    {action ? <div className="site-empty-state-action">{action}</div> : null}
  </section>;
}
