"use client";

import { Check, CheckCircle2, ChevronLeft, CreditCard, Minus, Plus, ShieldCheck, ShoppingBag, Smartphone, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type {
  OrderCheckoutMode,
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
  checkoutMode?: OrderCheckoutMode;
  checkoutModes?: OrderCheckoutMode[];
  previewOnly?: boolean;
  selectedMenuItemId?: string | null;
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

function getCheckoutModeLabel(mode: OrderCheckoutMode) {
  return mode === "prepay" ? "지금 결제" : "후불 결제";
}

export default function PostpayOrderCartDrawer({
  open,
  onClose,
  menuSiteId,
  cartScope,
  catalog,
  checkoutMode = "postpay",
  checkoutModes,
  previewOnly = false,
  selectedMenuItemId = null,
  onCountChange,
}: PostpayOrderCartDrawerProps) {
  const storageKey = `menulink-postpay-cart:${menuSiteId}:${cartScope}`;
  const availableCheckoutModes = useMemo(() => {
    const allowed = checkoutModes?.filter((mode, index, modes) => modes.indexOf(mode) === index) ?? [checkoutMode];
    return allowed.length ? allowed : [checkoutMode];
  }, [checkoutMode, checkoutModes]);
  const [selectedCheckoutMode, setSelectedCheckoutMode] = useState<OrderCheckoutMode>(availableCheckoutModes[0] ?? checkoutMode);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [hydratedScope, setHydratedScope] = useState<string | null>(null);
  const [activeItem, setActiveItem] = useState<PostpayOrderCatalogItem | null>(null);
  const [selectedOptionIds, setSelectedOptionIds] = useState<Set<string>>(new Set());
  const [quantity, setQuantity] = useState(1);
  const [requestText, setRequestText] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null);
  const [checkoutPreviewOpen, setCheckoutPreviewOpen] = useState(false);
  const [paymentPreviewComplete, setPaymentPreviewComplete] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let nextCart: CartLine[] = [];
    if (!previewOnly) {
      try {
        const parsed = JSON.parse(window.localStorage.getItem(storageKey) ?? "[]") as StoredCartLine[];
        nextCart = Array.isArray(parsed) ? parsed.flatMap((line) => hydrateCartLine(line, catalog) ?? []) : [];
      } catch {}
    }
    queueMicrotask(() => {
      if (cancelled) return;
      setCart(nextCart);
      setHydratedScope(storageKey);
    });
    return () => { cancelled = true; };
  }, [catalog, previewOnly, storageKey]);

  useEffect(() => {
    if (hydratedScope !== storageKey) return;
    const stored = cart.map(({ menuItemId, quantity: lineQuantity, optionValueIds }) => ({
      menuItemId,
      quantity: lineQuantity,
      optionValueIds,
    }));
    if (!previewOnly) {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(stored));
      } catch {}
    }
    onCountChange(cart.reduce((sum, line) => sum + line.quantity, 0));
  }, [cart, hydratedScope, onCountChange, previewOnly, storageKey]);

  useEffect(() => {
    if (!open || !selectedMenuItemId) return;
    const item = catalog.find((candidate) => candidate.id === selectedMenuItemId);
    if (!item) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setActiveItem(item);
      setSelectedOptionIds(new Set());
      setQuantity(1);
      setMessage("");
      setCheckoutPreviewOpen(false);
      setPaymentPreviewComplete(false);
    });
    return () => { cancelled = true; };
  }, [catalog, open, selectedMenuItemId]);

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
    if (previewOnly) {
      setMessage("후불 주문 완료 화면 미리보기입니다. 실제 주문은 전송되지 않았습니다.");
      return;
    }
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

  function openCheckoutPreview() {
    setMessage("");
    setPaymentPreviewComplete(false);
    setCheckoutPreviewOpen(true);
  }

  function closeNestedPanel() {
    if (checkoutPreviewOpen) {
      setPaymentPreviewComplete(false);
      setCheckoutPreviewOpen(false);
      return;
    }
    if (activeItem) {
      setActiveItem(null);
      return;
    }
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1200] bg-white text-zinc-950 md:hidden" role="dialog" aria-modal="true" aria-label="장바구니">
      <section className="mx-auto flex h-[100dvh] w-full max-w-lg flex-col bg-white">
        <header className="flex items-center justify-between border-b border-zinc-100 px-4 pb-3 pt-[max(12px,env(safe-area-inset-top))]">
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100"
            onClick={closeNestedPanel}
            aria-label={checkoutPreviewOpen || activeItem ? "장바구니로" : "장바구니 닫기"}
          >
            {checkoutPreviewOpen || activeItem ? <ChevronLeft className="h-5 w-5" /> : <X className="h-5 w-5" />}
          </button>
          <h2 className="text-base font-black">
            {checkoutPreviewOpen ? paymentPreviewComplete ? "결제 완료" : "PG 결제" : activeItem ? activeItem.name : "장바구니"}
          </h2>
          <span className="min-w-10 text-right text-xs font-black text-zinc-500">{totalUnits}/50</span>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {checkoutPreviewOpen && paymentPreviewComplete ? (
            <div className="py-10 text-center">
              <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="h-10 w-10" aria-hidden="true" />
              </span>
              <h3 className="mt-6 text-2xl font-black">결제 요청을 확인했어요</h3>
              <p className="mt-2 text-sm font-bold leading-relaxed text-zinc-500">결제 승인 후 매장으로 주문이 전송됩니다.</p>
              <div className="mt-6 rounded-2xl bg-zinc-100 p-4 text-left">
                <div className="flex items-center justify-between text-sm font-black">
                  <span>결제 금액</span>
                  <span>{formatPrice(totalAmount)}</span>
                </div>
                <p className="mt-3 text-xs font-bold leading-relaxed text-sky-800">
                  화면 미리보기 전용입니다. 실제 결제 승인이나 주문 전송은 발생하지 않았습니다.
                </p>
              </div>
              <button type="button" className="mt-6 w-full rounded-2xl bg-zinc-950 px-5 py-4 text-sm font-black text-white" onClick={() => setPaymentPreviewComplete(false)}>
                결제 화면 다시 보기
              </button>
            </div>
          ) : checkoutPreviewOpen ? (
            <div className="space-y-5">
              <div className="rounded-3xl bg-zinc-950 p-5 text-white">
                <div className="flex items-center gap-2 text-xs font-black text-emerald-300">
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                  안전한 PG 결제
                </div>
                <p className="mt-5 text-sm font-bold text-zinc-300">결제 예정 금액</p>
                <p className="mt-1 text-3xl font-black">{formatPrice(totalAmount)}</p>
              </div>
              <section>
                <h3 className="text-sm font-black">주문 내역</h3>
                <div className="mt-3 divide-y divide-zinc-100 rounded-2xl border border-zinc-200 px-4">
                  {cart.map((line) => (
                    <div key={line.key} className="flex items-start justify-between gap-3 py-3 text-sm">
                      <div>
                        <p className="font-black">{line.name} · {line.quantity}개</p>
                        {line.optionNames.length ? <p className="mt-1 text-xs font-bold text-zinc-400">{line.optionNames.join(", ")}</p> : null}
                      </div>
                      <p className="font-black">{formatPrice(line.unitPrice * line.quantity)}</p>
                    </div>
                  ))}
                </div>
              </section>
              <section>
                <h3 className="text-sm font-black">결제 수단</h3>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <button type="button" className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-zinc-950 bg-zinc-50 text-sm font-black">
                    <CreditCard className="h-6 w-6" aria-hidden="true" /> 카드 결제
                  </button>
                  <button type="button" className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border border-zinc-200 text-sm font-black text-zinc-600">
                    <Smartphone className="h-6 w-6" aria-hidden="true" /> 간편결제
                  </button>
                </div>
              </section>
              <p className="rounded-2xl bg-sky-50 p-4 text-xs font-bold leading-relaxed text-sky-800">
                화면 미리보기 전용입니다. PortOne 결제창을 열거나 실제 승인·주문을 생성하지 않습니다.
              </p>
              <button type="button" className="w-full rounded-2xl bg-emerald-700 px-5 py-4 text-sm font-black text-white" onClick={() => setPaymentPreviewComplete(true)}>
                {formatPrice(totalAmount)} 결제하기
              </button>
            </div>
          ) : activeItem ? (
            <div className="space-y-5">
              <div>
                <p className="text-xl font-black">{activeItem.name}</p>
                <p className="mt-1 text-sm font-bold text-zinc-500">{formatPrice(activeItem.price)}</p>
              </div>
              {activeItem.optionGroups.map((group) => (
                <fieldset key={group.id} className="rounded-2xl border border-zinc-200 p-4">
                  <legend className="px-1 text-sm font-black">{group.name} {group.isRequired ? <span className="text-red-600">필수</span> : null}</legend>
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
              {message ? <p className="rounded-2xl bg-zinc-100 p-4 text-sm font-bold" role="status">{message}</p> : null}
            </div>
          ) : (
            <div className="space-y-6">
              {cart.length ? (
                <>
                  <section>
                    <div className="divide-y divide-zinc-100 rounded-3xl border border-zinc-200 px-4">
                      {cart.map((line) => (
                        <div key={line.key} className="py-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-black">{line.name}</p>
                              {line.optionNames.length ? <p className="mt-1 text-xs font-bold text-zinc-400">{line.optionNames.join(", ")}</p> : null}
                            </div>
                            <p className="text-sm font-black">{formatPrice(line.unitPrice * line.quantity)}</p>
                          </div>
                          <div className="mt-3 flex items-center justify-end gap-3">
                            <button type="button" className="rounded-full bg-zinc-100 p-2" aria-label={`${line.name} 수량 줄이기`} onClick={() => changeLineQuantity(line.key, -1)}><Minus className="h-3.5 w-3.5" /></button>
                            <span className="text-sm font-black">{line.quantity}</span>
                            <button type="button" className="rounded-full bg-zinc-100 p-2" aria-label={`${line.name} 수량 늘리기`} onClick={() => changeLineQuantity(line.key, 1)}><Plus className="h-3.5 w-3.5" /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                  <button type="button" className="flex w-full items-center justify-center gap-2 rounded-2xl border border-zinc-300 px-5 py-3.5 text-sm font-black" onClick={onClose}>
                    <Plus className="h-4 w-4" aria-hidden="true" /> 메뉴 더 담기
                  </button>
                  <textarea
                    value={requestText}
                    maxLength={300}
                    onChange={(event) => { setRequestText(event.target.value); resetPendingRequest(); }}
                    className="min-h-24 w-full rounded-2xl border border-zinc-200 p-4 text-sm font-bold outline-none focus:border-zinc-950"
                    placeholder="요청사항을 입력해 주세요. (최대 300자)"
                  />
                  <div className="flex items-center justify-between text-lg font-black"><span>최종 주문 금액</span><span>{formatPrice(totalAmount)}</span></div>
                  <section>
                    <h3 className="text-sm font-black">결제 방식</h3>
                    <div className="mt-3 grid grid-cols-2 rounded-2xl bg-zinc-100 p-1" role="group" aria-label="결제 방식 선택">
                      {availableCheckoutModes.map((mode) => {
                        const selected = mode === selectedCheckoutMode;
                        return (
                          <button
                            key={mode}
                            type="button"
                            aria-pressed={selected}
                            className={`rounded-xl px-3 py-3 text-sm font-black transition-colors ${selected ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-500"}`}
                            onClick={() => { setSelectedCheckoutMode(mode); setMessage(""); }}
                          >
                            {getCheckoutModeLabel(mode)}
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-2 text-xs font-bold leading-relaxed text-zinc-500">
                      {selectedCheckoutMode === "prepay" ? "휴대폰에서 바로 결제한 뒤 주문을 전송합니다." : "지금 주문하고 매장에서 나중에 결제합니다."}
                    </p>
                  </section>
                  <button
                    type="button"
                    className="w-full rounded-2xl bg-emerald-700 px-5 py-4 text-sm font-black text-white disabled:opacity-50"
                    disabled={submitting}
                    onClick={selectedCheckoutMode === "prepay" ? openCheckoutPreview : submitOrder}
                  >
                    {submitting ? "주문 전송 중…" : selectedCheckoutMode === "prepay" ? `${formatPrice(totalAmount)} 결제하기` : "후불로 주문하기"}
                  </button>
                </>
              ) : (
                <div className="flex min-h-[60dvh] flex-col items-center justify-center text-center">
                  <span className="flex h-20 w-20 items-center justify-center rounded-full bg-zinc-100 text-zinc-400"><ShoppingBag className="h-9 w-9" /></span>
                  <h3 className="mt-5 text-xl font-black">장바구니가 비어 있어요</h3>
                  <p className="mt-2 text-sm font-bold text-zinc-500">메뉴판에서 원하는 메뉴를 담아보세요.</p>
                  <button type="button" className="mt-6 rounded-full bg-zinc-950 px-6 py-3 text-sm font-black text-white" onClick={onClose}>메뉴 보러 가기</button>
                </div>
              )}
              {message ? <p className="rounded-2xl bg-zinc-100 p-4 text-sm font-bold" role="status">{message}</p> : null}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
