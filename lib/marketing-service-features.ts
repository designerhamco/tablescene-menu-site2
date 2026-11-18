import type { VisualKind } from "@/components/marketing/MarketingVisual";

type Service = "basic" | "dining" | "display";
type Feature = { kind: VisualKind; label: string; title: string; body: string };

export const MARKETING_SHARED_FEATURES = {
  gallery: {
    kind: "gallery",
    label: "상품 이미지",
    title: "맛이 궁금해지는 메뉴 사진",
    body: "한 장의 사진부터 앨범까지. 메뉴에 어울리는 이미지를 담고, 앨범은 1:1·4:5·5:4 비율로 보여주세요.",
  },
  prices: {
    kind: "prices",
    label: "가격 옵션",
    title: "선택은 다양하게, 가격은 명확하게",
    body: "사이즈와 온도처럼 다른 옵션을 메뉴와 함께 안내해 손님이 가격을 쉽게 비교할 수 있습니다.",
  },
  sale: {
    kind: "sale",
    label: "기간 할인",
    title: "할인이 시작되는 순간까지",
    body: "행사 기간과 할인 가격을 설정하세요. 남은 시간을 함께 보여주어 지금의 혜택을 전할 수 있습니다.",
  },
  advertising: {
    kind: "advertising",
    label: "광고",
    title: "메뉴를 여는 순간, 매장 소식도 함께",
    body: "신메뉴와 시즌 프로모션을 이미지로 소개하세요. 메뉴판에 들어온 손님에게 매장의 새로운 이야기를 전합니다.",
  },
  call: {
    kind: "call",
    label: "직원 호출",
    title: "도움이 필요할 땐 화면에서 바로",
    body: "메뉴판에서 필요한 도움을 선택하는 호출 흐름을 제공합니다. 실제 호출 접수는 매장별 운영 연결 후 사용할 수 있습니다.",
  },
  order: {
    kind: "order",
    label: "테이블 주문",
    title: "고르고, 담고, 한 번에 주문",
    body: "옵션과 수량을 골라 장바구니에 담는 주문 경험. 실제 후불 주문은 매장별 연결 후 이용할 수 있으며 선결제는 준비 중입니다.",
  },
} satisfies Record<string, Feature>;

const shared = MARKETING_SHARED_FEATURES;
export const MARKETING_SERVICE_FEATURES: Record<Service, Feature[]> = {
  basic: [
    {
      kind: "featured",
      label: "대표 상품 영역",
      title: "가장 먼저 보여주고 싶은 한 가지",
      body: "시그니처와 신메뉴를 포스터처럼 소개하세요. 매장을 대표하는 상품에 사진과 설명을 더해 시선을 모읍니다.",
    },
    shared.gallery,
    shared.prices,
    shared.sale,
    {
      kind: "widgets",
      label: "콘텐츠 위젯",
      title: "메뉴 사이에 담는 매장의 이야기",
      body: "추천 메뉴와 이벤트, 꼭 전하고 싶은 안내를 위젯으로 배치해 매장만의 메뉴판을 완성하세요.",
    },
    shared.advertising,
    shared.call,
    shared.order,
  ],
  dining: [
    {
      kind: "pages",
      label: "멀티페이지",
      title: "코스부터 디저트까지, 흐름이 있는 메뉴",
      body: "여러 페이지로 메뉴를 나누어 보여주세요. 코스와 음료, 디저트까지 손님이 원하는 페이지를 차례로 살펴봅니다.",
    },
    {
      kind: "cover",
      label: "커버 페이지",
      title: "첫 장부터 전해지는 매장의 분위기",
      body: "매장의 사진과 이름을 담은 커버로 시작하세요. 메뉴를 읽기 전부터 다이닝의 인상을 전합니다.",
    },
    shared.gallery,
    shared.prices,
    shared.sale,
    shared.advertising,
    shared.call,
    shared.order,
  ],
  display: [
    {
      kind: "pages",
      label: "화면별 페이지",
      title: "각 화면에 필요한 페이지만",
      body: "여러 페이지로 구성한 메뉴 중 화면마다 보여줄 페이지를 지정하세요. 커피와 디저트, 시즌 메뉴를 각각의 화면에 나누어 소개합니다.",
    },
    {
      kind: "media",
      label: "이미지 · 영상 페이지",
      title: "한 화면을 가득 채우는 한 장면",
      body: "메뉴 목록 대신 이미지나 영상만 보여주는 페이지를 구성할 수 있습니다. 브랜드와 신메뉴를 큰 화면으로 소개하세요.",
    },
    {
      ...shared.prices,
      body: "메뉴별 선택 옵션과 가격을 함께 보여주세요. 큰 화면에서도 손님이 원하는 메뉴와 가격을 쉽게 찾을 수 있습니다.",
    },
    shared.sale,
  ],
};

export const MARKETING_SERVICE_HEADINGS = {
  basic: "한 장의 메뉴판에, 필요한 기능을",
  dining: "메뉴를 읽는 시간이, 매장의 경험으로",
  display: "큰 화면의 가능성을 넓히는 기능",
} as const;
