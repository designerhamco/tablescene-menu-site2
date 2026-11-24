"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { Button } from "@/app/components/ui/button";
import { FieldActionRow } from "@/app/components/ui/field-action-row";
import { FieldMessage } from "@/app/components/ui/field-message";
import type { InlineNameResult } from "@/app/components/ui/inline-name-editor";
import { useUnsavedChanges } from "@/components/ui/useUnsavedChanges";

export default function SelectedPointNameForm({ label, kind, disabled, actions, onSave }: {
  label: string;
  kind: "table" | "kiosk";
  disabled: boolean;
  actions: ReactNode;
  onSave: (value: string) => Promise<InlineNameResult>;
}) {
  const [inputValue, setInputValue] = useState<string>();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const fieldLabel = kind === "kiosk" ? "키오스크 이름" : "테이블 이름";
  const value = inputValue ?? label;
  const dirty = value.trim() !== label;
  const reset = () => { setInputValue(undefined); setError(""); };
  useUnsavedChanges({ dirty, pending, discard: reset });

  return <div className="site-field-stack">
    <FieldActionRow field={<label className="type-label site-registration-name" htmlFor={inputId}>{fieldLabel}
      <input id={inputId} form={`${inputId}-form`} ref={input} name="pointName" className="site-field" value={value}
        required maxLength={80} disabled={disabled || pending} aria-invalid={Boolean(error)}
        aria-describedby={error ? `${inputId}-error` : undefined} onChange={event => { setInputValue(event.target.value); setError(""); }} />
    </label>} action={<div className="site-action-row">
      <form id={`${inputId}-form`} data-unsaved-commit aria-busy={pending} onSubmit={async event => {
        event.preventDefault();
        if (!dirty || pending || disabled) return;
        setPending(true);
        try {
          const result = await onSave(value);
          if (result.status === "success") reset();
          else {
            setError(result.message);
            requestAnimationFrame(() => input.current?.focus());
          }
        } finally {
          setPending(false);
        }
      }}>
        <Button variant="outline" type="submit" disabled={disabled || pending || !dirty}>{pending ? "수정 중" : "수정"}</Button>
      </form>
      {actions}
    </div>} />
    {error && <FieldMessage id={`${inputId}-error`} role="alert">{error}</FieldMessage>}
  </div>;
}
