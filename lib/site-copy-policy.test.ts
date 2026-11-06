import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { EmptyState } from "../app/components/ui/empty-state";
import SitePageHeader from "../components/layout/SitePageHeader";
import { SITE_COPY_RULES } from "./site-copy-policy";
const read = (file: string) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

test("title-only headers have no empty explanation or extra placeholder; explicit content keeps its type role", () => {
  const html = renderToStaticMarkup(h(SitePageHeader, {title: "메뉴판 관리"}));
  assert.match(html, /<h1[^>]*>메뉴판 관리<\/h1>/);
  assert.doesNotMatch(html, /<p|data-copy-purpose/);
  for (const purpose of ["requested", "state", "essential", "content"] as const) {
    const content = renderToStaticMarkup(h(SitePageHeader, {title: "제목", description: "필요한 정보", descriptionPurpose: purpose}));
    assert.match(content, new RegExp(`data-copy-purpose="${purpose}"`));
    assert.match(content, /class="type-page-description">필요한 정보/);
  }
  const empty = renderToStaticMarkup(h(EmptyState, {title: "표시할 주문 내역이 없습니다.", icon: null}));
  assert.match(empty, /표시할 주문 내역이 없습니다/);
  assert.doesNotMatch(empty, /site-empty-state-description/);
  assert.equal(SITE_COPY_RULES.length, 6);
});

test("requested notices, boxed explanations, real data and empty/error states survive the cleanup", () => {
  assert.match(read("components/mypage/floor-plan/FloorPlanDesktopNotice.tsx"), /배치도 편집은 PC에서 더 편리해요/);
  const device = read("components/mypage/OrderPointDeviceConnection.tsx");
  assert.match(device, /브라우저의 실제 OS·모델·브라우저 정보를 표시합니다/);
  assert.match(device, /관리자 로그인이 종료되고/);
  assert.match(read("components/mypage/TableTerminalConnections.tsx"), /현재 기기는 이.*연결되어 있지 않습니다/);
  const page = read("app/mypage/page.tsx");
  assert.doesNotMatch(page, /생성한 메뉴판을 편집하고 공개 상태를 확인|현재 편집과 공개가 가능한 메뉴판입니다/);
  assert.match(page, /이용이 종료되었지만 보관 기간 안에/);
  assert.match(page, /visibleMenuCardCount.toLocaleString/);
  assert.match(page, /<EmptyState/);
  assert.match(read("components/mypage/OperationsHistoryViews.tsx"), /표시할 \{noun\} 내역이 없습니다/);
  assert.match(read("components/mypage/DeleteOrderPoint.tsx"), /복원할 수 없습니다/);
  assert.match(read("app/mypage/menus/[menuId]/orders/page.tsx"), /카드 승인을 수행하지 않습니다/);
});

test("page-level floor-plan guidance moves into the existing help without removing workspace explanations or controls", () => {
  const source = read("components/mypage/floor-plan/FloorPlanEditor.tsx");
  assert.match(source, /<InfoTooltip label="테이블·키오스크 배치 안내">[^]*?마지막 저장 배치로 돌아갑니다[^]*?<\/InfoTooltip>/);
  assert.doesNotMatch(source, /<p className="type-footnote site-copy-muted">위치·크기·룸 구성은/);
  assert.match(source, /선택하면 기기별 주문·호출 허용과 연결 정보를/);
  assert.match(source, /renderSelectedActions/);
  assert.match(source, /id=\{helpId\}/);
  const connection = read("components/mypage/OrderPointConnectionDialog.tsx");
  assert.match(connection, /aria-describedby=\{undefined\}/);
  assert.doesNotMatch(connection, /<DialogDescription>/);
  assert.match(read("components/mypage/MenuQrDownloadModal.tsx"), /<DialogDescription[^>]*>\{menuName\}<\/DialogDescription>/);
});
