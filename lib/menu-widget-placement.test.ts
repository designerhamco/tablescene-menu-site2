import { readCafeTemplateSource } from "./test-helpers/cafe-template-source";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  addWidgetContentBlock,
  createMenuWidgetDraftFromWidget,
  type MenuEditorContentBlockDraftsByPageId,
} from "./menu-widget-editor-draft";
import { parseMenuWidgetRow } from "./menu-widget-db-mappers";
import {
  createDefaultMenuWidgetDraft,
  MENU_WIDGET_ASPECT_RATIOS,
  MENU_WIDGET_OBJECT_POSITIONS,
  normalizeMenuWidgetDraft,
} from "./menu-widgets";

const templateSource = readCafeTemplateSource();
const editorSource = readFileSync(
  new URL("../components/mypage/menu-editor/MenuManagementSection.tsx", import.meta.url),
  "utf8",
);
const widgetEditorSource = readFileSync(
  new URL("../components/mypage/menu-editor/MenuWidgetDraftEditor.tsx", import.meta.url),
  "utf8",
);
const widgetStylesSource = readFileSync(
  new URL("../components/menu-templates/CafeAWidgetBlock.module.css", import.meta.url),
  "utf8",
);
const widgetBlockSource = readFileSync(
  new URL("../components/menu-templates/CafeAWidgetBlock.tsx", import.meta.url),
  "utf8",
);
const globalStylesSource = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

function createCategoryBlock(id: string, sortOrder: number) {
  return {
    blockType: "category" as const,
    id,
    menuPageId: "page-1",
    sortOrder,
    visible: true,
  };
}

test("a new widget without an explicit anchor is appended after every category", () => {
  const state: MenuEditorContentBlockDraftsByPageId = {
    "page-1": [createCategoryBlock("coffee", 0), createCategoryBlock("dessert", 1)],
  };

  const nextState = addWidgetContentBlock(state, {
    pageId: "page-1",
    widgetId: "widget-1",
  });

  assert.deepEqual(
    nextState["page-1"]?.map((block) => `${block.blockType}:${block.id}`),
    ["category:coffee", "category:dessert", "widget:widget-1"],
  );
});

test("a customer-selected category remains a valid widget insertion anchor", () => {
  const state: MenuEditorContentBlockDraftsByPageId = {
    "page-1": [createCategoryBlock("coffee", 0), createCategoryBlock("dessert", 1)],
  };

  const nextState = addWidgetContentBlock(state, {
    pageId: "page-1",
    widgetId: "widget-1",
    afterBlockId: "coffee",
  });

  assert.deepEqual(
    nextState["page-1"]?.map((block) => `${block.blockType}:${block.id}`),
    ["category:coffee", "widget:widget-1", "category:dessert"],
  );
});

test("new widgets use ordinary content order without a placement mode", () => {
  const draft = createDefaultMenuWidgetDraft("text", {
    id: "widget-1",
    menuPageId: "page-1",
    sortOrder: 2,
  });
  assert.equal(draft.settings.placement, "flow");

  draft.title = "안내";
  draft.settings.placement = "flow";
  const widget = normalizeMenuWidgetDraft(draft, { menuSiteId: "site-1" });
  assert.equal(widget.settings.placement, "flow");
});

test("image widgets default to a centered focal point and preserve all nine positions", () => {
  assert.deepEqual(MENU_WIDGET_OBJECT_POSITIONS, [
    "top-left",
    "top-center",
    "top-right",
    "center-left",
    "center",
    "center-right",
    "bottom-left",
    "bottom-center",
    "bottom-right",
  ]);

  const draft = createDefaultMenuWidgetDraft("image", {
    id: "widget-image",
    menuPageId: "page-1",
    sortOrder: 0,
  });
  assert.equal(draft.settings.objectPosition, "center");

  draft.imageUrl = "/widget.png";
  draft.settings.objectPosition = "bottom-right";
  const widget = normalizeMenuWidgetDraft(draft, { menuSiteId: "site-1" });
  assert.equal(widget.type, "image");
  if (widget.type === "image") assert.equal(widget.settings.objectPosition, "bottom-right");

  assert.match(widgetEditorSource, /MENU_WIDGET_OBJECT_POSITIONS\.map/);
  assert.match(widgetEditorSource, /이미지 기준 위치/);
  assert.match(widgetBlockSource, /style=\{\{ objectPosition: OBJECT_POSITION_VALUE\[objectPosition\] \}\}/);
});

test("persisted widget settings accept legacy rows and explicit placement values", () => {
  const createRow = (placement?: "flow" | "bottom") => ({
    id: "00000000-0000-4000-8000-000000000001",
    menu_site_id: "00000000-0000-4000-8000-000000000002",
    menu_page_id: "00000000-0000-4000-8000-000000000003",
    widget_type: "text",
    title: "안내",
    description: "내용",
    image_url: null,
    image_path: null,
    sort_order: 0,
    visible: true,
    settings: {
      schemaVersion: 1,
      textAlign: "left",
      ...(placement ? { placement } : {}),
    },
    created_at: "2026-09-22T00:00:00.000Z",
    updated_at: "2026-09-22T00:00:00.000Z",
  }) as unknown as Parameters<typeof parseMenuWidgetRow>[0];

  const legacyResult = parseMenuWidgetRow(createRow());
  assert.equal(legacyResult.ok, true);
  if (legacyResult.ok) assert.equal(legacyResult.widget.settings.placement, "flow");

  const flowResult = parseMenuWidgetRow(createRow("flow"));
  assert.equal(flowResult.ok, true);
  if (flowResult.ok) assert.equal(flowResult.widget.settings.placement, "flow");

  const legacyRatioResult = parseMenuWidgetRow({
    ...createRow("bottom"),
    widget_type: "image",
    title: null,
    description: null,
    image_url: "/legacy-widget.png",
    settings: {
      schemaVersion: 1,
      aspectRatio: "3:2",
      objectFit: "cover",
      placement: "bottom",
    },
  } as unknown as Parameters<typeof parseMenuWidgetRow>[0]);
  assert.equal(legacyRatioResult.ok, true);
  if (legacyRatioResult.ok) {
    assert.equal(createMenuWidgetDraftFromWidget(legacyRatioResult.widget).settings.aspectRatio, "4:3");
    assert.equal(legacyRatioResult.widget.type, "image");
    if (legacyRatioResult.widget.type === "image") {
      assert.equal(legacyRatioResult.widget.settings.objectPosition, "center");
    }
  }

  const positionedResult = parseMenuWidgetRow({
    ...createRow("bottom"),
    widget_type: "image",
    title: null,
    description: null,
    image_url: "/positioned-widget.png",
    settings: {
      schemaVersion: 1,
      aspectRatio: "2:1",
      objectFit: "cover",
      objectPosition: "top-left",
      placement: "bottom",
    },
  } as unknown as Parameters<typeof parseMenuWidgetRow>[0]);
  assert.equal(positionedResult.ok, true);
  if (positionedResult.ok && positionedResult.widget.type === "image") {
    assert.equal(positionedResult.widget.settings.objectPosition, "top-left");
  }
});

test("all editors remove the retired bottom selector and movement locks", () => {
  assert.doesNotMatch(widgetEditorSource, /콘텐츠 이어붙이기|마지막 열 하단 정렬/);
  assert.doesNotMatch(editorSource, /하단 정렬 위젯은 목록 끝에 고정되며|isBottomWidgetLocked/);
  assert.doesNotMatch(globalStylesSource, /data-cafe-a-widget-dock-bottom="true"/);
  assert.match(templateSource, /renderDesktopMenuGrid\(\{ includeFooter: true \}\)/);
});

test("single-page image widgets expose the approved ratios on every device", () => {
  assert.deepEqual(MENU_WIDGET_ASPECT_RATIOS, ["3:1", "2:1", "4:3", "1:1", "3:4", "1:2", "1:3"]);
  assert.doesNotMatch(widgetStylesSource, /\.mediaFrame \{\s*aspect-ratio: 2 \/ 1;/);
  assert.match(
    widgetEditorSource,
    /선택한 비율이 PC·태블릿·모바일에 동일하게 적용됩니다\./,
  );
});
