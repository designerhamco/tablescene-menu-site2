"use client";

import { useId, type ReactNode } from "react";

import { Button } from "@/app/components/ui/button";
import { Checkbox } from "@/app/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/app/components/ui/popover";
import { FilterFill } from "@/app/components/ui/site-icon";
import { SearchField } from "@/app/components/ui/search-field";
import { RefreshButton } from "@/app/components/ui/refresh-button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { KITCHEN_STAGES, KITCHEN_STAGE_LABELS, type KitchenStage } from "@/lib/kitchen-order";

import filterStyles from "./KitchenMenuFilter.module.css";

export type KitchenSearchField = "order" | "table";

export function KitchenStageFilter({ selected, onChange, iconOnly }: {
  selected: readonly KitchenStage[] | null;
  onChange: (values: KitchenStage[] | null) => void;
  iconOnly?: boolean;
}) {
  const headingId = useId();
  const active = selected ?? KITCHEN_STAGES;
  const allChecked = active.length === KITCHEN_STAGES.length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        {iconOnly ? (
          <Button variant="ghost" size="icon" iconSize="compact" aria-label="상태 필터"><FilterFill /></Button>
        ) : (
          <Button variant="outline" size="compact">상태 필터 <FilterFill /></Button>
        )}
      </PopoverTrigger>
      <PopoverContent className={filterStyles.popup} side={iconOnly ? "bottom" : "top"} align="end"
        collisionPadding={12} aria-labelledby={headingId}>
        <div id={headingId} className={`${filterStyles.title} type-label`}><FilterFill size={16} /> 상태 필터</div>
        <label className={`${filterStyles.option} type-label`}>
          <Checkbox shape="circle" checked={allChecked || (active.length > 0 ? "indeterminate" : false)}
            onCheckedChange={() => onChange(allChecked ? [] : null)} />
          <span>전체</span>
        </label>
        <div className={filterStyles.categoryItems}>
          {KITCHEN_STAGES.map(stage => (
            <label key={stage} className={`${filterStyles.option} type-body-sm`}>
              <Checkbox shape="circle" checked={active.includes(stage)} onCheckedChange={checked => {
                const next = checked ? [...active, stage] : active.filter(value => value !== stage);
                onChange(next.length === KITCHEN_STAGES.length ? null : next);
              }} />
              <span>{KITCHEN_STAGE_LABELS[stage]}</span>
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function KitchenToolbar({ query, setQuery, searchField, setSearchField, sort, setSort, tools, refreshing, onRefresh }: {
  query: string;
  setQuery: (query: string) => void;
  searchField: KitchenSearchField;
  setSearchField: (field: KitchenSearchField) => void;
  sort: string;
  setSort: (sort: string) => void;
  tools?: ReactNode;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  return (
    <div className="site-action-row" data-distribution="between">
      <div className="site-form-row" data-alignment="center">
        <Select value={searchField} onValueChange={value => setSearchField(value === "table" ? "table" : "order")}>
          <SelectTrigger aria-label="검색 기준" size="sm" className="w-auto"><SelectValue>{searchField === "order" ? "주문번호" : "테이블"}</SelectValue></SelectTrigger>
          <SelectContent><SelectItem value="order">주문번호</SelectItem><SelectItem value="table">테이블</SelectItem></SelectContent>
        </Select>
        <div className="min-w-0">
          <SearchField label={searchField === "order" ? "주문번호 검색" : "테이블 검색"}
            placeholder={searchField === "order" ? "주문번호 검색" : "테이블 검색"} fieldSize="sm" value={query} onValueChange={setQuery} />
        </div>
      </div>
      <div className="site-action-row">
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger aria-label="주문 정렬" size="sm" className="w-auto"><SelectValue>{sort === "latest" ? "최근 주문순" : "오래된 주문순"}</SelectValue></SelectTrigger>
          <SelectContent><SelectItem value="latest">최근 주문순</SelectItem><SelectItem value="oldest">오래된 주문순</SelectItem></SelectContent>
        </Select>
        {tools}
        <RefreshButton loading={refreshing} onClick={onRefresh} />
      </div>
    </div>
  );
}
