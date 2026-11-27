import type { ReactNode } from "react";

/** A page can promote this title to its h1 while retaining the existing help, tools and label target. */
export function SectionHeader({ title, id, help, actions, titleHidden = false }: {
  title: ReactNode;
  id?: string;
  help?: ReactNode;
  actions?: ReactNode;
  titleHidden?: boolean;
}) {
  if (titleHidden && !id && !help && !actions) return null;
  const heading = titleHidden
    ? id ? <span id={id} className="sr-only">{title}</span> : null
    : <h2 id={id} className="type-section-title">{title}</h2>;
  return <header className="site-content-heading-row" data-layout="toolbar">
    <div className="site-action-row" data-wrap="nowrap">{heading}{help}</div>
    {actions ? <div className="site-field-stack">{actions}</div> : null}
  </header>;
}
