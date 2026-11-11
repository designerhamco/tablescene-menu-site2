"use client";

import { useId, useRef, useState } from "react";
import { format, isValid, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { Calendar } from "./calendar";
import { CalendarIcon } from "./site-icon";
import { Button } from "./button";
import { InputGroup, InputGroupAction, InputGroupInput } from "./input-group";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { FieldMessage } from "./field-message";

function parseDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = parseISO(value);
  return isValid(date) && date.getFullYear() > 0 && format(date, "yyyy-MM-dd") === value ? date : undefined;
}

/** Controlled date filter with the site's calendar and manual ISO date entry. */
export function DateField({ id, label, value, onValueChange, disabled = false }: {
  id?: string; label: string; value: string; onValueChange: (value: string) => void; disabled?: boolean;
}) {
  const uid = useId();
  const inputId = id ?? uid;
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState({ source: value, text: value });
  const [blurred, setBlurred] = useState(false);
  if (editing.source !== value) setEditing({ source: value, text: value });
  const invalid = Boolean(editing.text && !parseDate(editing.text));
  const selected = parseDate(value);
  function choose(date?: Date) {
    const next = date ? format(date, "yyyy-MM-dd") : "";
    setEditing({ source: next, text: next }); setBlurred(false);
    onValueChange(next); setOpen(false);
  }
  return <div className="site-field-stack">
    <Popover open={open} onOpenChange={setOpen}>
      <InputGroup>
        <InputGroupInput ref={input} id={inputId} type="text" aria-label={label} placeholder="YYYY-MM-DD" autoComplete="off" disabled={disabled}
          value={editing.text} aria-invalid={invalid || undefined} aria-describedby={invalid && blurred ? `${inputId}-error` : undefined}
          onChange={event => {
            const text = event.currentTarget.value;
            const valid = !text || Boolean(parseDate(text));
            setEditing({ source: valid ? text : value, text }); setBlurred(false);
            if (valid) onValueChange(text);
          }}
          onBlur={() => setBlurred(true)}
          onKeyDown={event => { if (event.altKey && event.key === "ArrowDown") { event.preventDefault(); setOpen(true); } }} />
        <InputGroupAction><PopoverTrigger asChild><Button type="button" variant="ghost" size="icon" iconSize="compact" disabled={disabled} aria-label={`${label} 달력 열기`}><CalendarIcon /></Button></PopoverTrigger></InputGroupAction>
      </InputGroup>
      <PopoverContent className="site-date-popover" align="start" collisionPadding={16} aria-label={`${label} 날짜 선택`} onCloseAutoFocus={event => { event.preventDefault(); input.current?.focus(); }}>
        <Calendar mode="single" locale={ko} selected={selected} defaultMonth={selected} onSelect={choose} initialFocus />
        <div className="site-action-row site-calendar-actions" data-distribution="between">
          <Button type="button" variant="ghost" size="compact" onClick={() => choose()}>지우기</Button>
          <Button type="button" variant="ghost" size="compact" onClick={() => choose(new Date())}>오늘</Button>
        </div>
      </PopoverContent>
    </Popover>
    {invalid && blurred ? <FieldMessage id={`${inputId}-error`}>날짜를 YYYY-MM-DD 형식으로 입력해 주세요.</FieldMessage> : null}
  </div>;
}
