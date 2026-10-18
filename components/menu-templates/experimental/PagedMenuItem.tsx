"use client";

import { useEffect, useState } from "react";
import type {
  PublicMenuTemplateProps,
  PublicMenuItem,
  PublicMenuCategory,
  PublicMenuTimeSale,
} from "../types";
import ScriptAwareText from "../shared/ScriptAwareText";
import { getItemPriceTokensForCategory } from "../shared/cafe-menu-pricing";
import MenuOrderAddButton from "@/components/public-menu/order-call/MenuOrderAddButton";
import { getTemplateCapabilities } from "@/lib/template-capabilities";
import {
  formatMenuPriceByMode,
  getPriceDisplayModeFromSettings,
} from "@/lib/menu-price-format";
import {
  formatTimeSaleDigitalCountdownLabel,
  formatTimeSaleDeadlineLabel,
  getActiveMenuTimeSaleEndMs,
} from "@/lib/menu-time-sale-display";
import styles from "./RealMatchaPaged.module.css";

function SaleTime({
  sale,
  now,
  locale,
}: {
  sale: PublicMenuTimeSale;
  now: number;
  locale: PublicMenuTemplateProps["locale"];
}) {
  const [tick, setTick] = useState(now);
  useEffect(() => {
    if (sale.timeDisplayMode !== "countdown") return;
    const id = window.setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, [sale.timeDisplayMode]);
  const end = getActiveMenuTimeSaleEndMs(sale, tick);
  const text =
    sale.timeDisplayMode === "countdown" && end
      ? formatTimeSaleDigitalCountdownLabel(end, tick)
      : sale.displayText ||
        (end
          ? formatTimeSaleDeadlineLabel(
              sale,
              new Date(end).toISOString(),
              tick,
              locale,
            )
          : "");
  return text ? (
    <p className={styles.description}>
      <ScriptAwareText text={text} />
    </p>
  ) : null;
}

export default function PagedMenuItem({
  data,
  item,
  category,
  activeSales,
  now,
}: {
  data: PublicMenuTemplateProps;
  item: PublicMenuItem;
  category: PublicMenuCategory;
  activeSales: PublicMenuTimeSale[];
  now: number;
}) {
  const mode = getPriceDisplayModeFromSettings(
    data.menuSite.settings,
    "cafe_design_a",
  );
  const { priceTokens } = getItemPriceTokensForCategory(
    item,
    category,
    data.priceOptions,
    getTemplateCapabilities("cafe_design_a"),
    mode,
  );
  const sale = !item.is_sold_out
    ? activeSales.find((s) =>
        s.items.some(
          (target) => target.menuItemId === item.id && target.visible,
        ),
      )
    : undefined;
  const traits = item.traits_visible
    ? data.traits.filter(
        (t) => t.menu_item_id === item.id && t.visible !== false,
      )
    : [];
  return (
    <article className={styles.item} data-paged-item={item.id}>
      <div className={styles.itemTop}>
        <h3>
          <ScriptAwareText text={item.name} />
          {item.badge_label ? (
            <small>
              <ScriptAwareText text={item.badge_label} />
            </small>
          ) : null}
          {item.is_sold_out ? (
            <small>품절</small>
          ) : sale ? (
            <small>
              <ScriptAwareText text={sale.badgeText} />
            </small>
          ) : null}
        </h3>
        <div className={styles.price}>
          {priceTokens.map((token, index) => {
            const target = sale?.items.find(
              (t) =>
                t.menuItemId === item.id &&
                t.visible &&
                t.priceColumnId === (token.priceColumnId ?? null),
            );
            const discounted =
              target?.salePrice != null &&
              !item.price_label &&
              target.salePrice > 0 &&
              target.salePrice < (token.originalPrice ?? item.price ?? 0);
            return (
              <span key={index}>
                {token.label ? (
                  <small>
                    <ScriptAwareText text={token.label} />{" "}
                  </small>
                ) : null}
                {discounted ? (
                  <>
                    <del>
                      <ScriptAwareText text={token.price} />
                    </del>{" "}
                    <ScriptAwareText
                      text={
                        target.salePriceLabel ||
                        formatMenuPriceByMode(target.salePrice!, mode)
                      }
                    />
                  </>
                ) : (
                  <ScriptAwareText text={token.price} />
                )}
              </span>
            );
          })}
        </div>
        {!item.is_sold_out ? (
          <MenuOrderAddButton itemId={item.id} itemName={item.name} />
        ) : null}
      </div>
      {item.set_name ? (
        <p className={styles.secondary}>
          <ScriptAwareText text={item.set_name} />
        </p>
      ) : null}
      {item.description ? (
        <p className={styles.description}>
          <ScriptAwareText text={item.description} />
        </p>
      ) : null}
      {sale ? <SaleTime sale={sale} now={now} locale={data.locale} /> : null}
      {traits.length ? (
        <p className={styles.description}>
          {traits.map((t) => (
            <span key={t.id}>
              <ScriptAwareText text={`${t.label} ${t.value}/${t.max_value} `} />
            </span>
          ))}
        </p>
      ) : null}
      {item.origin_info ? (
        <p className={styles.description}>
          <ScriptAwareText text={item.origin_info} />
        </p>
      ) : null}
    </article>
  );
}
