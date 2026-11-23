"use client";

import { useId } from "react";
import { Button } from "@/app/components/ui/button";
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

export default function MenuProductOptionsField({ value, onChange, error }: {
  value: MenuOrderCustomization;
  onChange: (value: MenuOrderCustomization) => void;
  error: string;
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
      {error && <p role="alert" className="type-body-sm text-red-700">{error}</p>}
    </ContentPanel>
  );
}
