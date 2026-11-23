"use client";

import { useId } from "react";
import { Button } from "@/app/components/ui/button";
import { Checkbox } from "@/app/components/ui/checkbox";
import { ContentPanel } from "@/app/components/ui/content-panel";
import { Input } from "@/app/components/ui/input";
import { Switch } from "@/app/components/ui/switch";
import { PRODUCT_OPTION_LIMIT, PRODUCT_OPTION_NAME_LIMIT, type MenuOrderCustomization } from "@/lib/menu-order-customization";

export function OrderRequestSwitch({ label, checked, onCheckedChange }: {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  const id = useId();
  return (
    <div className="site-action-row">
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
      <label htmlFor={id} className="type-label">{label}</label>
    </div>
  );
}

export default function MenuProductOptionsField({ value, onChange, error, priceColumns = [], canScopeToPrices = false }: {
  value: MenuOrderCustomization;
  onChange: (value: MenuOrderCustomization) => void;
  error: string;
  priceColumns?: { id: string; label: string }[];
  canScopeToPrices?: boolean;
}) {
  const headingId = useId();
  return (
    <ContentPanel surface="muted" aria-labelledby={headingId}>
      <h4 id={headingId} className="type-content-title">상품 옵션</h4>
      {value.choices.length > 0 && (
        <label className="site-field-stack">
          <span className="type-label">옵션 제목 (선택)</span>
          <Input value={value.title} maxLength={PRODUCT_OPTION_NAME_LIMIT} placeholder="예: 맵기"
            onChange={event => onChange({ ...value, title: event.target.value })} />
        </label>
      )}
      {value.choices.map((choice, index) => (
        <div key={index} className="site-form-row" data-alignment="center">
          <Input aria-label={`선택지 ${index + 1}`} value={choice} maxLength={PRODUCT_OPTION_NAME_LIMIT} placeholder={index === 0 ? "예: 덜 맵게" : undefined}
            onChange={event => onChange({ ...value, choices: value.choices.map((name, choiceIndex) => choiceIndex === index ? event.target.value : name) })} />
          <Button type="button" variant="outline" aria-label={`선택지 ${index + 1} 삭제`}
            onClick={() => onChange({ ...value, choices: value.choices.filter((_, choiceIndex) => choiceIndex !== index) })}>삭제</Button>
        </div>
      ))}
      <div className="site-action-row">
        <Button type="button" variant="outline" disabled={value.choices.length >= PRODUCT_OPTION_LIMIT}
          onClick={() => onChange({ ...value, choices: [...value.choices, ""] })}>선택지 추가</Button>
      </div>
      <OrderRequestSwitch label="고객 직접 입력 허용" checked={value.allowRequest}
        onCheckedChange={allowRequest => onChange({ ...value, allowRequest })} />
      {canScopeToPrices && (value.choices.length > 0 || value.allowRequest) && (
        <>
          <label className="site-field-stack">
            <span className="type-label">상품 옵션 적용 범위</span>
            <select className="site-field" data-field-size="md" value={value.priceColumnIds ? "selected" : "all"}
              onChange={event => onChange({ ...value, priceColumnIds: event.target.value === "selected" ? [] : undefined })}>
              <option value="all">모든 가격에 적용</option>
              <option value="selected">선택한 가격 옵션에만 적용</option>
            </select>
          </label>
          {value.priceColumnIds && (
            <fieldset className="site-field-stack">
              <legend className="type-label">적용할 가격 옵션</legend>
              <div className="site-action-row">
                {priceColumns.map(column => {
                  const checkedIds = value.priceColumnIds ?? [];
                  const id = headingId + "-" + column.id;
                  return (
                    <div key={column.id} className="site-action-row" data-wrap="nowrap">
                      <Checkbox id={id} checked={checkedIds.includes(column.id)}
                        onCheckedChange={checked => onChange({ ...value, priceColumnIds: checked === true
                          ? [...checkedIds, column.id]
                          : checkedIds.filter(columnId => columnId !== column.id) })} />
                      <label htmlFor={id} className="type-label">{column.label}</label>
                    </div>
                  );
                })}
              </div>
            </fieldset>
          )}
        </>
      )}
      {error && <p role="alert" className="type-body-sm text-red-700">{error}</p>}
    </ContentPanel>
  );
}
