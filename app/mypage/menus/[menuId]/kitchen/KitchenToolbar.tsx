"use client";

import { Button } from "@/app/components/ui/button";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/app/components/ui/dropdown-menu";
import { Input } from "@/app/components/ui/input";
import { RefreshButton } from "@/app/components/ui/refresh-button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { KITCHEN_STAGES, KITCHEN_STAGE_LABELS, type KitchenStage } from "@/lib/kitchen-order";

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
        <Button variant="outline" size="compact" disabled={choices.length === 0}>{label}{selected.length ? ` ${selected.length}` : ""}</Button>
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

export default function KitchenToolbar({ query, setQuery, sort, setSort, stages, setStages, menus, setMenus, menuChoices, refreshing, onRefresh }: {
  query: string;
  setQuery: (query: string) => void;
  sort: string;
  setSort: (sort: string) => void;
  stages: KitchenStage[];
  setStages: (stages: KitchenStage[]) => void;
  menus: string[];
  setMenus: (menus: string[]) => void;
  menuChoices: string[];
  refreshing: boolean;
  onRefresh: () => void;
}) {
  return (
    <div className="site-action-row" data-distribution="between">
      <Input type="search" aria-label="주문번호·테이블 검색" placeholder="주문번호·테이블 검색"
        fieldSize="sm" value={query} onChange={event => setQuery(event.target.value)} className="w-auto max-w-full" />
      <div className="site-action-row">
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger aria-label="주문 정렬" size="sm" className="w-auto"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="latest">최근 주문순</SelectItem><SelectItem value="oldest">오래된 주문순</SelectItem></SelectContent>
        </Select>
        <FilterMenu label="상태 필터" selected={stages} choices={stageChoices} onChange={setStages} />
        <FilterMenu label="메뉴 필터" selected={menus} choices={menuChoices.map(name => ({ label: name, value: name }))} onChange={setMenus} />
        <RefreshButton loading={refreshing} onClick={onRefresh} />
      </div>
    </div>
  );
}
