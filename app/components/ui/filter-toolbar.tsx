import type { ReactNode } from "react";

/** Search keeps a bounded width; equal option tracks hug the widest control. */
export function FilterToolbar({ search, filters, tools, summary, filterLabel = "필터", collapseFiltersOnMobile = false, hideToolsOnMobile = false }: {
  search: ReactNode;
  filters: ReactNode[];
  tools?: ReactNode;
  summary?: ReactNode;
  filterLabel?: string;
  /** The search slot must provide an accessible compact filter entry when true. */
  collapseFiltersOnMobile?: boolean;
  /** Omit auxiliary tools and their grid track below the shared 768px boundary. */
  hideToolsOnMobile?: boolean;
}) {
  return <div className="site-filter-toolbar" data-mobile-filters={collapseFiltersOnMobile ? "collapsed" : "inline"} data-mobile-tools={hideToolsOnMobile ? "hidden" : undefined}>
    <div className="site-filter-toolbar-fields">
      <div className="site-filter-toolbar-search">{search}</div>
      <div className="site-filter-toolbar-options" data-filter-count={filters.length} role="group" aria-label={filterLabel}>{filters}</div>
    </div>
    {tools ? <div className="site-filter-toolbar-tools">{tools}</div> : null}
    {summary ? <div className="site-filter-toolbar-summary">{summary}</div> : null}
  </div>;
}
