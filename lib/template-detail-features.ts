import { getCatalogDesign } from "./catalog-designs";
import { getTemplateCapabilities } from "./template-capabilities";
import { getTemplateDetailInfo, type PublicTemplateDetail } from "./template-details";

export const DETAIL_FEATURES = [
  { id: "cover", label: "대표 영역", title: "대표 영역으로 우리 매장의 시그니처를 홍보해보세요", description: "자주 찾는 인기 상품부터 새롭게 선보이는 메뉴까지. 메뉴판의 대표 영역에 상품 사진을 포스터처럼 담아 손님의 시선을 모아보세요. 매장 운영에 맞춰 언제든 켜고 끌 수 있습니다.", summary: "인기 상품과 신메뉴 사진을 포스터처럼 보여주며 홍보하세요.", steps: ["대표 영역 끄기", "대표 영역 켜기"] },
  { id: "images", label: "상품 이미지", title: "작은 썸네일부터 크게 보는 사진까지", description: "사진으로 메뉴의 맛과 분위기를 먼저 전해보세요. 상품 이미지를 켜면 메뉴 옆에 썸네일이 나타나고, 사진을 누르면 큰 이미지로 확인할 수 있습니다. 메뉴 관리에서 이미지 모서리의 둥근 정도도 조절할 수 있어요.", summary: "상품 사진을 썸네일과 확대 이미지로 보여주세요. 모서리 모양도 조절할 수 있어요.", steps: ["상품 이미지 끄기", "썸네일 켜기", "모서리 변경", "이미지 확대"] },
  { id: "prices", label: "가격 옵션", title: "HOT·ICE부터 사이즈까지, 가격을 한눈에", description: "같은 메뉴도 온도와 크기에 따라 가격이 달라지니까. 카테고리에 HOT·ICE 또는 SMALL·TALL·LARGE 가격 열을 추가해 나란히 안내하세요. ‘ICE ONLY’ 같은 가격 설명도 직접 입력할 수 있습니다.", summary: "온도·크기별 가격 옵션과 직접 작성한 가격 설명을 안내하세요.", steps: ["기본 가격", "HOT · ICE 추가", "사이즈 옵션 추가", "가격 설명 입력"] },
  { id: "sale", label: "기간 할인", title: "정해진 시간의 혜택을, 더 눈에 띄게", description: "원하는 기간에만 할인 가격을 보여주고, 텍스트칩에는 ‘오늘의 특가’처럼 매장만의 문구를 적어보세요. 남은 시간이 1초씩 줄어드는 타이머가 할인 종료까지의 시간을 알려줍니다.", summary: "기간별 할인 가격, 직접 쓴 텍스트칩과 남은 시간 타이머를 보여주세요.", steps: ["기간 할인 끄기", "기간 할인 켜기", "할인 문구 입력", "남은 시간 확인"] },
  { id: "widgets", label: "위젯", title: "메뉴 사이에 매장의 소식도 더해보세요", description: "오늘의 안내, 이벤트, 매장의 작은 이야기까지 메뉴판에 함께 담아보세요. 이미지만, 텍스트만, 또는 이미지와 텍스트를 함께 넣는 세 가지 유형으로 필요한 소식을 전할 수 있습니다.", summary: "이미지형·텍스트형·이미지와 텍스트 혼합형으로 매장 소식을 전하세요.", steps: ["위젯 끄기", "이미지 위젯", "텍스트 위젯", "이미지 + 텍스트"] },
  { id: "ads", label: "광고", title: "메뉴판을 여는 순간, 놓치지 않을 소식", description: "신메뉴 출시와 매장 이벤트를 팝업으로 먼저 알려보세요. 여러 장의 광고 이미지는 한 장씩 순서대로 넘어가고, 손님이 직접 옆으로 넘겨 확인할 수도 있습니다.", summary: "메뉴판 위 팝업에 여러 장의 광고 이미지를 순서대로 보여주세요.", steps: ["광고 끄기", "첫 번째 광고", "두 번째 광고", "세 번째 광고"] },
  { id: "call", label: "호출", title: "손을 들지 않아도, 필요한 요청을 바로", description: "손님이 메뉴판의 호출 버튼을 누르고 필요한 항목을 선택하면 직원에게 요청을 보낼 수 있습니다. 물이나 식기 요청처럼 우리 매장에서 자주 받는 내용을 호출 항목으로 준비해보세요.", summary: "호출 버튼에서 원하는 요청을 선택해 직원에게 전달하세요.", steps: ["호출 버튼", "요청 항목 선택", "호출 보내기", "호출 완료 확인"] },
  { id: "order", label: "주문", title: "메뉴 선택부터 주문 내역 확인까지, 한곳에서", description: "원하는 상품의 장바구니 버튼을 눌러 메뉴를 담고, 장바구니에서 후불로 주문해보세요. 결제는 매장에서 진행하며, 주문한 메뉴와 금액은 주문 내역에서 다시 확인할 수 있습니다.", summary: "메뉴를 장바구니에 담아 후불로 주문하고 주문 내역까지 확인하세요.", steps: ["상품 담기", "장바구니 확인", "후불로 주문", "주문 내역 확인"] },
] as const;

export type DetailFeatureId = typeof DETAIL_FEATURES[number]["id"];
export function isDetailFeatureId(value: unknown): value is DetailFeatureId {
  return DETAIL_FEATURES.some(feature => feature.id === value);
}

export function getDetailFeaturePresentation(template: PublicTemplateDetail) {
  const info = getTemplateDetailInfo(template);
  const design = getCatalogDesign(template.key);
  const capabilities = getTemplateCapabilities(design?.templateKey ?? template.key);
  const album = design?.itemLayout === "album";
  const supported: Record<DetailFeatureId, boolean> = {
    cover: !info.display && capabilities.menuCover.coverMode !== "none",
    images: !info.display && capabilities.menuItemImages,
    prices: !info.display && !(album && !info.multiPage) && (capabilities.priceOptions || Boolean(capabilities.supportsBasicPriceColumns)),
    sale: !info.display && capabilities.menuCover.coverMode === "section",
    widgets: !info.display && capabilities.menuWidgets.enabled,
    ads: !info.display,
    call: info.features.smartCall,
    order: info.features.order,
  };
  return { album, supported, info };
}
