"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import KoreanFontAssets from "@/components/menu-templates/shared/KoreanFontAssets";
import { getFontLoadAssets, type FontOption } from "@/lib/font-options";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";

const TEMPLATE_FONT = "__template_font__";

type FontSelectProps<Value extends string> = {
  label: string;
  script: "ko" | "en";
  options: readonly FontOption<Value>[];
  defaultOption: FontOption<Value>;
  selectedOption?: FontOption<Value>;
  value: Value | "";
  onChange: (value: Value | "") => void;
  defaultLabel?: string;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
};

/** Load only font specimens that enter the open, scrollable option viewport. */
function FontSpecimen({ option, script, onVisible }: {
  option: FontOption; script: "ko" | "en"; onVisible: (option: FontOption) => void;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") { onVisible(option); return; }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { onVisible(option); observer.disconnect(); }
    }, { root: node.closest('[data-slot="select-viewport"]'), rootMargin: "80px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [option, onVisible]);
  return <span ref={ref} className="site-font-specimen" style={{ fontFamily: option.fontFamily }} data-font-specimen={option.value}>
    <span>{option.label}</span>{script === "ko" ? <span aria-hidden="true">가나다</span> : null}
  </span>;
}

/** Menu font choices share one accessible popup in preview and design settings. */
export function FontSelect<Value extends string>({ label, script, options, defaultOption, selectedOption, value, onChange, defaultLabel = "템플릿 기본값", disabled, className, size = "md" }: FontSelectProps<Value>) {
  const [loadedOptions, setLoadedOptions] = useState<FontOption[]>([]);
  const load = useCallback((option: FontOption) => {
    setLoadedOptions(current => current.some(item => item.value === option.value) ? current : [...current, option]);
  }, []);
  const selected = selectedOption ?? options.find(option => option.value === value) ?? defaultOption;
  return <>
    <KoreanFontAssets assets={loadedOptions.map(getFontLoadAssets)} />
    <Select value={value || TEMPLATE_FONT} onValueChange={next => onChange(next === TEMPLATE_FONT ? "" : next as Value)} disabled={disabled}>
      <SelectTrigger aria-label={label} size={size} className={className} data-font-select={script}>
        <SelectValue>{value ? selected.label : `${defaultLabel} · ${defaultOption.label}`}</SelectValue>
      </SelectTrigger>
      <SelectContent className="site-font-select-content" aria-label={`${label} 목록`} align="start">
        <SelectItem value={TEMPLATE_FONT} textValue={`${defaultLabel} ${defaultOption.label}`}>
          <span className="site-font-default-label">{defaultLabel} ·</span><FontSpecimen option={defaultOption} script={script} onVisible={load} />
        </SelectItem>
        {options.map(option => <SelectItem key={option.value} value={option.value} textValue={option.label}>
          <FontSpecimen option={option} script={script} onVisible={load} />
        </SelectItem>)}
      </SelectContent>
    </Select>
  </>;
}
