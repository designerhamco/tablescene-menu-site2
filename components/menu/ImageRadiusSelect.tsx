"use client";

import { IMAGE_RADIUS_PRESETS, imageRadiusPreset } from "@/lib/menu-appearance";

export default function ImageRadiusSelect({ label, radius, onChange, className, disabled, mixed = false, selection, showTemplateOption = true }: {
  label: string;
  radius?: number;
  mixed?: boolean;
  onChange: (radius?: number) => void;
  className?: string;
  disabled?: boolean;
  selection?: {value:string;label?:string};
  showTemplateOption?: boolean;
}) {
  const selected = selection?.value ?? (mixed ? "saved" : imageRadiusPreset(radius));
  return <select aria-label={`${label} 라운드`} value={selected} disabled={disabled} className={className}
    onChange={event => {
      const preset = IMAGE_RADIUS_PRESETS.find(choice => choice.value === event.target.value);
      if (preset) onChange(preset.radius);
    }}>
    {IMAGE_RADIUS_PRESETS.filter(preset => showTemplateOption || preset.value !== "template").map(preset => <option key={preset.value} value={preset.value}>{preset.label}</option>)}
    {selected === "saved" || selected === "current" ? <option value={selected}>{selection?.label ?? "기존 설정 유지"}</option> : null}
  </select>;
}
