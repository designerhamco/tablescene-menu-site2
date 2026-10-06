import assert from "node:assert/strict";
import test from "node:test";

import { ENGLISH_FONT_OPTIONS } from "./font-options";
import { getStarterPreset } from "./menu-starter-presets";
import { TEMPLATE_BADGE_STYLE_PRESETS } from "./template-badge-styles";
import { getSinglePageStarterTranslations } from "./template-demo-data/single-page-starter-translations";
import { mergeTypographySettings } from "./template-typography-presets";

const SINGLE_PAGE_DENSITY_CONTRACT = {
  cafe_design_a: [3, 4, 3, 3, 5],
  cafe_mocha_forest_a: [3, 5, 4, 3, 3],
  cafe_sunday_line_a: [3, 3, 2, 3, 6],
  cafe_van_gogh_a: [3, 4, 3, 3, 4],
  cafe_round_focus_a: [3, 4, 4, 4, 4],
  fast_food_loop_bagel_a: [4, 4, 4, 3, 4],
} as const;

for (const [templateKey, expectedCategoryCounts] of Object.entries(SINGLE_PAGE_DENSITY_CONTRACT)) {
  test(`${templateKey} starter keeps a balanced single-page menu density`, () => {
    const preset = getStarterPreset(templateKey);
    assert.equal(preset.pages.length, 1);

    const categories = preset.pages[0]?.categories ?? [];
    assert.deepEqual(
      categories.map((category) => category.items.length),
      [...expectedCategoryCounts],
    );

    const itemKeys = categories.flatMap((category) => category.items.map((item) => item.key));
    assert.equal(itemKeys.every((key) => typeof key === "string" && key.length > 0), true);
    assert.equal(new Set(itemKeys).size, itemKeys.length);
    if (templateKey === "fast_food_loop_bagel_a") {
      const items = categories.flatMap((category) => category.items);
      assert.equal(items.every((item) => !item.set_name?.trim()), true);
      const creamCheeseItems = new Set(["plain-cream-cheese", "scallion-cream-cheese", "honey-walnut-cream-cheese"]);
      assert.equal(
        items.every((item) => creamCheeseItems.has(item.key ?? "") ? !item.description.trim() : Boolean(item.description.trim())),
        true,
      );
    } else if (templateKey === "cafe_mocha_forest_a" || templateKey === "cafe_round_focus_a") {
      const items = categories.flatMap((category) => category.items);
      assert.equal(items.every((item) => !item.set_name?.trim()), true);
      if (templateKey === "cafe_mocha_forest_a") {
        assert.equal(items.every((item) => Boolean(item.description?.trim())), true);
        const mochaBadges = new Map(
          items.filter((item) => item.badge_label?.trim()).map((item) => [item.key, item.badge_label] as const),
        );
        assert.deepEqual(mochaBadges, new Map([
          ["forest-mocha", "SIGNATURE"],
          ["hazelnut-cream-latte", "BEST"],
        ]));
      } else {
        assert.equal(items.every((item) => Boolean(item.description.trim())), true);
      }
    } else {
      assert.equal(
        categories.flatMap((category) => category.items).every((item) => Boolean(item.set_name?.trim())),
        true,
        `${templateKey}: every starter item needs a secondary-language name`,
      );
    }

    const itemByKey = new Map(
      categories.flatMap((category) => category.items.map((item) => [item.key, item] as const)),
    );

    for (const sale of preset.time_sales ?? []) {
      for (const target of sale.targets ?? []) {
        const item = itemByKey.get(target.target_item_key);
        assert.ok(item, `${templateKey}: missing promotion target ${target.target_item_key}`);
        assert.notEqual(
          item.badge_label?.trim().toLocaleLowerCase(),
          sale.badge_text?.trim().toLocaleLowerCase(),
          `${templateKey}: ${target.target_item_key} repeats the promotion badge`,
        );
      }
    }
  });
}

test("every active single-page starter includes a sixty-minute stock closeout countdown", () => {
  const expectedCloseoutKeys = new Map([
    ["cafe_design_a", "classic-butter-scone-closeout"],
    ["cafe_mocha_forest_a", "dark-chocolate-brownie-closeout"],
    ["cafe_sunday_line_a", "brown-butter-scone-closeout"],
    ["cafe_van_gogh_a", "salted-caramel-scone-closeout"],
    ["cafe_round_focus_a", "truffle-fries-last-call"],
    ["fast_food_loop_bagel_a", "everything-bagel-closeout"],
  ]);

  for (const [templateKey, expectedSaleKey] of expectedCloseoutKeys) {
    const preset = getStarterPreset(templateKey);
    const closeout = preset.time_sales?.find((sale) => sale.key === expectedSaleKey);
    assert.ok(closeout, `${templateKey}: stock closeout`);
    assert.equal(closeout.duration_minutes, 60, `${templateKey}: stock closeout duration`);
    assert.equal(closeout.time_display_mode, "countdown", `${templateKey}: stock closeout display mode`);
    assert.match(
      closeout.badge_text ?? "",
      templateKey === "cafe_round_focus_a" ? /LAST CALL/ : templateKey === "cafe_van_gogh_a" ? /LAST BATCH/ : /재고 마감/,
      `${templateKey}: stock closeout badge`,
    );
  }

});

test("starter-specific image and promotion presentation stays intentional", () => {
  const loopBagel = getStarterPreset("fast_food_loop_bagel_a");
  const loopBagelItems = loopBagel.pages[0]?.categories.flatMap((category) => category.items) ?? [];
  assert.equal(loopBagel.site.restaurant_name, "LOOP BAGEL");
  assert.equal(loopBagel.site.restaurant_category, "패스트푸드");
  assert.equal(loopBagel.site.restaurant_type, "fast_food");
  assert.equal(loopBagelItems.length, 19);
  assert.equal(loopBagelItems.every((item) => !item.set_name?.trim()), true);
  assert.equal(loopBagelItems.every((item) => !item.price_options?.length), true);
  const loopBagelDrinks = loopBagel.pages[0]?.categories.find((category) => category.key === "coffee-drinks");
  assert.equal(
    loopBagel.pages[0]?.categories
      .filter((category) => category.key !== "coffee-drinks")
      .flatMap((category) => category.items)
      .every((item) => Boolean(item.image_url)),
    true,
  );
  assert.equal(loopBagelDrinks?.price_columns, undefined);
  assert.equal(loopBagelDrinks?.items.every((item) => !item.price_column_values?.length), true);
  const loopBagelCreamCheese = loopBagel.pages[0]?.categories.find((category) => category.key === "cream-cheese");
  assert.equal(loopBagelCreamCheese?.description, "매일 구운 베이글에 취향대로 곁들이는 세 가지 크림치즈");
  assert.equal(loopBagelCreamCheese?.description_visible, true);
  assert.equal(loopBagelCreamCheese?.items.every((item) => !item.description.trim()), true);
  const loopBagelEggCheeseHam = loopBagel.pages[0]?.categories
    .flatMap((category) => category.items)
    .find((item) => item.key === "egg-cheese-bagel");
  assert.equal(loopBagelEggCheeseHam?.name, "에그 햄치즈 베이글");
  assert.match(loopBagelEggCheeseHam?.description ?? "", /햄/);
  assert.equal(loopBagelEggCheeseHam?.image_url, "/menu-templates/fast_food_loop_bagel_a/egg-ham-cheese-bagel.png");
  assert.deepEqual(
    loopBagel.pages[0]?.categories.map((category) => category.key),
    ["signature-bagels", "classic-bagels", "bagel-sandwiches", "cream-cheese", "coffee-drinks"],
  );
  assert.deepEqual(
    loopBagel.pages[0]?.categories.find((category) => category.key === "classic-bagels")?.items.map((item) => item.image_url),
    [
      "/menu-templates/fast_food_loop_bagel_a/classic-plain-bagel.png",
      "/menu-templates/fast_food_loop_bagel_a/onion-bagel.png",
      "/menu-templates/fast_food_loop_bagel_a/blueberry-bagel.png",
      "/menu-templates/fast_food_loop_bagel_a/black-olive-bagel.png",
    ],
  );
  assert.deepEqual(
    loopBagel.pages[0]?.categories.find((category) => category.key === "bagel-sandwiches")?.items.map((item) => item.image_url),
    [
      "/menu-templates/fast_food_loop_bagel_a/egg-ham-cheese-bagel.png",
      "/menu-templates/fast_food_loop_bagel_a/basil-chicken-bagel-sandwich.png",
      "/menu-templates/fast_food_loop_bagel_a/salmon-dill-bagel-sandwich-v2.png",
      "/menu-templates/fast_food_loop_bagel_a/mushroom-melt-bagel-sandwich.png",
    ],
  );
  assert.deepEqual(
    loopBagelCreamCheese?.items.map((item) => item.image_url),
    [
      "/menu-templates/fast_food_loop_bagel_a/plain-cream-cheese.png",
      "/menu-templates/fast_food_loop_bagel_a/scallion-cream-cheese.png",
      "/menu-templates/fast_food_loop_bagel_a/honey-walnut-cream-cheese.png",
    ],
  );
  assert.equal(loopBagelDrinks?.items.every((item) => !item.image_url), true);
  assert.equal(
    loopBagel.featured_slides?.some(
      (slide) => slide.featured_item_key === "honey-walnut-cream-cheese"
        && slide.image_url === "/menu-templates/fast_food_loop_bagel_a/honey-walnut-cream-cheese.png",
    ),
    true,
  );
  assert.equal(
    mergeTypographySettings("fast_food_loop_bagel_a", loopBagel.site.settings?.typography).english_font_key,
    "bagel-fat-one",
  );
  assert.equal(
    mergeTypographySettings("fast_food_loop_bagel_a", loopBagel.site.settings?.typography).korean_font_key,
    "nanum-gothic",
  );
  assert.equal(ENGLISH_FONT_OPTIONS.some((option) => option.value === "bagel-fat-one" && option.label === "Bagel Fat One"), true);
  assert.equal(loopBagel.time_sales?.every((sale) => sale.badge_background_color === "#4354EF"), true);
  assert.equal(
    Object.values(TEMPLATE_BADGE_STYLE_PRESETS.fast_food_loop_bagel_a ?? {}).every(
      (style) => style?.background_color === "#4354EF" && style.text_color === "#FFFFFF",
    ),
    true,
  );

  const roundFocus = getStarterPreset("cafe_round_focus_a");
  assert.equal(roundFocus.site.restaurant_name, "ROSY ORANGE");
  assert.equal(roundFocus.site.restaurant_category, "바/주점");
  assert.equal(roundFocus.site.restaurant_type, "pub_bar");
  assert.equal(roundFocus.site.intro_title, "ROSY ORANGE");
  assert.equal(roundFocus.site.menu_cover_title, "ROSY ORANGE");
  assert.equal(roundFocus.site.settings?.footer_notice_1, "Wi-Fi · ROSY_GUEST");
  assert.equal(roundFocus.site.settings?.footer_notice_2, "Instagram · @rosy.orange");
  assert.equal(roundFocus.site.settings?.footer_notice_3, "논알코올 칵테일로 변경 가능합니다.");
  const roundHouseSpecials = roundFocus.pages[0]?.categories.find((category) => category.key === "signature-cocktails");
  assert.equal(roundHouseSpecials?.items.length, 3);
  assert.equal(roundHouseSpecials?.items.every((item) => Boolean(item.image_url)), true);
  const roundHouseWhiteWine = roundFocus.pages[0]?.categories
    .flatMap((category) => category.items)
    .find((item) => item.key === "house-white-wine");
  assert.equal(roundHouseWhiteWine?.badge_label, undefined);
  assert.equal(roundFocus.menu_cover_enabled, false);
  assert.equal(roundFocus.featured_slides?.length, 0);
  assert.deepEqual(roundFocus.widgets, []);
  const roundBarBites = roundFocus.pages[0]?.categories.find((category) => category.key === "bar-bites");
  assert.equal(roundBarBites?.items.length, 4);
  assert.equal(roundBarBites?.items.every((item) => Boolean(item.image_url)), true);
  assert.deepEqual(roundFocus.time_sales?.map((sale) => sale.badge_text), ["HAPPY HOUR", "LAST CALL"]);
  assert.equal(roundFocus.time_sales?.every((sale) => sale.badge_background_color === "#F47A32"), true);
  assert.equal(
    Object.values(TEMPLATE_BADGE_STYLE_PRESETS.cafe_round_focus_a ?? {}).every(
      (style) => style?.background_color === "#F47A32" && style.text_color === "#111111",
    ),
    true,
  );
  const roundTranslations = getSinglePageStarterTranslations("cafe_round_focus_a");
  for (const locale of ["en", "zh", "ja"] as const) {
    assert.equal(roundTranslations?.[locale].promotions["classic-highball-happy-hour"]?.badgeText, "HAPPY HOUR");
    assert.equal(roundTranslations?.[locale].promotions["truffle-fries-last-call"]?.badgeText, "LAST CALL");
  }
  const roundFocusLastBlock = roundFocus.mixed_content_order?.at(-1);
  assert.equal(roundFocusLastBlock?.block_type, "category");
  assert.equal(roundFocusLastBlock?.block_type === "category" ? roundFocusLastBlock.category_key : null, "bar-bites");

  const mochaForest = getStarterPreset("cafe_mocha_forest_a");
  assert.equal(mochaForest.widgets?.[0]?.type, "image");
  assert.equal(mochaForest.widgets?.[0]?.image_url, "/menu-templates/cafe_mocha_forest_a/widget-character.png");
  assert.equal(mochaForest.widgets?.[0]?.settings?.aspectRatio, "3:1");
  assert.equal(mochaForest.widgets?.[0]?.settings?.objectFit, "contain");
  assert.equal(mochaForest.widgets?.[0]?.settings?.objectPosition, "bottom-right");
  assert.equal(mochaForest.widgets?.[0]?.settings?.placement, "bottom");
  assert.equal(mochaForest.featured_item_key, undefined);
  assert.equal(mochaForest.featured_slides?.length, 1);
  assert.equal(mochaForest.featured_slides?.[0]?.image_url, "/menu-templates/cafe_mocha_forest_a/featured.png");
  assert.equal(mochaForest.featured_slides?.[0]?.featured_item_key, undefined);
  assert.equal(mochaForest.menu_cover_visible_pc, true);
  assert.equal(mochaForest.menu_cover_visible_tablet, true);
  assert.equal(mochaForest.menu_cover_visible_mobile, false);
  const mochaSignatureItems = mochaForest.pages[0]?.categories.find((category) => category.key === "signature-coffee")?.items ?? [];
  assert.equal(mochaSignatureItems.every((item) => !item.image_url), true);
  assert.equal(mochaSignatureItems.every((item) => Boolean(item.description?.trim())), true);
  assert.equal(mochaSignatureItems.find((item) => item.key === "forest-mocha")?.badge_label, "SIGNATURE");
  assert.equal(mochaSignatureItems.find((item) => item.key === "hazelnut-cream-latte")?.badge_label, "BEST");
  const mochaForestLastBlock = mochaForest.mixed_content_order?.at(-1);
  assert.equal(mochaForestLastBlock?.block_type, "widget");
  assert.equal(mochaForestLastBlock?.block_type === "widget" ? mochaForestLastBlock.widget_key : null, "mocha-forest-image-widget");

  const sundayLine = getStarterPreset("cafe_sunday_line_a");
  const sundayItems = sundayLine.pages[0]?.categories.flatMap((category) => category.items) ?? [];
  assert.deepEqual(
    sundayLine.featured_slides?.map((slide) => ({
      imageUrl: slide.image_url,
      itemKey: slide.featured_item_key ?? null,
    })),
    [
      {
        imageUrl: "/menu-templates/cafe_sunday_line_a/sunday-roasters-featured-01.png",
        itemKey: "orange-vanilla-cold-brew",
      },
      {
        imageUrl: "/menu-templates/cafe_sunday_line_a/sunday-roasters-featured-02.png",
        itemKey: "salted-maple-latte",
      },
      {
        imageUrl: "/menu-templates/cafe_sunday_line_a/sunday-roasters-featured-03.png",
        itemKey: "sunday-cream-latte",
      },
    ],
  );
  assert.deepEqual(
    sundayLine.time_sales?.map((timeSale) => timeSale.badge_background_color),
    ["#F76A03", "#F76A03"],
  );
  for (const itemKey of ["sunday-cream-latte", "salted-maple-latte"]) {
    assert.equal(sundayItems.find((item) => item.key === itemKey)?.image_url, undefined);
  }
  assert.equal(sundayItems.find((item) => item.key === "matcha-cream-latte")?.badge_label, undefined);

  const vanGogh = getStarterPreset("cafe_van_gogh_a");
  assert.equal(vanGogh.site.restaurant_name, "VAN GOGH");
  assert.equal(vanGogh.menu_cover_enabled, false);
  assert.equal(vanGogh.menu_cover_visible_pc, false);
  assert.equal(vanGogh.menu_cover_visible_tablet, false);
  assert.equal(vanGogh.menu_cover_visible_mobile, false);
  assert.equal(vanGogh.site.cover_image_url, "");
  assert.equal(vanGogh.featured_item_key, undefined);
  assert.equal(vanGogh.featured_slides?.length, 0);
  assert.deepEqual(vanGogh.widgets, []);
  const vanGoghTypography = mergeTypographySettings("cafe_van_gogh_a");
  assert.equal(vanGoghTypography.english_font_key, "special-elite");
  for (const role of ["brand", "category", "itemName", "supporting", "price"] as const) {
    assert.equal(vanGoghTypography.typography_roles[role].color, "#000000");
  }
  assert.equal(
    Object.values(TEMPLATE_BADGE_STYLE_PRESETS.cafe_van_gogh_a ?? {}).every(
      (style) => style?.background_color === "#FFFFFF" && style.text_color === "#000000",
    ),
    true,
  );
  assert.equal(vanGogh.time_sales?.every((sale) => sale.badge_background_color === "#000000"), true);
  assert.equal(vanGogh.pages[0]?.categories[0]?.name, "MASTERPIECE");
  assert.equal(vanGogh.pages[0]?.categories[0]?.items[0]?.name, "별이 빛나는 밤 라떼");

  const mochaMorningDeal = mochaForest.time_sales?.find((sale) => sale.key === "americano-morning-deal");
  assert.equal(mochaMorningDeal?.badge_background_color, "#852322");
});
