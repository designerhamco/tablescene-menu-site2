"use client";

import { useId, type ReactNode } from "react";
import { ChevronDown, ChevronUp } from "@/app/components/ui/site-arrow";
import { Button } from "./button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./collapsible";
import { ContentPanel } from "./content-panel";

/** A single list surface; editing controls stay behind an explicit, keyboard-accessible action. */
export function EditableList({ label, children }: { label: string; children: ReactNode }) {
  return <ContentPanel><ul aria-label={label} className="site-stack-block">{children}</ul></ContentPanel>;
}

export function EditableListItem({ label, title, status, meta, open, onOpenChange, divided = false, disabled = false, children }: {
  label: string; title: ReactNode; status: ReactNode; meta?: ReactNode; open: boolean;
  onOpenChange: (open: boolean) => void; divided?: boolean; disabled?: boolean; children: ReactNode;
}) {
  const titleId = useId();
  return <Collapsible asChild open={open} onOpenChange={onOpenChange}>
    <li aria-labelledby={titleId} className={divided ? "site-stack-block site-content-divider" : "site-stack-block"}>
      <div className="site-action-row" data-distribution="between">
        <div className="site-editable-list-title site-stack-copy">
          <h3 id={titleId} className="type-item-title break-words">{title}</h3>
          {meta ? <p className="type-caption site-copy-subtle">{meta}</p> : null}
        </div>
        <div className="site-action-row">
          {status}
          <CollapsibleTrigger asChild><Button type="button" variant="outline" size="compact" disabled={disabled} aria-label={`${label} ${open ? "편집 접기" : "편집"}`}>
            {open ? "접기" : "편집"}{open ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
          </Button></CollapsibleTrigger>
        </div>
      </div>
      <CollapsibleContent forceMount hidden={!open}>
        <div className="site-stack-group site-content-divider">{children}</div>
      </CollapsibleContent>
    </li>
  </Collapsible>;
}
