"use client";

import { useEffect, type ReactNode } from "react";

export type ConsentAgreementItem = {
  key: string;
  label: string;
  required?: boolean;
  detailTitle: string;
  detail: ReactNode;
  href?: string;
};

type ConsentAgreementBoxProps<T extends string> = {
  title?: string;
  values: Record<T, boolean>;
  items: readonly ConsentAgreementItem[];
  activeKey: T | null;
  onChange: (key: T, checked: boolean) => void;
  onToggleAll: (checked: boolean) => void;
  onOpen: (key: T) => void;
  onClose: () => void;
};

export function ConsentAgreementBox<T extends string>({
  title = "동의 및 안내",
  values,
  items,
  activeKey,
  onChange,
  onToggleAll,
  onOpen,
  onClose,
}: ConsentAgreementBoxProps<T>) {
  const allChecked = items.every((item) => values[item.key as T]);
  const activeItem = items.find((item) => item.key === activeKey);

  useEffect(() => {
    if (!activeKey) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [activeKey, onClose]);

  return (
    <>
      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
        {title ? <p className="mb-1 px-1 text-sm font-black text-zinc-700">{title}</p> : null}

        <label className="flex min-h-9 cursor-pointer items-center gap-3 px-1 py-2 text-sm font-black text-zinc-900">
          <input
            type="checkbox"
            checked={allChecked}
            onChange={(event) => onToggleAll(event.target.checked)}
            className="h-4 w-4 shrink-0 rounded border-zinc-300 accent-zinc-950"
          />
          <span>전체 동의</span>
        </label>

        {items.map((item) => {
          const key = item.key as T;

          return (
            <div key={item.key} className="flex min-h-9 items-center justify-between gap-3 border-t border-zinc-100 px-1 py-2">
              <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-sm font-bold text-zinc-800">
                <input
                  name={item.key}
                  type="checkbox"
                  checked={values[key]}
                  required={item.required}
                  onChange={(event) => onChange(key, event.target.checked)}
                  className="h-4 w-4 shrink-0 rounded border-zinc-300 accent-zinc-950"
                />
                <span className="break-keep">{item.label}</span>
              </label>
              <button
                type="button"
                onClick={() => onOpen(key)}
                className="shrink-0 rounded-full px-2 py-0.5 text-xs font-black text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-950"
              >
                보기
              </button>
            </div>
          );
        })}
      </div>

      {activeItem ? (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-zinc-950/50 p-0 md:items-center md:p-6" onClick={onClose}>
          <section
            role="dialog"
            aria-modal="true"
            aria-label={activeItem.detailTitle}
            className="max-h-[86vh] w-full rounded-t-3xl bg-white text-zinc-950 shadow-2xl md:max-w-3xl md:rounded-3xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-zinc-100 p-6">
              <div className="flex items-start justify-between gap-4">
                <h3 className="break-keep text-2xl font-black tracking-tight">{activeItem.detailTitle}</h3>
                <button type="button" onClick={onClose} className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-black text-zinc-500">
                  닫기
                </button>
              </div>
            </div>
            <div className="max-h-[56vh] overflow-y-auto p-6 text-sm font-semibold leading-relaxed text-zinc-600">
              {activeItem.detail}
            </div>
            <div className="border-t border-zinc-100 p-6">
              <button type="button" onClick={onClose} className="inline-flex w-full items-center justify-center rounded-full bg-zinc-950 px-5 py-3 text-sm font-bold text-white">
                확인
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

export function ConsentDetailText({ children }: { children: ReactNode }) {
  return <div className="space-y-3 break-keep">{children}</div>;
}
