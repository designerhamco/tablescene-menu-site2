"use client";

import { useId, useRef, useState, type PointerEvent } from "react";
import * as Popover from "@radix-ui/react-popover";
import { X } from "lucide-react";
import { hexToHsv, hsvToHex, type HSV } from "@/lib/color-picker";
import styles from "./PreviewColorPicker.module.css";

export default function PreviewColorPicker({ label, accessibleLabel = label, value, defaultColor = "#FFFFFF", onChange, disabled }: {
  label: string;
  accessibleLabel?: string;
  value?: string;
  defaultColor?: string;
  onChange: (value?: string) => void;
  disabled: boolean;
}) {
  const id = useId(), current = value ?? defaultColor;
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(current);
  const [hsv, setHsv] = useState(() => hexToHsv(current));
  const colorRef = useRef(hsv);
  const [invalid, setInvalid] = useState(false);
  const update = (next: HSV, commit = false) => {
    colorRef.current = next;
    setHsv(next);
    const hex = hsvToHex(next);
    setDraft(hex);
    setInvalid(false);
    if (commit) onChange(hex);
  };
  const commitHex = () => {
    if (!/^#[\da-f]{6}$/i.test(draft)) { setInvalid(true); return; }
    const hex = draft.toUpperCase();
    update(hexToHsv(hex));
    if (hex !== current.toUpperCase()) onChange(hex);
  };
  const point = (event: PointerEvent<HTMLDivElement>, commit = false) => {
    const rect = event.currentTarget.getBoundingClientRect();
    update({ ...colorRef.current, s: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)), v: 1 - Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)) }, commit);
  };
  return <div className={styles.field} data-preview-color-field>
    <span className={styles.fieldLabel}>{label}</span>
    <Popover.Root open={open} onOpenChange={next => {
      if (next) { setDraft(current); const nextHsv = hexToHsv(current); colorRef.current = nextHsv; setHsv(nextHsv); setInvalid(false); }
      setOpen(next);
    }}>
      <Popover.Trigger asChild><button type="button" aria-label={`${accessibleLabel} 선택`} disabled={disabled} className={styles.swatch}><span style={{ backgroundColor: value ?? defaultColor }} /></button></Popover.Trigger>
      <Popover.Portal><Popover.Content className={styles.popover} align="start" sideOffset={6} collisionPadding={12} aria-label={`${accessibleLabel} 컬러피커`} data-preview-color-picker>
        <div className={styles.heading}><span>{accessibleLabel}</span><Popover.Close asChild><button type="button" aria-label="컬러피커 닫기" className={styles.close}><X size={16} aria-hidden="true" /></button></Popover.Close></div>
        <div className={styles.spectrum} style={{ backgroundColor: hsvToHex({ h: hsv.h, s: 1, v: 1 }) }} role="slider" tabIndex={0}
          aria-label={`${accessibleLabel} 채도와 밝기`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(hsv.s * 100)} aria-valuetext={`채도 ${Math.round(hsv.s * 100)}%, 밝기 ${Math.round(hsv.v * 100)}%`} aria-describedby={`${id}-hint`}
          onPointerDown={event => { event.currentTarget.focus(); event.currentTarget.setPointerCapture(event.pointerId); point(event); }}
          onPointerMove={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) point(event); }}
          onPointerUp={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) { point(event, true); event.currentTarget.releasePointerCapture(event.pointerId); } }}
          onPointerCancel={() => { update(hexToHsv(current)); }}
          onKeyDown={event => {
            if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
            event.preventDefault();
            const step = event.shiftKey ? .1 : .01, next = { ...colorRef.current };
            if (event.key === "ArrowLeft") next.s = Math.max(0, next.s - step);
            if (event.key === "ArrowRight") next.s = Math.min(1, next.s + step);
            if (event.key === "ArrowUp") next.v = Math.min(1, next.v + step);
            if (event.key === "ArrowDown") next.v = Math.max(0, next.v - step);
            if (event.key === "Home") next.s = 0;
            if (event.key === "End") next.s = 1;
            update(next, true);
          }}><span className={styles.cursor} style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%` }} /></div>
        <span id={`${id}-hint`} className={styles.hint}>좌우 방향키로 채도, 위아래 방향키로 밝기를 조절합니다.</span>
        <input className={styles.hue} aria-label={`${accessibleLabel} 색조`} type="range" min={0} max={359} value={Math.round(hsv.h)}
          onChange={event => update({ ...colorRef.current, h: Number(event.target.value) })}
          onPointerUp={() => onChange(hsvToHex(colorRef.current))} onKeyUp={event => { if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown"].includes(event.key)) onChange(hsvToHex(colorRef.current)); }} />
        <label className={styles.hexRow}><span>HEX</span><input className={styles.hex} aria-label={`${accessibleLabel} 색상값`} value={draft} maxLength={7} autoComplete="off" spellCheck={false} aria-invalid={invalid} aria-describedby={invalid ? `${id}-error` : undefined}
          onChange={event => { setDraft(event.target.value); setInvalid(false); }} onBlur={commitHex} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); commitHex(); } }} /></label>
        {invalid ? <p id={`${id}-error`} className={styles.error}>#과 여섯 자리 색상값을 입력해주세요.</p> : null}
        <button type="button" className={styles.reset} disabled={disabled || !value} onPointerDown={event => event.preventDefault()} onClick={() => { onChange(undefined); update(hexToHsv(defaultColor)); }}>템플릿 기본색 복원</button>
      </Popover.Content></Popover.Portal>
    </Popover.Root>
  </div>;
}
