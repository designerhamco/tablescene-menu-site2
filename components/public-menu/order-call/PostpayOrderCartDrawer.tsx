"use client";

import { Check, ChevronLeft, Minus, Plus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type {
  PostpayOrderCatalogItem,
  PostpayOrderCatalogOptionGroup,
} from "./types";

type StoredCartLine = {
  menuItemId: string;
  quantity: number;
  optionValueIds: string[];
};

type CartLine = StoredCartLine & {
  key: string;
  name: string;
  unitPrice: number;
  optionNames: string[];
};

type PostpayOrderCartDrawerProps = {
  open: boolean;
  onClose: () => void;
  menuSiteId: string;
  cartScope: string;
  catalog: PostpayOrderCatalogItem[];
  onCountChange: (count: number) => void;
};

function formatPrice(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value) + "원";
}

function getLineKey(menuItemId: string, optionValueIds: string[]) {
  return `${menuItemId}:${[...optionValueIds].sort().join(",")}`;
}

function hydrateCartLine(line: StoredCartLine, catalog: PostpayOrderCatalogItem[]): CartLine | null {
  const item = catalog.find((candidate) => candidate.id === line.menuItemId);
  if (!item || !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 20) return null;
  const values = item.optionGroups.flatMap((group) => group.values);
  const selected = line.optionValueIds.map((id) => values.find((value) => value.id === id));
  if (selected.some((value) => !value)) return null;
  return {
    ...line,
    key: getLineKey(line.menuItemId, line.optionValueIds),
    name: item.name,
    unitPrice: item.price + selected.reduce((sum, value) => sum + (value?.priceDelta ?? 0), 0),
    optionNames: selected.flatMap((value) => value?.name ?? []),
  };
}

function selectionIsValid(group: PostpayOrderCatalogOptionGroup, selectedIds: ReadonlySet<string>) {
  const selectedCount = group.values.filter((value) => selectedIds.has(value.id)).length;
  if (group.isRequired && selectedCount < group.minSelections) return false;
  if (selectedCount > 0 && selectedCount < group.minSelections) return false;
  return selectedCount <= group.maxSelections;
}

export default function PostpayOrderCartDrawer({
  open,
  onClose,
  menuSiteId,
  cartScope,
  catalog,
  onCountChange,
}: PostpayOrderCartDrawerProps) {
  const storageKey = `menulink-postpay-cart:${menuSiteId}:${cartScope}`;
  const [cart, setCart] = useState<CartLine[]>([]);
  const [hydratedScope, setHydratedScope] = useState<string | null>(null);
  const [activeItem, setActiveItem] = useState<PostpayOrderCatalogItem | null>(null);
  const [selectedOptionIds, setSelectedOptionIds] = useState<Set<string>>(new Set());
  const [quantity, setQuantity] = useState(1);
  const [requestText, setRequestText] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let nextCart: CartLine[] = [];
    try {
      const parsed = JSON.parse(window.localStorage.getItem(storageKey) ?? "[]") as StoredCartLine[];
      nextCart = Array.isArray(parsed) ? parsed.flatMap((line) => hydrateCartLine(line, catalog) ?? []) : [];
    } catch {}
    queueMicrotask(() => {
      if (cancelled) return;
      setCart(nextCart);
      setHydratedScope(storageKey);
    });
    return () => { cancelled = true; };
  }, [catalog, storageKey]);

  useEffect(() => {
    if (hydratedScope !== storageKey) return;
    const stored = cart.map(({ menuItemId, quantity: lineQuantity, optionValueIds }) => ({
      menuItemId,
      quantity: lineQuantity,
      optionValueIds,
    }));
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(stored));
    } catch {}
    onCountChange(cart.reduce((sum, line) => sum + line.quantity, 0));
  }, [cart, hydratedScope, onCountChange, storageKey]);

  const totalAmount = useMemo(
    () => cart.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0),
    [cart],
  );
  const totalUnits = useMemo(() => cart.reduce((sum, line) => sum + line.quantity, 0), [cart]);

  function resetPendingRequest() {
    setPendingRequestId(null);
    setMessage("");
  }

  function toggleOption(group: PostpayOrderCatalogOptionGroup, optionId: string) {
    setSelectedOptionIds((current) => {
      const next = new Set(current);
      if (next.has(optionId)) {
        next.delete(optionId);
        return next;
      }
      const selectedInGroup = group.values.filter((value) => next.has(value.id));
      if (group.maxSelections === 1) selectedInGroup.forEach((value) => next.delete(value.id));
      if (selectedInGroup.length >= group.maxSelections) return current;
      next.add(optionId);
      return next;
    });
  }

  function addActiveItem() {
    if (!activeItem || activeItem.optionGroups.some((group) => !selectionIsValid(group, selectedOptionIds))) {
      setMessage("필수 옵션과 선택 개수를 확인해 주세요.");
      return;
    }
    const optionValueIds = [...selectedOptionIds].sort();
    const hydrated = hydrateCartLine({ menuItemId: activeItem.id, quantity, optionValueIds }, catalog);
    if (!hydrated) return;
    setCart((current) => {
      const existing = current.find((line) => line.key === hydrated.key);
      if (existing) {
        const nextQuantity = Math.min(20, existing.quantity + quantity);
        if (current.reduce((sum, line) => sum + line.quantity, 0) - existing.quantity + nextQuantity > 50) return current;
        return current.map((line) => line.key === hydrated.key ? { ...line, quantity: nextQuantity } : line);
      }
      if (current.length >= 20 || current.reduce((sum, line) => sum + line.quantity, 0) + quantity > 50) return current;
      return [...current, hydrated];
    });
    resetPendingRequest();
    setActiveItem(null);
    setSelectedOptionIds(new Set());
    setQuantity(1);
  }

  function changeLineQuantity(key: string, delta: number) {
    setCart((current) => current.flatMap((line) => {
      if (line.key !== key) return line;
      const nextQuantity = line.quantity + delta;
      if (nextQuantity < 1) return [];
      if (nextQuantity > 20 || totalUnits + delta > 50) return line;
      return { ...line, quantity: nextQuantity };
    }));
    resetPendingRequest();
  }

  async function submitOrder() {
    if (cart.length < 1 || submitting) return;
    const requestId = pendingRequestId ?? crypto.randomUUID();
    setPendingRequestId(requestId);
    setSubmitting(true);
    setMessage("");
    try {
      const result = await fetch("/api/public-menu/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          menuSiteId,
          clientRequestId: requestId,
          requestText,
          lines: cart.map(({ menuItemId, quantity: lineQuantity, optionValueIds }) => ({
            menuItemId,
            quantity: lineQuantity,
            optionValueIds,
          })),
        }),
      });
      const body = await result.json() as { ok?: boolean; message?: string; order?: { orderNumber?: number } };
      if (!result.ok || !body.ok) throw new Error(body.message || "주문을 전송하지 못했습니다.");
      setCart([]);
      setRequestText("");
      setPendingRequestId(null);
      setMessage(`주문 ${body.order?.orderNumber ?? ""}번이 접수되었습니다.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "주문을 전송하지 못했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1200] md:hidden" role="dialog" aria-modal="true" aria-label="장바구니">
      <button type="button" className="absolute inset-0 bg-black/45" aria-label="장바구니 닫기" onClick={onClose} />
      <section className="absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col rounded-t-[28px] bg-white text-zinc-950 shadow-2xl">
        <header className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100"
            onClick={() => activeItem ? setActiveItem(null) : onClose()}
            aria-label={activeItem ? "메뉴 목록으로" : "장바구니 닫기"}
          >
            {activeItem ? <ChevronLeft className="h-5 w-5" /> : <X className="h-5 w-5" />}
          </button>
          <h2 className="text-base font-black">{activeItem ? activeItem.name : "테이블 주문"}</h2>
          <span className="min-w-9 text-right text-xs font-black text-zinc-500">{totalUnits}/50</span>
        </header>

        <div className="overflow-y-auto px-5 py-5">
          {activeItem ? (
            <div className="space-y-5">
              <div>
                <p className="text-xl font-black">{activeItem.name}</p>
                <p className="mt-1 text-sm font-bold text-zinc-500">{formatPrice(activeItem.price)}</p>
              </div>
              {activeItem.optionGroups.map((group) => (
                <fieldset key={group.id} className="rounded-2xl border border-zinc-200 p-4">
                  <legend className="px-1 text-sm font-black">
                    {group.name} {group.isRequired ? <span className="text-red-600">필수</span> : null}
                  </legend>
                  <p className="mb-3 text-xs font-bold text-zinc-400">{group.minSelections}–{group.maxSelections}개 선택</p>
                  <div className="space-y-2">
                    {group.values.map((value) => {
                      const selected = selectedOptionIds.has(value.id);
                      return (
                        <button
                          key={value.id}
                          type="button"
                          className={`flex w-full items-center justify-between rounded-xl border px-3 py-3 text-left text-sm font-bold ${selected ? "border-zinc-950 bg-zinc-950 text-white" : "border-zinc-200"}`}
                          onClick={() => toggleOption(group, value.id)}
                        >
                          <span>{value.name}</span>
                          <span>{value.priceDelta > 0 ? `+${formatPrice(value.priceDelta)}` : selected ? <Check className="h-4 w-4" /> : ""}</span>
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              ))}
              <div className="flex items-center justify-between rounded-2xl bg-zinc-100 p-4">
                <span className="text-sm font-black">수량</span>
                <div className="flex items-center gap-4">
                  <button type="button" className="rounded-full bg-white p-2" aria-label="수량 줄이기" onClick={() => setQuantity(Math.max(1, quantity - 1))}><Minus className="h-4 w-4" /></button>
                  <span className="min-w-5 text-center font-black">{quantity}</span>
                  <button type="button" className="rounded-full bg-white p-2" aria-label="수량 늘리기" onClick={() => setQuantity(Math.min(20, quantity + 1))}><Plus className="h-4 w-4" /></button>
                </div>
              </div>
              <button type="button" className="w-full rounded-2xl bg-zinc-950 px-5 py-4 text-sm font-black text-white" onClick={addActiveItem}>장바구니에 담기</button>
            </div>
          ) : (
            <div className="space-y-6">
              <section>
                <h3 className="text-sm font-black">주문 가능 메뉴</h3>
                <div className="mt-3 space-y-2">
                  {catalog.length ? catalog.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="flex w-full items-center justify-between rounded-2xl border border-zinc-200 px-4 py-4 text-left"
                      onClick={() => { setActiveItem(item); setSelectedOptionIds(new Set()); setQuantity(1); setMessage(""); }}
                    >
                      <span className="font-black">{item.name}</span>
                      <span className="text-sm font-bold text-zinc-500">{formatPrice(item.price)}</span>
                    </button>
                  )) : <p className="rounded-2xl bg-zinc-100 p-5 text-sm font-bold text-zinc-500">현재 주문 가능한 메뉴가 없습니다.</p>}
                </div>
              </section>

              {cart.length ? (
                <section>
                  <h3 className="text-sm font-black">장바구니</h3>
                  <div className="mt-3 divide-y divide-zinc-100 rounded-2xl border border-zinc-200 px-4">
                    {cart.map((line) => (
                      <div key={line.key} className="py-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-black">{line.name}</p>
                            {line.optionNames.length ? <p className="mt-1 text-xs font-bold text-zinc-400">{line.optionNames.join(", ")}</p> : null}
                          </div>
                          <p className="text-sm font-black">{formatPrice(line.unitPrice * line.quantity)}</p>
                        </div>
                        <div className="mt-3 flex items-center gap-3">
                          <button type="button" className="rounded-full bg-zinc-100 p-2" aria-label={`${line.name} 수량 줄이기`} onClick={() => changeLineQuantity(line.key, -1)}><Minus className="h-3.5 w-3.5" /></button>
                          <span className="text-sm font-black">{line.quantity}</span>
                          <button type="button" className="rounded-full bg-zinc-100 p-2" aria-label={`${line.name} 수량 늘리기`} onClick={() => changeLineQuantity(line.key, 1)}><Plus className="h-3.5 w-3.5" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <textarea
                    value={requestText}
                    maxLength={300}
                    onChange={(event) => { setRequestText(event.target.value); resetPendingRequest(); }}
                    className="mt-4 min-h-24 w-full rounded-2xl border border-zinc-200 p-4 text-sm font-bold outline-none focus:border-zinc-950"
                    placeholder="요청사항을 입력해 주세요. (최대 300자)"
                  />
                  <div className="mt-4 flex items-center justify-between text-lg font-black"><span>합계</span><span>{formatPrice(totalAmount)}</span></div>
                  <button
                    type="button"
                    className="mt-4 w-full rounded-2xl bg-zinc-950 px-5 py-4 text-sm font-black text-white disabled:opacity-50"
                    disabled={submitting}
                    onClick={submitOrder}
                  >
                    {submitting ? "주문 전송 중…" : "후불로 주문하기"}
                  </button>
                </section>
              ) : null}
            </div>
          )}
          {message ? <p className="mt-4 rounded-2xl bg-zinc-100 p-4 text-sm font-bold" role="status">{message}</p> : null}
        </div>
      </section>
    </div>
  );
}
