"use client";

import { useState, useTransition } from "react";
import type { OrderCatalogSettingsItem } from "@/lib/server/menu-order-catalog-settings-service";
import type { OrderOptionGroupInput } from "@/lib/menu-order-configuration";
import { updateOrderItemConfiguration } from "./actions";

function ItemForm({
  item,
  menuId,
}: {
  item: OrderCatalogSettingsItem;
  menuId: string;
}) {
  const [value, setValue] = useState(item);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  function changeGroup(
    index: number,
    fn: (g: OrderOptionGroupInput) => OrderOptionGroupInput,
  ) {
    setValue((current) => ({
      ...current,
      groups: current.groups.map((g, i) => (i === index ? fn(g) : g)),
    }));
  }
  return (
    <details className="border-b border-zinc-200 py-5">
      <summary className="cursor-pointer font-semibold">
        {item.name}{" "}
        <span className="ml-2 text-sm font-normal text-zinc-500">
          {value.orderable ? "주문 가능" : "주문 꺼짐"}
          {!item.visible ? " · 메뉴 숨김" : item.soldOut ? " · 품절" : ""}
        </span>
      </summary>
      <div className="mt-6 max-w-3xl space-y-6">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={value.orderable}
            onChange={(e) =>
              setValue({ ...value, orderable: e.target.checked })
            }
          />{" "}
          이 상품 주문 사용
        </label>
        <label className="block text-sm font-semibold">
          기본 가격 (원)
          <input
            className="mt-2 block w-full rounded-xl border border-zinc-300 px-4 py-3 sm:max-w-xs"
            type="number"
            min={0}
            max={10000000}
            step={1}
            value={value.price}
            onChange={(e) =>
              setValue({ ...value, price: Number(e.target.value) })
            }
          />
        </label>
        <p className="text-sm text-zinc-500">
          메뉴의 기본 가격도 함께 저장됩니다. 화면 표시용 HOT·ICE 가격 열과 주문
          옵션은 별도이며, 판매 금액에 맞춰 직접 설정해 주세요. 숨김·품절 상품은
          담을 수 없습니다.
        </p>
        {value.groups.map((group, i) => (
          <fieldset key={group.id} className="border-t border-zinc-200 pt-5">
            <legend className="type-label px-2">옵션 그룹 {i + 1}</legend>
            <div className="mt-3 flex flex-wrap gap-3">
              <input
                aria-label="옵션 그룹 이름"
                className="min-w-0 flex-1 rounded-xl border border-zinc-300 px-4 py-3"
                maxLength={80}
                placeholder="예: 온도"
                value={group.name}
                onChange={(e) =>
                  changeGroup(i, (g) => ({ ...g, name: e.target.value }))
                }
              />
              <button
                type="button"
                className="site-button site-button-secondary"
                onClick={() =>
                  setValue({
                    ...value,
                    groups: value.groups.filter((g) => g.id !== group.id),
                  })
                }
              >
                그룹 삭제
              </button>
            </div>
            <div className="my-4 flex gap-5 text-sm">
              <label>
                <input
                  type="checkbox"
                  checked={group.required}
                  onChange={(e) =>
                    changeGroup(i, (g) => ({
                      ...g,
                      required: e.target.checked,
                    }))
                  }
                />{" "}
                필수 선택
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={group.multiple}
                  onChange={(e) =>
                    changeGroup(i, (g) => ({
                      ...g,
                      multiple: e.target.checked,
                    }))
                  }
                />{" "}
                여러 개 선택
              </label>
            </div>
            {group.values.map((option, j) => (
              <div
                key={option.id}
                className="mb-3 flex flex-wrap items-center gap-2"
              >
                <input
                  aria-label="옵션 이름"
                  className="min-w-0 flex-1 rounded-xl border border-zinc-300 px-4 py-3"
                  maxLength={80}
                  placeholder="예: ICE"
                  value={option.name}
                  onChange={(e) =>
                    changeGroup(i, (g) => ({
                      ...g,
                      values: g.values.map((v, n) =>
                        n === j ? { ...v, name: e.target.value } : v,
                      ),
                    }))
                  }
                />
                <label className="flex items-center gap-2 text-sm">
                  추가금
                  <input
                    aria-label="옵션 추가금"
                    className="w-28 rounded-xl border border-zinc-300 px-3 py-3"
                    type="number"
                    min={0}
                    max={10000000}
                    step={1}
                    value={option.priceDelta}
                    onChange={(e) =>
                      changeGroup(i, (g) => ({
                        ...g,
                        values: g.values.map((v, n) =>
                          n === j
                            ? { ...v, priceDelta: Number(e.target.value) }
                            : v,
                        ),
                      }))
                    }
                  />
                </label>
                <button
                  type="button"
                  className="site-button site-button-secondary"
                  onClick={() =>
                    changeGroup(i, (g) => ({
                      ...g,
                      values: g.values.filter((v) => v.id !== option.id),
                    }))
                  }
                >
                  삭제
                </button>
              </div>
            ))}
            <button
              type="button"
              className="site-button site-button-secondary"
              disabled={group.values.length >= 20}
              onClick={() =>
                changeGroup(i, (g) => ({
                  ...g,
                  values: [
                    ...g.values,
                    { id: crypto.randomUUID(), name: "", priceDelta: 0 },
                  ],
                }))
              }
            >
              옵션 추가
            </button>
          </fieldset>
        ))}
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="site-button site-button-secondary"
            disabled={value.groups.length >= 10}
            onClick={() =>
              setValue({
                ...value,
                groups: [
                  ...value.groups,
                  {
                    id: crypto.randomUUID(),
                    name: "",
                    required: true,
                    multiple: false,
                    values: [
                      { id: crypto.randomUUID(), name: "", priceDelta: 0 },
                    ],
                  },
                ],
              })
            }
          >
            옵션 그룹 추가
          </button>
          <button
            type="button"
            className="site-button site-button-primary"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await updateOrderItemConfiguration(
                  menuId,
                  value,
                );
                setMessage(result.message);
                if (result.updatedAt)
                  setValue((current) => ({
                    ...current,
                    updatedAt: result.updatedAt!,
                  }));
              })
            }
          >
            {pending ? "저장 중…" : "이 상품 저장"}
          </button>
        </div>
        {message ? (
          <p role="status" className="text-sm">
            {message}
          </p>
        ) : null}
      </div>
    </details>
  );
}
export default function OrderCatalogSettings({
  menuId,
  items,
}: {
  menuId: string;
  items: OrderCatalogSettingsItem[];
}) {
  return (
    <section className="mt-16">
      <h2 className="type-section-title">주문 상품·옵션</h2>
      <p className="site-body mt-4 mb-6 text-zinc-500">
        상품별 주문 사용과 필수·추가 옵션을 설정하세요. 기존 주문 내역의
        상품·가격은 보존됩니다.
      </p>
      {items.map((item) => (
        <ItemForm key={item.id} item={item} menuId={menuId} />
      ))}
    </section>
  );
}
