"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { useCafeAStarterResetCoordinator } from "@/components/mypage/menu-editor/CafeAStarterResetCoordinator";
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
  const cafeAStarterReset = useCafeAStarterResetCoordinator();
  const initialSignatureRef = useRef<string | null>(null);
  const wasPendingRef = useRef(false);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    const form = document.getElementById(formId);
    if (!(form instanceof HTMLFormElement)) return;

    const formElement = form;
    const ignoredNameSet = new Set(ignoredNames);
    let frameId = 0;

    function updateDirtyState() {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => {
        const nextSignature = getFormSignature(formElement, ignoredNameSet);

        if (initialSignatureRef.current === null) {
          initialSignatureRef.current = nextSignature;
          setIsDirty(false);
          return;
        }

        setIsDirty(nextSignature !== initialSignatureRef.current);
      });
    }

    initialSignatureRef.current = getFormSignature(formElement, ignoredNameSet);

    const observer = new MutationObserver(updateDirtyState);
    observer.observe(formElement, {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: ["value", "checked", "name"],
    });

    const events = ["input", "change", "click", "keyup", "pointerup"];
    events.forEach((eventName) => formElement.addEventListener(eventName, updateDirtyState, true));
    window.addEventListener("tablescene:cover-draft-reset", updateDirtyState);
    window.addEventListener("tablescene:image-upload-draft-reset", updateDirtyState);

    return () => {
      window.cancelAnimationFrame(frameId);
      observer.disconnect();
      events.forEach((eventName) => formElement.removeEventListener(eventName, updateDirtyState, true));
      window.removeEventListener("tablescene:cover-draft-reset", updateDirtyState);
      window.removeEventListener("tablescene:image-upload-draft-reset", updateDirtyState);
    };
  }, [formId, ignoredNames]);

  useEffect(() => {
    if (formId !== "menu-cover-form" || !cafeAStarterReset?.snapshot) return;
    const frameId = window.requestAnimationFrame(() => {
      setIsDirty(true);
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [cafeAStarterReset?.resetKey, cafeAStarterReset?.snapshot, formId]);

  useEffect(() => {
    let resetFrameId = 0;

    if (wasPendingRef.current && !pending) {
      const params = new URLSearchParams(window.location.search);
      const hasSuccessMessage = Boolean(params.get("message"));
      const hasErrorMessage = Boolean(params.get("error"));

      if (hasSuccessMessage && !hasErrorMessage) {
        const form = document.getElementById(formId);

        if (form instanceof HTMLFormElement) {
          initialSignatureRef.current = getFormSignature(form, new Set(ignoredNames));
          resetFrameId = window.requestAnimationFrame(() => {
            setIsDirty(false);
          });
        }
      }
    }

    wasPendingRef.current = pending;

    return () => {
      window.cancelAnimationFrame(resetFrameId);
    };
  }, [formId, ignoredNames, pending]);

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
