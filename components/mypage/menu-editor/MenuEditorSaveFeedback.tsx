"use client";

import { useEffect, useId, useRef, useState } from "react";

export type MenuEditorSaveIssue = { message: string; fieldId?: string; fieldName?: string };
const NO_ISSUES: readonly MenuEditorSaveIssue[] = [];
type Field = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
type NativeIssue = MenuEditorSaveIssue & { target: Field };

function isField(element: Element): element is Field {
  return element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement;
}

function readInvalidFields(form: HTMLFormElement): NativeIssue[] {
  return Array.from(form.elements).filter(isField).filter(field => field.willValidate && (!field.validity.valid || (field.required && !field.value.trim()))).map(field => {
    const label = field.getAttribute("aria-label") || field.labels?.[0]?.textContent?.trim().replace(/\s*\*$/, "") || "입력 항목";
    const reason = field.validity.valueMissing || (field.required && !field.value.trim()) ? "입력해 주세요." : "값을 확인해 주세요.";
    return { message: `${label}: ${reason}`, target: field };
  });
}

/** One persistent save-error location, directly after the final actions. */
export default function MenuEditorSaveFeedback({ error, issues = NO_ISSUES, formId, id: providedId }: {
  error?: string | null;
  issues?: readonly MenuEditorSaveIssue[];
  formId?: string;
  id?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const generatedId = useId();
  const id = providedId ?? generatedId;
  const [nativeIssues, setNativeIssues] = useState<NativeIssue[]>([]);
  const attempted = useRef(false);

  useEffect(() => {
    const element = formId ? document.getElementById(formId) : ref.current?.closest("form");
    if (!(element instanceof HTMLFormElement)) return;
    const form = element;
    const marked = new Map<Field, { invalid: string | null; describedBy: string | null }>();
    let frame = 0;
    const restore = () => {
      marked.forEach((previous, field) => {
        if (previous.invalid === null) field.removeAttribute("aria-invalid"); else field.setAttribute("aria-invalid", previous.invalid);
        if (previous.describedBy === null) field.removeAttribute("aria-describedby"); else field.setAttribute("aria-describedby", previous.describedBy);
      });
      marked.clear();
    };
    const refresh = () => {
      const next = readInvalidFields(form);
      restore();
      next.forEach(({ target }) => {
        marked.set(target, { invalid: target.getAttribute("aria-invalid"), describedBy: target.getAttribute("aria-describedby") });
        target.setAttribute("aria-invalid", "true");
        target.setAttribute("aria-describedby", [target.getAttribute("aria-describedby"), id].filter(Boolean).join(" "));
      });
      setNativeIssues(next);
      return next;
    };
    const invalid = (event: Event) => { event.preventDefault(); attempted.current = true; refresh(); };
    const submit = (event: Event) => {
      attempted.current = true;
      if (refresh().length) event.preventDefault();
    };
    const edit = () => {
      if (!attempted.current) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(refresh);
    };
    form.addEventListener("invalid", invalid, true);
    form.addEventListener("submit", submit, true);
    form.addEventListener("input", edit);
    form.addEventListener("change", edit);
    return () => {
      cancelAnimationFrame(frame);
      restore();
      form.removeEventListener("invalid", invalid, true);
      form.removeEventListener("submit", submit, true);
      form.removeEventListener("input", edit);
      form.removeEventListener("change", edit);
    };
  }, [formId, id]);

  const allIssues = [...issues, ...nativeIssues, ...(error ? [{ message: error }] : [])].filter((issue, index, entries) => entries.findIndex(entry => entry.message === issue.message) === index);
  function findTarget(issue: MenuEditorSaveIssue & { target?: Field }) {
    if (issue.target) return issue.target;
    if (issue.fieldId) return document.getElementById(issue.fieldId);
    if (issue.fieldName) {
      const form = formId ? document.getElementById(formId) : ref.current?.closest("form");
      if (form instanceof HTMLFormElement) {
        const field = form.elements.namedItem(issue.fieldName);
        if (field instanceof HTMLElement) return field;
      }
    }
    return null;
  }

  return <div ref={ref} id={id} hidden={allIssues.length === 0} role="alert" className="site-editor-save-feedback type-body-sm">
    {allIssues.map(issue => <p key={issue.message}>
      {issue.fieldId || issue.fieldName || "target" in issue ? <button type="button" className="site-editor-save-error-link"
        onClick={() => { const target = findTarget(issue); if (target) { target.focus({ preventScroll: true }); target.scrollIntoView({ block: "center", behavior: "instant" }); } }}>{issue.message}</button> : issue.message}
    </p>)}
  </div>;
}
