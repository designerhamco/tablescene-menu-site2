"use client";

import { Button } from "@/app/components/ui/button";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/app/components/ui/dropdown-menu";
import { FilterFill } from "@/app/components/ui/site-icon";
import { SearchField } from "@/app/components/ui/search-field";
import { RefreshButton } from "@/app/components/ui/refresh-button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { KITCHEN_STAGES, KITCHEN_STAGE_LABELS, type KitchenMenuGroup, type KitchenStage } from "@/lib/kitchen-order";

import KitchenMenuFilter from "./KitchenMenuFilter";

export type KitchenSearchField = "order" | "table";

const stageChoices = KITCHEN_STAGES.map(stage => ({ value: stage, label: KITCHEN_STAGE_LABELS[stage] }));

function FilterMenu<T extends string>({ label, choices, selected, onChange }: {
  label: string;
  choices: readonly { value: T; label: string }[];
  selected: readonly T[];
  onChange: (values: T[]) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="compact" disabled={choices.length === 0}>{label}{selected.length ? ` ${selected.length}` : ""} <FilterFill /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuCheckboxItem checked={selected.length === 0} onCheckedChange={() => onChange([])}>전체</DropdownMenuCheckboxItem>
        {choices.map(({ value, label }) => (
          <DropdownMenuCheckboxItem key={value} checked={selected.includes(value)}
            onSelect={event => event.preventDefault()}
            onCheckedChange={checked => {
              const next = checked ? [...selected, value] : selected.filter(item => item !== value);
              onChange(next.length === choices.length ? [] : next);
            }}>{label}</DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function KitchenToolbar({ query, setQuery, searchField, setSearchField, sort, setSort, stages, setStages, menus, setMenus, menuGroups, refreshing, onRefresh }: {
  query: string;
  setQuery: (query: string) => void;
  searchField: KitchenSearchField;
  setSearchField: (field: KitchenSearchField) => void;
  sort: string;
  setSort: (sort: string) => void;
  stages: KitchenStage[];
  setStages: (stages: KitchenStage[]) => void;
  menus: ReadonlySet<string> | null;
  setMenus: (menus: string[] | null) => void;
  menuGroups: KitchenMenuGroup[];
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
        <FilterMenu label="상태 필터" selected={stages} choices={stageChoices} onChange={setStages} />
        <KitchenMenuFilter groups={menuGroups} selection={menus} onChange={setMenus} />
        <RefreshButton loading={refreshing} onClick={onRefresh} />
      </div>
    </div>
  );
}
