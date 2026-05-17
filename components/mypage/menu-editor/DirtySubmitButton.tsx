"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import LoadingSpinner from "@/components/ui/LoadingSpinner";

type DirtySubmitButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  formId: string;
  ignoredNames?: string[];
  pendingLabel?: string;
};

const defaultIgnoredNames = ["menuId"];

function getFormSignature(form: HTMLFormElement, ignoredNames: Set<string>) {
  const values = new Map<string, string[]>();
  const formData = new FormData(form);

  formData.forEach((value, key) => {
    if (ignoredNames.has(key)) return;
    const normalizedValue = value instanceof File ? value.name : String(value ?? "");
    values.set(key, [...(values.get(key) ?? []), normalizedValue]);
  });

  return JSON.stringify(
    [...values.entries()]
      .map(([key, value]) => [key, [...value].sort()])
      .sort(([leftKey], [rightKey]) => String(leftKey).localeCompare(String(rightKey))),
  );
}

export default function DirtySubmitButton({
  children,
  formId,
  ignoredNames = defaultIgnoredNames,
  pendingLabel = "저장 중...",
  disabled,
  className,
  ...props
}: DirtySubmitButtonProps) {
  const { pending } = useFormStatus();
  const initialSignatureRef = useRef<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    const form = document.getElementById(formId);
    if (!(form instanceof HTMLFormElement)) return;

    const ignoredNameSet = new Set(ignoredNames);
    let frameId = 0;

    function updateDirtyState() {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => {
        const nextSignature = getFormSignature(form, ignoredNameSet);

        if (initialSignatureRef.current === null) {
          initialSignatureRef.current = nextSignature;
          setIsDirty(false);
          return;
        }

        setIsDirty(nextSignature !== initialSignatureRef.current);
      });
    }

    initialSignatureRef.current = getFormSignature(form, ignoredNameSet);

    const observer = new MutationObserver(updateDirtyState);
    observer.observe(form, {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: ["value", "checked", "name"],
    });

    const events = ["input", "change", "click", "keyup", "pointerup"];
    events.forEach((eventName) => form.addEventListener(eventName, updateDirtyState, true));
    window.addEventListener("tablescene:cover-draft-reset", updateDirtyState);
    window.addEventListener("tablescene:image-upload-draft-reset", updateDirtyState);

    return () => {
      window.cancelAnimationFrame(frameId);
      observer.disconnect();
      events.forEach((eventName) => form.removeEventListener(eventName, updateDirtyState, true));
      window.removeEventListener("tablescene:cover-draft-reset", updateDirtyState);
      window.removeEventListener("tablescene:image-upload-draft-reset", updateDirtyState);
    };
  }, [formId, ignoredNames]);

  return (
    <button
      type="submit"
      disabled={disabled || pending || !isDirty}
      {...props}
      className={className}
    >
      {pending ? (
        <>
          <LoadingSpinner className="h-4 w-4" />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </button>
  );
}
