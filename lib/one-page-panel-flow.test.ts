import test from "node:test";
import assert from "node:assert/strict";
import { getStarterPreset } from "./menu-starter-presets";
import { getFixedOnePageLayoutShell } from "./one-page-layout-shells";
import { getOnePageTotalColumnCount } from "./one-page-fit-policy";
import { PANEL_INTRO_KEY, PANEL_FEATURED_IMAGE, PANEL_MOBILE_FEATURED_IMAGE, resolvePanelTextInk, withPanelIntro } from "./one-page-panel-flow";
import { getTemplateLayoutRules } from "./template-layout-rules";
import { getTemplateCapabilities } from "./template-capabilities";
import { usesOnePageProportionPolicy } from "./one-page-proportion-policy";
import { getFallbackCategoryOrders } from "./one-page-category-order";
import type { MenuPageGroup } from "@/components/menu-templates/shared/cafe-template-types";

test("panel shell shares fitting without reserving an extra brand column", () => {
 assert.equal(getFixedOnePageLayoutShell("restaurant_onue_a"), "brand_panel_flow");
 for (const columns of [1, 2, 3, 4]) assert.equal(getOnePageTotalColumnCount("brand_panel_flow", columns), columns);
 assert.equal(getTemplateLayoutRules("restaurant_onue_a").maxColumns.tablet, 4);
 assert.equal(usesOnePageProportionPolicy("restaurant_onue_a"), true);
 assert.equal(getTemplateCapabilities("restaurant_onue_a").brandLogo, true);
 const preset = getStarterPreset("restaurant_onue_a");
 assert.equal(preset.pages.flatMap(p=>p.categories.flatMap(c=>c.items)).filter(i=>i.image_url).length, 3);
 assert.equal(PANEL_FEATURED_IMAGE.width / PANEL_FEATURED_IMAGE.height, 4 / 3);
 assert.equal(PANEL_MOBILE_FEATURED_IMAGE.width / PANEL_MOBILE_FEATURED_IMAGE.height, 1);
});

test("plain representative content keeps readable saved ink and falls back when it is white", () => {
 assert.equal(resolvePanelTextInk("#713F36", "#000000"), "#713F36");
 assert.equal(resolvePanelTextInk("#FFFFFF", "#713F36"), "#713F36");
 assert.equal(resolvePanelTextInk("#FFFFFF", "#FFF9EE"), "#33221E");
});

test("intro is a measured unsaved barrier ahead of every category order candidate", () => {
 const groups = [{page: {id: "page"}, groups: [], blocks: []}] as unknown as MenuPageGroup[];
 const output=withPanelIntro(groups);
 assert.equal(groups[0].blocks.length, 0);
 assert.equal(output[0].blocks[0].key, PANEL_INTRO_KEY);
 const blocks=[{order:0,blockType:"widget" as const}, {order:1,blockType:"category" as const,affinity:"coffee",categoryRank:1}, {order:2,blockType:"category" as const,affinity:"dessert",categoryRank:4}];
 for(const candidate of getFallbackCategoryOrders(blocks, "conventional")) assert.equal(candidate[0].order, 0);
});

test("panel-flow defaults to fill in preview and editor while an explicit choice survives", async () => {
 const { getDefaultPcTabletLayoutMode, getPcTabletLayoutModeFromPageSettings, normalizePcTabletLayoutMode } = await import("./menu-layout-modes");
 assert.equal(getDefaultPcTabletLayoutMode("restaurant_onue_a"), "orderedFit");
 assert.equal(getPcTabletLayoutModeFromPageSettings({}, "restaurant_onue_a"), "orderedFit");
 assert.equal(normalizePcTabletLayoutMode(undefined, "restaurant_onue_a"), "orderedFit");
 assert.equal(getPcTabletLayoutModeFromPageSettings({design:{pcTabletLayoutMode:"orderedBalancedFit"}}, "restaurant_onue_a"), "orderedBalancedFit");
 assert.equal(getDefaultPcTabletLayoutMode("cafe_design_a"), "orderedBalancedFit");
});
