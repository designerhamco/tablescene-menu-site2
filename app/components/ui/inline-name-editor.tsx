"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Pencil } from "lucide-react";

export type InlineNameResult = { status: "success"; value?: string } | { status: "error"; message: string };
/** Short names: Enter/blur commit once, Escape cancels; failed drafts stay editable. */
export function InlineNameEditor({ value, label, maxLength = 40, iconOnly = false, disabled = false, onSave }: {
  value: string; label: string; maxLength?: number; iconOnly?: boolean; disabled?: boolean;
  onSave: (name: string) => Promise<InlineNameResult>;
}) {
  const [localName, setLocalName] = useState({ source: value, name: value }), [draft, setDraft] = useState(value);
  const display = localName.source === value ? localName.name : value;
  if (localName.source !== value) setLocalName({ source: value, name: value });
  const [editing, setEditing] = useState(false), [pending, setPending] = useState(false), [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null), trigger = useRef<HTMLButtonElement>(null);
  const saving = useRef(false), cancelled = useRef(false), returnFocus = useRef(false);
  const id = useId();
  useEffect(() => {
    if (editing) { input.current?.focus(); input.current?.select(); }
    else if (returnFocus.current) { returnFocus.current = false; trigger.current?.focus(); }
  }, [editing]);
  async function commit(name: string, fromEnter = false) {
    if (saving.current || cancelled.current) return;
    const next = name.trim();
    if (!next || next.length > maxLength) { setError(`이름을 1~${maxLength}자로 입력해 주세요.`); return; }
    returnFocus.current = fromEnter;
    if (next === display) { cancelled.current = true; setEditing(false); setError(""); return; }
    saving.current = true; setPending(true); setError("");
    try {
      const result = await onSave(next);
      if (result.status === "error") { setError(result.message); returnFocus.current = false; }
      else { cancelled.current = true; setLocalName({ source: value, name: result.value ?? next }); setEditing(false); }
    } catch { setError("이름을 저장하지 못했습니다. 연결을 확인하고 다시 시도해 주세요."); returnFocus.current = false; }
    finally { saving.current = false; setPending(false); }
  }
  return <span className="site-inline-name-editor" data-editing={editing} data-icon-only={iconOnly} aria-busy={pending}>
    {editing ? <>
      <input ref={input} className="site-field w-full" aria-label={label} maxLength={maxLength} value={draft} readOnly={pending} aria-invalid={Boolean(error)} aria-describedby={`${id}-help${error ? ` ${id}` : ""}`}
        onChange={event => { setDraft(event.target.value); setError(""); }}
        onBlur={event => { void commit(event.currentTarget.value); }}
        onKeyDown={event => {
          if (event.nativeEvent.isComposing) return;
          if (event.key === "Enter") { event.preventDefault(); void commit(event.currentTarget.value, true); }
          if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); if (saving.current) return; cancelled.current = true; returnFocus.current = true; setEditing(false); setError(""); }
        }} />
      <span id={`${id}-help`} className="sr-only">Enter 또는 입력칸을 벗어나면 저장합니다. Esc는 변경을 취소합니다.</span>
      {error ? <span id={id} className="type-footnote text-destructive" role="alert">{error}</span> : null}
      {pending ? <span className="sr-only" role="status">이름 저장 중</span> : null}
    </> : <button ref={trigger} type="button" className={iconOnly ? "site-button site-button-ghost site-button-icon" : "site-button site-button-link site-button-compact"} disabled={disabled} aria-label={label} onClick={() => { cancelled.current = false; setDraft(display); setError(""); setEditing(true); }}>
      {!iconOnly ? <span className="type-item-title min-w-0 break-words">{display}</span> : null}<Pencil aria-hidden="true" />
    </button>}
  </span>;
}
