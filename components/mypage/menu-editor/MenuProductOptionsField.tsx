"use client";

import { useId, useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Checkbox } from "@/app/components/ui/checkbox";
import { ContentPanel } from "@/app/components/ui/content-panel";
import { Input } from "@/app/components/ui/input";
import { Switch } from "@/app/components/ui/switch";
import { ArrowUp, ArrowDown } from "@/app/components/ui/site-arrow";
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

export default function MenuProductOptionsField({ value, onChange, error, priceColumns = [], canScopeToPrices = false, basicEditor = false, onEditingChange }: {
  value: MenuOrderCustomization;
  onChange: (value: MenuOrderCustomization) => void;
  error: string;
  priceColumns?: { id: string; label: string }[];
  canScopeToPrices?: boolean;
  basicEditor?: boolean;
  onEditingChange?: (editing: boolean) => void;
}) {
  const headingId = useId();
  const [newChoice, setNewChoice] = useState("");
  const [editing, setEditing] = useState<{ index: number; name: string } | null>(null);
  function moveChoice(index: number, direction: -1 | 1) {
    const choices = [...value.choices];
    [choices[index], choices[index + direction]] = [choices[index + direction], choices[index]];
    onChange({ ...value, choices });
  }
  const duplicateChoice = (name: string, except = -1) => value.choices.some((choice, index) => index !== except && choice.toLowerCase() === name.trim().toLowerCase());
  if (basicEditor) return (
    <section className="site-stack-block" aria-labelledby={headingId}>
      <h4 id={headingId} className="type-label">상품 옵션</h4>
      <div className="site-field-action-row">
        <Input aria-label="추가할 상품 옵션" value={newChoice} maxLength={PRODUCT_OPTION_NAME_LIMIT} placeholder="예: 아주 맵게" onChange={event => setNewChoice(event.target.value)} />
        <Button type="button" variant="outline" disabled={!newChoice.trim() || duplicateChoice(newChoice) || Boolean(editing) || value.choices.length >= PRODUCT_OPTION_LIMIT} onClick={() => {
          onChange({ ...value, choices: [...value.choices, newChoice.trim()] });
          setNewChoice("");
        }}>추가 {value.choices.length}/{PRODUCT_OPTION_LIMIT}</Button>
      </div>
      <ol className="site-stack-copy">
        {value.choices.map((choice, index) => (
          <li key={index} className="site-featured-registration-row">
            <div className="site-action-row" data-wrap="nowrap">
              <button type="button" className="site-button site-button-outline site-button-icon" data-icon-size="compact" aria-label={`${choice} 위로 이동`} disabled={index === 0 || Boolean(editing)} onClick={() => moveChoice(index, -1)}><ArrowUp aria-hidden /></button>
              <button type="button" className="site-button site-button-outline site-button-icon" data-icon-size="compact" aria-label={`${choice} 아래로 이동`} disabled={index === value.choices.length - 1 || Boolean(editing)} onClick={() => moveChoice(index, 1)}><ArrowDown aria-hidden /></button>
            </div>
            <Input aria-label={`상품 옵션 ${index + 1}`} value={editing?.index === index ? editing.name : choice} readOnly={editing?.index !== index} maxLength={PRODUCT_OPTION_NAME_LIMIT} onChange={event => setEditing({ index, name: event.target.value })} />
            <div className="site-action-row" data-wrap="nowrap">
              <Button type="button" variant="outline" disabled={editing ? editing.index !== index || !editing.name.trim() || duplicateChoice(editing.name, index) : false} onClick={() => {
                if (editing?.index === index) {
                  onChange({ ...value, choices: value.choices.map((name, choiceIndex) => choiceIndex === index ? editing.name.trim() : name) });
                  setEditing(null);
                  onEditingChange?.(false);
                } else {
                  setEditing({ index, name: choice });
                  onEditingChange?.(true);
                }
              }}>{editing?.index === index ? "등록" : "수정"}</Button>
              <Button type="button" variant="outline" disabled={Boolean(editing)} aria-label={`${choice} 삭제`} onClick={() => onChange({ ...value, choices: value.choices.filter((_, choiceIndex) => choiceIndex !== index) })}>삭제</Button>
            </div>
          </li>
        ))}
      </ol>
      <ContentPanel surface="muted" density="compact">
        <div className="site-content-heading-row" data-layout="toolbar">
          <label className="type-label" htmlFor={headingId + "-request"}>고객 요청사항</label>
          <Switch id={headingId + "-request"} size="sm" checked={value.allowRequest} onCheckedChange={allowRequest => onChange({ ...value, allowRequest })} />
        </div>
        <p className="type-body-sm site-copy-muted">상품 옵션 하단에 고객이 직접 입력할 수 있는 요청사항의 노출 여부를 결정해 주세요.</p>
      </ContentPanel>
      {canScopeToPrices && (value.choices.length > 0 || value.allowRequest) && (
        <label className="site-field-stack"><span className="type-label">상품 옵션 적용 범위</span>
          <select className="site-field" value={value.priceColumnIds ? "selected" : "all"} onChange={event => onChange({ ...value, priceColumnIds: event.target.value === "selected" ? priceColumns.map(column => column.id) : undefined })}>
            <option value="all">모든 가격에 적용</option><option value="selected">선택한 가격 옵션에만 적용</option>
          </select>
          {value.priceColumnIds && <span className="site-action-row">{priceColumns.map(column => <label key={column.id} className="site-action-row" data-wrap="nowrap"><Checkbox checked={value.priceColumnIds?.includes(column.id)} onCheckedChange={checked => onChange({ ...value, priceColumnIds: checked ? [...(value.priceColumnIds ?? []), column.id] : value.priceColumnIds?.filter(id => id !== column.id) })} /><span className="type-label">{column.label}</span></label>)}</span>}
        </label>
      )}
      {error && <p role="alert" className="type-body-sm text-red-700">{error}</p>}
    </section>
  );
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
