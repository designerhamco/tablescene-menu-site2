"use client";

import { useEffect, useImperativeHandle, useRef, useState, type ComponentProps } from "react";
import { Search, X } from "lucide-react";
import { Button } from "./button";
import { InputGroup, InputGroupAction, InputGroupAddon, InputGroupInput, type InputGroupSize } from "./input-group";

type SearchValueProps = { value: string; onValueChange: (value: string) => void; defaultValue?: never }
  | { value?: never; defaultValue?: string; onValueChange?: (value: string) => void };
type SearchFieldProps = Omit<ComponentProps<"input">, "type" | "value" | "defaultValue" | "onChange" | "size" | "className" | "style"> & SearchValueProps & {
  label: string;
  fieldSize?: InputGroupSize;
  /** Dedicated search submits inside the capsule; combined filter forms keep their existing apply action. */
  submitLabel?: string;
};

export function SearchField({ label, value, defaultValue = "", onValueChange, fieldSize = "md", submitLabel, disabled, readOnly, ref, ...props }: SearchFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(defaultValue);
  const currentValue = value ?? draft;
  useImperativeHandle(ref, () => inputRef.current!);
  useEffect(() => {
    if (value !== undefined) return;
    const form = inputRef.current?.form;
    const reset = () => setDraft(defaultValue);
    form?.addEventListener("reset", reset);
    return () => form?.removeEventListener("reset", reset);
  }, [value, defaultValue]);
  function change(next: string) {
    if (value === undefined) setDraft(next);
    onValueChange?.(next);
  }
  return <InputGroup fieldSize={fieldSize} className="site-search-field">
    {!submitLabel ? <InputGroupAddon aria-hidden="true"><Search /></InputGroupAddon> : null}
    <InputGroupInput {...props} ref={inputRef} type="search" aria-label={label} value={currentValue} disabled={disabled} readOnly={readOnly}
      enterKeyHint={props.enterKeyHint ?? "search"} onChange={event => change(event.currentTarget.value)} />
    <InputGroupAction>{currentValue && !readOnly ? <Button type="button" variant="ghost" size="icon" iconSize="compact" aria-label={`${label} 지우기`} disabled={disabled}
      onClick={() => { change(""); inputRef.current?.focus(); }}><X aria-hidden="true" /></Button> : null}</InputGroupAction>
    {submitLabel ? <InputGroupAction data-search-action="submit"><Button type="submit" form={props.form} size="icon" iconAppearance="framed"
      iconSize={fieldSize === "search" ? undefined : "compact"} aria-label={submitLabel} disabled={disabled}><Search aria-hidden="true" /></Button></InputGroupAction> : null}
  </InputGroup>;
}
