"use client";

import { useEffect, useState, type ReactNode } from "react";

import LiveCharacterCounter from "@/components/mypage/menu-editor/LiveCharacterCounter";
import { useCafeAStarterResetCoordinator } from "@/components/mypage/menu-editor/CafeAStarterResetCoordinator";
import type { CoverSampleDraft } from "@/components/mypage/menu-editor/CoverSampleResetButton";
import SwitchField from "@/components/mypage/menu-editor/SwitchField";

type CafeAStarterCoverTextInputProps = {
  name: "menu_cover_title";
  defaultValue: string;
  formId?: string;
  required?: boolean;
  maxLength?: number;
  placeholder?: string;
  helperText?: ReactNode;
};

type CafeAStarterCoverTextAreaProps = {
  name: "menu_cover_description";
  defaultValue: string;
  formId?: string;
  required?: boolean;
  maxLength?: number;
  placeholder?: string;
  helperText?: ReactNode;
};

type CafeAStarterFeaturedEnabledSwitchProps = {
  defaultChecked: boolean;
  formId?: string;
  label?: ReactNode;
};

function getCoverFieldValue(name: "menu_cover_title" | "menu_cover_description", defaultValue: string, resetValue?: string) {
  if (typeof resetValue === "string") return resetValue;
  return defaultValue;
}

export function CafeAStarterCoverTextInput({
  name,
  defaultValue,
  formId,
  required,
  maxLength,
  placeholder,
  helperText,
}: CafeAStarterCoverTextInputProps) {
  const coordinator = useCafeAStarterResetCoordinator();
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setValue(getCoverFieldValue(name, defaultValue, coordinator?.snapshot?.coverSettings.menuCoverTitle));
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [coordinator?.resetKey, coordinator?.snapshot?.coverSettings.menuCoverTitle, defaultValue, name]);

  useEffect(() => {
    function handleCoverDraftReset(event: Event) {
      const detail = (event as CustomEvent<{ formId?: string; draft?: CoverSampleDraft }>).detail;
      if (formId && detail?.formId !== formId) return;
      if (!detail?.draft) return;
      setValue(detail.draft.menuCoverTitle ?? "");
    }

    window.addEventListener("tablescene:cover-draft-reset", handleCoverDraftReset);
    return () => window.removeEventListener("tablescene:cover-draft-reset", handleCoverDraftReset);
  }, [formId]);

  return (
    <>
      <input
        name={name}
        value={value}
        required={required}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(event) => setValue(event.target.value)}
        className="mt-2 w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 outline-none transition invalid:border-red-200 focus:border-zinc-950 invalid:focus:border-red-500 disabled:bg-zinc-100 disabled:text-zinc-400"
      />
      {(helperText || maxLength) && (
        <div className="mt-2 flex items-start justify-between gap-3 text-xs font-bold leading-relaxed text-zinc-400">
          <span className="break-keep">{helperText}</span>
          {maxLength && <LiveCharacterCounter fieldName={name} initialLength={value.length} maxLength={maxLength} />}
        </div>
      )}
    </>
  );
}

export function CafeAStarterCoverTextArea({
  name,
  defaultValue,
  formId,
  required,
  maxLength,
  placeholder,
  helperText,
}: CafeAStarterCoverTextAreaProps) {
  const coordinator = useCafeAStarterResetCoordinator();
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setValue(getCoverFieldValue(name, defaultValue, coordinator?.snapshot?.coverSettings.menuCoverDescription));
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [coordinator?.resetKey, coordinator?.snapshot?.coverSettings.menuCoverDescription, defaultValue, name]);

  useEffect(() => {
    function handleCoverDraftReset(event: Event) {
      const detail = (event as CustomEvent<{ formId?: string; draft?: CoverSampleDraft }>).detail;
      if (formId && detail?.formId !== formId) return;
      if (!detail?.draft) return;
      setValue(detail.draft.menuCoverDescription ?? "");
    }

    window.addEventListener("tablescene:cover-draft-reset", handleCoverDraftReset);
    return () => window.removeEventListener("tablescene:cover-draft-reset", handleCoverDraftReset);
  }, [formId]);

  return (
    <>
      <textarea
        name={name}
        value={value}
        required={required}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(event) => setValue(event.target.value)}
        className="mt-2 min-h-24 w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 outline-none transition invalid:border-red-200 focus:border-zinc-950 invalid:focus:border-red-500"
      />
      {(helperText || maxLength) && (
        <div className="mt-2 flex items-start justify-between gap-3 text-xs font-bold leading-relaxed text-zinc-400">
          <span className="break-keep">{helperText}</span>
          {maxLength && <LiveCharacterCounter fieldName={name} initialLength={value.length} maxLength={maxLength} />}
        </div>
      )}
    </>
  );
}

export function CafeAStarterFeaturedEnabledSwitch({
  defaultChecked,
  formId,
  label = "대표 영역 사용",
}: CafeAStarterFeaturedEnabledSwitchProps) {
  const coordinator = useCafeAStarterResetCoordinator();
  const [checked, setChecked] = useState(defaultChecked);
  const [resetVersion, setResetVersion] = useState(0);

  useEffect(() => {
    if (!coordinator?.snapshot) return;
    const frameId = window.requestAnimationFrame(() => {
      setChecked(coordinator.snapshot?.featuredEnabled ?? defaultChecked);
      setResetVersion((version) => version + 1);
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [coordinator?.resetKey, coordinator?.snapshot, defaultChecked]);

  useEffect(() => {
    function handleCoverDraftReset(event: Event) {
      const detail = (event as CustomEvent<{ formId?: string; draft?: CoverSampleDraft }>).detail;
      if (formId && detail?.formId !== formId) return;
      if (!detail?.draft) return;
      setChecked(detail.draft.featuredItemEnabled);
      setResetVersion((version) => version + 1);
    }

    window.addEventListener("tablescene:cover-draft-reset", handleCoverDraftReset);
    return () => window.removeEventListener("tablescene:cover-draft-reset", handleCoverDraftReset);
  }, [formId]);

  return (
    <SwitchField
      key={resetVersion}
      name="featured_item_enabled"
      label={label}
      defaultChecked={checked}
      onText="사용 중"
      offText="사용 안 함"
      onCheckedChange={setChecked}
    />
  );
}
