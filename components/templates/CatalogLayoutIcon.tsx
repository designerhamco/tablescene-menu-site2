import { LayoutGrid } from "lucide-react";
import type { CatalogLayoutFilter } from "@/lib/catalog-designs";

export default function CatalogLayoutIcon({ layout, className }: {
  layout: CatalogLayoutFilter;
  className?: string;
}) {
  if (layout === "all") return <LayoutGrid className={className} aria-hidden="true" />;
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}
      className={className} aria-hidden="true" focusable="false" data-catalog-layout-icon={layout}>
      {layout === "list" ? <>
        <g fill="currentColor" stroke="none">
          <circle cx="3" cy="5" r="1.5" /><circle cx="3" cy="12" r="1.5" /><circle cx="3" cy="19" r="1.5" />
        </g>
        <path d="M8 5h13M8 12h13M8 19h13" strokeWidth="2.8" strokeLinecap="round" />
      </> : <>
        <path d="M4 1.5h16v21H4zM7 4.5h4v5H7zM13 4.5h4v5h-4zM7 12h4v5H7zM13 12h4v5h-4z" />
        <path d="m7 9 4-4m2 4 4-4M7 16.5l4-4M13 16.5l4-4M7 19.5h4m2 0h4" strokeWidth="1.3" />
        <g fill="currentColor" stroke="none">
          <circle cx="8.4" cy="6" r=".55" /><circle cx="14.4" cy="6" r=".55" />
          <circle cx="8.4" cy="13.5" r=".55" /><circle cx="14.4" cy="13.5" r=".55" />
        </g>
      </>}
    </svg>
  );
}
