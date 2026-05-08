"use client";

import { useId, useState, type ReactNode } from "react";

type SwitchFieldProps = {
  name: string;
  label: ReactNode;
  defaultChecked?: boolean;
  description?: ReactNode;
  disabled?: boolean;
  form?: string;
  onText?: string;
  offText?: string;
  canTurnOn?: boolean;
  blockedMessage?: ReactNode;
};

export default function SwitchField({
  name,
  label,
  defaultChecked = false,
  description,
  disabled = false,
  form,
  onText = "표시 중",
  offText = "숨김",
  canTurnOn = true,
  blockedMessage,
}: SwitchFieldProps) {
  const id = useId();
  const [checked, setChecked] = useState(defaultChecked && canTurnOn);
  const [blocked, setBlocked] = useState(false);
  const effectiveChecked = canTurnOn && checked;
  const showBlockedMessage = blocked && !canTurnOn && blockedMessage;

  return (
    <label
      htmlFor={id}
      className={`flex items-start justify-between gap-4 rounded-lg border border-zinc-100 bg-white p-4 text-sm transition-colors ${
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-zinc-50"
      }`}
    >
      <span className="min-w-0">
        <span className="block break-keep font-bold leading-relaxed text-zinc-700">{label}</span>
        {description && <span className="mt-1 block break-keep text-xs font-semibold leading-relaxed text-zinc-400">{description}</span>}
        <span className={`mt-2 block text-xs font-black ${effectiveChecked ? "text-emerald-700" : "text-zinc-400"}`}>
          {effectiveChecked ? onText : offText}
        </span>
        {showBlockedMessage && (
          <span className="mt-2 block break-keep text-xs font-bold leading-relaxed text-amber-700" aria-live="polite">
            {blockedMessage}
          </span>
        )}
      </span>
      <span className="relative mt-0.5 inline-flex h-7 w-12 shrink-0 items-center">
        <input
          id={id}
          name={name}
          form={form}
          type="checkbox"
          role="switch"
          aria-checked={effectiveChecked}
          checked={effectiveChecked}
          disabled={disabled}
          onChange={(event) => {
            const nextChecked = event.target.checked;

            if (nextChecked && !canTurnOn) {
              setChecked(false);
              setBlocked(true);
              return;
            }

            setBlocked(false);
            setChecked(nextChecked);
          }}
          className="peer sr-only"
        />
        <span className="absolute inset-0 rounded-full bg-zinc-200 transition-colors peer-checked:bg-zinc-950 peer-focus-visible:ring-2 peer-focus-visible:ring-zinc-950 peer-focus-visible:ring-offset-2" />
        <span className="absolute left-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  );
}
