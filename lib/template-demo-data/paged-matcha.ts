import type { MenuPageData } from "@/lib/menu-page-data";

/** Fixtures are restricted to the hidden copy; public customer content is never changed. */
export function applyPagedMatchaFixture(data: MenuPageData, scenario: string = "") {
  if (scenario === "options" && data.items[0]) {
    const first = data.items[0];
    data.items = data.items.map((item) =>
      item.id === first.id ? { ...item, priceColumnValues: [] } : item,
    );
    data.priceOptions = [
      {
        id: "test-hot",
        menu_item_id: first.id,
        label: "HOT",
        price: 5000,
        price_label: null,
        visible: true,
        sort_order: 1,
      },
      {
        id: "test-ice",
        menu_item_id: first.id,
        label: "ICE",
        price: 5500,
        price_label: null,
        visible: true,
        sort_order: 2,
      },
      ...data.priceOptions.filter((option) => option.menu_item_id !== first.id),
    ];
  }
  if (scenario === "images")
    data.items = data.items.map(item => ({...item, image_url: "/menu-templates/cafe_design_a/malcha.jpg"}));
  if (scenario === "dense") {
    data.items = data.items.flatMap((item) =>
      Array.from({ length: 4 }, (_, i) => ({
        ...item,
        id: item.id + "-copy-" + i,
        name: item.name + " " + (i + 1),
        sort_order: item.sort_order * 4 + i,
      })),
    );
    data.priceOptions = [];
  }
  if (scenario === "long")
    data.items = data.items.map((item) => ({
      ...item,
      description: ((item.description ?? "") + " ").repeat(5),
    }));
  if (scenario === "widgets" && data.pages[0]) {
    const base = {
      menuSiteId: data.menuSite.id,
      menuPageId: data.pages[0].id,
      visible: true,
    };
    data.widgets = [
      {
        ...base,
        id: "test-middle-widget",
        type: "text",
        title: "매장 소식",
        description: "카테고리 사이에 등록한 텍스트 위젯입니다.",
        imageUrl: null,
        imagePath: null,
        sortOrder: 1.5,
        settings: { schemaVersion: 1, textAlign: "left", placement: "flow" },
      },
      {
        ...base,
        id: "test-last-widget",
        type: "image_text",
        title: "마지막 순서 위젯",
        description: "이 위젯은 안내사항 1·2·3보다 위에 표시됩니다.",
        imageUrl: "/menu-templates/cafe_design_a/malcha.jpg",
        imagePath: null,
        sortOrder: 999,
        settings: {
          schemaVersion: 1,
          aspectRatio: "3:1",
          objectFit: "cover",
          objectPosition: "center",
          textAlign: "left",
          placement: "bottom",
        },
      },
    ];
    data.menuSite.settings = {
      ...(data.menuSite.settings as Record<string, never>),
      footer_notice_3: "테스트 안내 3 · 위젯 아래 안내 영역",
    };
  }
}
