import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  addWidgetContentBlock,
  type MenuEditorContentBlockDraftsByPageId,
} from "./menu-widget-editor-draft";

const templateSource = readFileSync(
  new URL("../components/menu-templates/CafeDesignA.tsx", import.meta.url),
  "utf8",
);
const editorSource = readFileSync(
  new URL("../components/mypage/menu-editor/MenuManagementSection.tsx", import.meta.url),
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

test("only trailing widget runs dock to the bottom of the final desktop column", () => {
  assert.match(templateSource, /function getTrailingWidgetBlocks/);
  assert.match(templateSource, /dockTrailingWidgetContentBlocks/);
  assert.match(templateSource, /dockTrailingWidgetMeasurements/);
  assert.match(templateSource, /data-cafe-a-widget-dock-bottom=\{dockToBottom \? "true" : undefined\}/);
  assert.match(
    globalStylesSource,
    /\.cafe-a-balanced-column > \.cafe-a-menu-widget-block\[data-cafe-a-widget-dock-bottom="true"\] \{\s*margin-top: auto;/,
  );
  assert.match(editorSource, /메뉴 끝에 연속해 배치한 위젯은 PC·태블릿에서 마지막 열 하단에 정렬됩니다/);
});
