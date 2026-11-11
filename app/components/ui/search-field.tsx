"use client";

import { useImperativeHandle, useRef, type ComponentProps } from "react";
import { Search, X } from "lucide-react";
import { Button } from "./button";
import { InputGroup, InputGroupAction, InputGroupAddon, InputGroupInput, type InputGroupSize } from "./input-group";

type SearchFieldProps = Omit<ComponentProps<"input">, "type" | "value" | "defaultValue" | "onChange" | "size" | "className" | "style"> & {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  fieldSize?: InputGroupSize;
  showSearchIcon?: boolean;
};

export function SearchField({ label, value, onValueChange, fieldSize = "md", showSearchIcon = true, disabled, readOnly, ref, ...props }: SearchFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  useImperativeHandle(ref, () => inputRef.current!);
  return <InputGroup fieldSize={fieldSize}>
    {showSearchIcon ? <InputGroupAddon aria-hidden="true"><Search /></InputGroupAddon> : null}
    <InputGroupInput {...props} ref={inputRef} type="search" aria-label={label} value={value} disabled={disabled} readOnly={readOnly}
      enterKeyHint={props.enterKeyHint ?? "search"} onChange={event => onValueChange(event.currentTarget.value)} />
    <InputGroupAction>{value && !readOnly ? <Button type="button" variant="ghost" size="icon" iconSize="compact" aria-label={`${label} 지우기`} disabled={disabled}
      onClick={() => { onValueChange(""); inputRef.current?.focus(); }}><X aria-hidden="true" /></Button> : null}</InputGroupAction>
  </InputGroup>;
}
