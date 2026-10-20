"use client";
import { formatMenuMoney } from "@/lib/menu-ui-copy";
import { useMenuLocale, useMenuText } from "@/components/menu-templates/shared/MenuLocaleScope";

import { useState } from "react";
import {
  canCustomerCancelOrder, CUSTOMER_ORDER_STATUS_LABELS, CUSTOMER_ORDER_STEPS,
  getCustomerPaymentLabel, type CustomerOrderSnapshot,
} from "@/lib/customer-order-history";
import styles from "./PostpayOrderCartDrawer.module.css";
import ui from "./MenuInteractionUI.module.css";



/** Preview-only UI until the visit-scoped history/cancellation API is connected. */
export default function CustomerOrderHistory({ orders, onCancel, onExamples }: {
  orders: CustomerOrderSnapshot[];
  onCancel: (id: string) => void;
  onExamples: () => void;
}) {
  const t = useMenuText();
  const locale = useMenuLocale();
  const money = (amount: number) => formatMenuMoney(amount, locale);
  const date = (value: string) => new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : locale, { timeZone: "Asia/Seoul", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
  const [confirmId, setConfirmId] = useState<string | null>(null);
  return <section aria-label={t("주문내역")} className={styles.history}>
    <p className={styles.historyHint}>{t("미리보기 주문내역입니다. 실제 매장에는 전송되지 않습니다.")}</p>
    {orders.length === 0 ? <div className={styles.empty}>
      <h3>{t("아직 주문 내역이 없어요")}</h3>
      <p>{t("주문하면 이곳에서 진행 상태와 결제 상태를 확인할 수 있어요.")}</p>
      <button type="button" className={`${ui.secondary} mt-6 px-5 py-3 text-sm`} onClick={onExamples}>{t("예시 주문 보기")}</button>
    </div> : orders.map(order => {
      const cancellable = canCustomerCancelOrder(order.status, order.paymentStatus);
      const step = CUSTOMER_ORDER_STEPS.findIndex(status => status === order.status);
      return <article key={order.id} className={styles.historyOrder} data-history-order={order.id}>
        <div className={styles.historyTitle}>
          <div><h3>{order.example ? t("예시 ") : ""}{t("주문")} {order.orderNumber}</h3>
            <p><time dateTime={order.createdAt}>{date(order.createdAt)}</time> · {order.tableLabel}</p></div>
          <div className={styles.historyState}>
            <strong>{t(CUSTOMER_ORDER_STATUS_LABELS[order.status])}</strong>
            <span>{t(getCustomerPaymentLabel(order.paymentStatus))}</span>
          </div>
        </div>
        {order.status !== "cancelled" ? <ol className={styles.progress} aria-label={t("주문 진행 상태")}>
          {CUSTOMER_ORDER_STEPS.map((status, index) => <li key={status}
            data-reached={index <= step} aria-current={index === step ? "step" : undefined}>
            {t(CUSTOMER_ORDER_STATUS_LABELS[status])}
          </li>)}
        </ol> : null}
        <ul className={styles.historyLines}>{order.lines.map((line, index) => <li key={index}>
          <div><p>{line.name} <span>× {line.quantity}</span></p>{line.options.length ? <small>{line.options.join(", ")}</small> : null}</div>
          <span>{money(line.unitPrice * line.quantity)}</span>
        </li>)}</ul>
        <div className={styles.historyTotal}><span>{t("주문 금액")}</span><strong>{money(order.totalAmount)}</strong></div>
        {order.status === "cancelled" ? <p className={styles.historyHint}>{t("주문이 취소되었습니다.")}</p>
          : cancellable ? confirmId === order.id ? <div className={styles.cancelConfirm}>
            <p role="status">{t("이 주문 전체를 취소할까요?")}</p>
            <button className={`${ui.secondary} px-4 py-2 text-sm`} onClick={() => setConfirmId(null)}>{t("돌아가기")}</button>
            <button className={`${ui.primary} px-4 py-2 text-sm`} onClick={() => { onCancel(order.id); setConfirmId(null); }}>{t("취소할게요")}</button>
          </div> : <div className={styles.cancelRow}>
            <p>{t("조리 준비 전에는 주문을 취소할 수 있어요.")}</p>
            <button type="button" className={`${ui.secondary} px-4 py-2 text-sm`} onClick={() => setConfirmId(order.id)}>{t("주문 취소")}</button>
          </div> : <p className={styles.historyHint}>{order.paymentStatus !== "unpaid" ? t("결제된 주문의 취소는 직원에게 문의해 주세요.") : t("조리 준비가 시작된 주문의 변경·취소는 직원에게 문의해 주세요.")}</p>}
      </article>;
    })}
  </section>;
}
