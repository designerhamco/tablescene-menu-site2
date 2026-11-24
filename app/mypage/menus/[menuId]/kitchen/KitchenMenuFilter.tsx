"use client";

import { useId } from "react";

import { Button } from "@/app/components/ui/button";
import { Checkbox } from "@/app/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/app/components/ui/collapsible";
import { Popover, PopoverContent, PopoverTrigger } from "@/app/components/ui/popover";
import { CaretDown } from "@/app/components/ui/site-arrow";
import { FilterFill } from "@/app/components/ui/site-icon";
import type { KitchenMenuGroup } from "@/lib/kitchen-order";
import styles from "./KitchenMenuFilter.module.css";

export default function KitchenMenuFilter({ groups, selection, onChange, iconOnly }: {
  iconOnly?: boolean;
  groups: KitchenMenuGroup[];
  selection: ReadonlySet<string> | null;
  onChange: (keys: string[] | null) => void;
}) {
  const headingId = useId();
  const keys = groups.flatMap(group => group.items.map(item => item.key));
  const selectedCount = selection ? keys.filter(key => selection.has(key)).length : keys.length;
  const allChecked = selectedCount === keys.length;
  const allState = allChecked ? true : selectedCount > 0 ? "indeterminate" : false;

  function toggleItem(key: string, checked: boolean) {
    const next = new Set(keys.filter(value => !selection || selection.has(value)));
    if (checked) next.add(key);
    else next.delete(key);
    onChange(next.size === keys.length ? null : [...next]);
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        {iconOnly ? (
          <Button variant="ghost" size="icon" iconSize="compact" aria-label="메뉴 필터" disabled={!keys.length}><FilterFill /></Button>
        ) : (
          <Button variant="outline" size="compact" disabled={!keys.length}>메뉴 필터 <FilterFill /></Button>
        )}
      </PopoverTrigger>
      <PopoverContent className={styles.popup} side={iconOnly ? "bottom" : "top"} align="end" collisionPadding={12} aria-labelledby={headingId}>
        <div id={headingId} className={`${styles.title} type-label`}>
          <FilterFill size={16} /> 메뉴 필터
        </div>
        <label className={`${styles.option} type-label`}>
          <Checkbox shape="circle" checked={allState} onCheckedChange={() => onChange(allChecked ? [] : null)} />
          <span>전체</span>
        </label>
        {groups.map((group, index) => (
          <Collapsible key={group.id} defaultOpen={index === 0} className={styles.category}>
            <CollapsibleTrigger type="button" className={`${styles.categoryTrigger} type-label`}>
              <span>{group.name}</span><CaretDown size={18} />
            </CollapsibleTrigger>
            <CollapsibleContent className={styles.categoryItems}>
              {group.items.map(item => (
                <label key={item.key} className={`${styles.option} type-body-sm`}>
                  <Checkbox shape="circle" checked={!selection || selection.has(item.key)}
                    onCheckedChange={value => toggleItem(item.key, value === true)} />
                  <span>{item.name}</span>
                </label>
              ))}
            </CollapsibleContent>
          </Collapsible>
        ))}
      </PopoverContent>
    </Popover>
  );
}
