"use client";

import { useEffect, useState, type ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Accordion } from "@/app/components/ui/accordion";
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/app/components/ui/popover";

/** One compact mobile entry beside search; desktop retains the visible filter fields. */
export default function CatalogFilterSearch({ search, children }: { search: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const desktop = matchMedia("(min-width: 768px)");
    const closeOnDesktop = () => { if (desktop.matches) setOpen(false); };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);
  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverAnchor asChild><div className="site-catalog-search-row">
      {search}
      <div className="site-catalog-mobile-filters">
        <PopoverTrigger asChild><Button type="button" variant="outline" size="icon" iconAppearance="framed" aria-label="템플릿 필터" title="필터"><SlidersHorizontal aria-hidden="true" /></Button></PopoverTrigger>
      </div>
    </div></PopoverAnchor>
    <PopoverContent side="bottom" avoidCollisions={false} align="start" collisionPadding={16} className="site-catalog-mobile-filter-content" aria-label="템플릿 필터">
      <Accordion type="single" collapsible>{children}</Accordion>
    </PopoverContent>
  </Popover>;
}
