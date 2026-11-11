"use client";

import { useId, useState, type ComponentProps } from "react";
import { Eye, EyeOff } from "@/app/components/ui/site-icon";
import { Button } from "./button";
import { InputGroup, InputGroupAction, InputGroupInput, type InputGroupSize } from "./input-group";

type PasswordFieldProps = Omit<ComponentProps<"input">, "type" | "size" | "className" | "style"> & { fieldSize?: InputGroupSize };

export function PasswordField({ id, fieldSize = "md", disabled, readOnly, ...props }: PasswordFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [visible, setVisible] = useState(false);
  return <InputGroup fieldSize={fieldSize}>
    <InputGroupInput {...props} id={inputId} type={visible ? "text" : "password"} disabled={disabled} readOnly={readOnly} />
    <InputGroupAction><Button type="button" variant="ghost" size="icon" iconSize="compact" aria-label={visible ? "비밀번호 숨기기" : "비밀번호 표시"}
      aria-controls={inputId} aria-pressed={visible} disabled={disabled || readOnly} onClick={() => setVisible(value => !value)}>
      {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
    </Button></InputGroupAction>
  </InputGroup>;
}
