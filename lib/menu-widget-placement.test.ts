import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  addWidgetContentBlock,
  type MenuEditorContentBlockDraftsByPageId,
} from "./menu-widget-editor-draft";
import { parseMenuWidgetRow } from "./menu-widget-db-mappers";
import { createDefaultMenuWidgetDraft, normalizeMenuWidgetDraft } from "./menu-widgets";

const templateSource = readFileSync(
  new URL("../components/menu-templates/CafeDesignA.tsx", import.meta.url),
  "utf8",
);
const editorSource = readFileSync(
  new URL("../components/mypage/menu-editor/MenuManagementSection.tsx", import.meta.url),
  "utf8",
);
const widgetEditorSource = readFileSync(
  new URL("../components/mypage/menu-editor/MenuWidgetDraftEditor.tsx", import.meta.url),
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

test("new widgets default to bottom placement and preserve an explicit flow selection", () => {
  const draft = createDefaultMenuWidgetDraft("text", {
    id: "widget-1",
    menuPageId: "page-1",
    sortOrder: 2,
  });
  assert.equal(draft.settings.placement, "bottom");

  draft.title = "안내";
  draft.settings.placement = "flow";
  const widget = normalizeMenuWidgetDraft(draft, { menuSiteId: "site-1" });
  assert.equal(widget.settings.placement, "flow");
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
  if (legacyResult.ok) assert.equal(legacyResult.widget.settings.placement, "bottom");

  const flowResult = parseMenuWidgetRow(createRow("flow"));
  assert.equal(flowResult.ok, true);
  if (flowResult.ok) assert.equal(flowResult.widget.settings.placement, "flow");
});

test("bottom placement is persisted independently from content order and docks in the final column", () => {
  assert.match(templateSource, /function getBottomWidgetBlocks/);
  assert.match(templateSource, /dockBottomWidgetContentBlocks/);
  assert.match(templateSource, /dockBottomWidgetMeasurements/);
  assert.match(templateSource, /block\.widget\.placement !== "bottom"/);
  assert.match(templateSource, /data-cafe-a-widget-dock-bottom=\{dockToBottom \? "true" : undefined\}/);
  assert.match(templateSource, /data-cafe-a-widget-placement=\{block\.widget\.placement \?\? "bottom"\}/);
  assert.match(
    globalStylesSource,
    /\.cafe-a-balanced-column > \.cafe-a-menu-widget-block\[data-cafe-a-widget-dock-bottom="true"\] \{\s*margin-top: auto;/,
  );
  assert.match(widgetEditorSource, /콘텐츠 이어붙이기/);
  assert.match(widgetEditorSource, /마지막 열 하단 정렬/);
  assert.match(editorSource, /위젯 추가·수정에서 콘텐츠 순서대로 배치하거나 마지막 열 하단에 정렬하도록 선택/);
});

test("a docked widget and footer notices share the category separation gap", () => {
  assert.match(
    globalStylesSource,
    /data-cafe-a-widget-placement="bottom"\]:has\(\+ \.cafe-a-footer-info\) \{\s*margin-bottom: var\(--cafe-a-category-no-divider-gap\);/,
  );
  assert.match(
    globalStylesSource,
    /cafe-a-balanced-column:has\(> \.cafe-a-menu-widget-block\[data-cafe-a-widget-dock-bottom="true"\]\) > \.cafe-a-footer-info \{\s*margin-top: 0;/,
  );
  assert.match(templateSource, /renderDesktopMenuGrid\(\{ includeFooter: true \}\)/);
});
