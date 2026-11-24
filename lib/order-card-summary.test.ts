import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Summary, { DEFAULT_ORDER_CARD_FIELDS, ORDER_CARD_FIELDS } from "../components/mypage/OrderCardSummary";
import { representativeOperationOrder, type OperationHistoryRecord } from "./operations-history";

const row = (id: string, createdAt: string, processing = false, unpaid = false): OperationHistoryRecord => ({
  id, pointId: "table", pointLabel: "1번 테이블", summary: `상품 ${id}`, time: createdAt, createdAt,
  status: processing ? "조리중" : "픽업·서빙 완료", attention: processing || unpaid,
  processing, unpaid, orderStatus: processing ? "cooking" : "served",
  orderNumber: Number(id), itemCount: Number(id), totalAmount: Number(id) * 1000,
});
const timestamp = "2026-11-10T14:59:00Z";
const now = Date.parse(timestamp) + 5 * 60_000;

test("대표 주문은 가장 오래된 진행 주문·미결제·최근 이력 순이다", () => {
  const paid = row("1", "2020-01-01T00:00:00Z");
  const unpaid = row("2", "2020-01-02T00:00:00Z", false, true);
  const progress = row("3", "2020-01-03T00:00:00Z", true);
  const newer = row("4", "2020-01-04T00:00:00Z", true, true);
  assert.equal(representativeOperationOrder([newer, paid, unpaid, progress])?.id, "3");
  assert.equal(representativeOperationOrder([paid, unpaid])?.id, "2");
  assert.equal(representativeOperationOrder([paid, { ...unpaid, unpaid: false }])?.id, "2");
});

test("테이블 카드는 대표 주문의 시각·상태와 해당 테이블의 주문·상품 수량 및 금액 합계를 표시한다", () => {
  const order = row("3", timestamp, true, true);
  const extra = row("5", "2026-11-10T14:50:00Z", false, true);
  const html = renderToStaticMarkup(createElement(Summary, {
    pointLabel: order.pointLabel, order, records: [order, extra],
    fields: new Set(ORDER_CARD_FIELDS.map(field => field.id)), now,
  }));
  assert.match(html, /#3.*1번 테이블.*조리중.*23:59:00.*주문 후 5분.*주문 총 2건.*메뉴 총 8개.*합계 8,000원.*열기/);
  assert.doesNotMatch(html, /#5|상품 3|상품 5/);
});

test("보기필터 기본값과 전체 해제 시에도 테이블 이름과 열기 진입을 유지한다", () => {
  const order = row("3", timestamp, true, true);
  const render = (fields: ReadonlySet<(typeof ORDER_CARD_FIELDS)[number]["id"]>) =>
    renderToStaticMarkup(createElement(Summary, { pointLabel: order.pointLabel, order, records: [order], fields, now }));
  const defaults = render(new Set(DEFAULT_ORDER_CARD_FIELDS));
  assert.match(defaults, /조리중.*주문 후 5분.*주문 총 1건.*메뉴 총 3개.*열기/);
  assert.doesNotMatch(defaults, /#3|23:59:00|3,000원/);
  const hidden = render(new Set());
  assert.match(hidden, /1번 테이블.*열기/);
  assert.doesNotMatch(hidden, /조리중|주문 후|주문 총|메뉴 총/);
});
