import { getCatalogDesign } from "./catalog-designs";
import { getTemplateCapabilities } from "./template-capabilities";
import { getTemplateDetailInfo, type PublicTemplateDetail } from "./template-details";

export type DetailFeatureSlide = { title: string; description: string; image: string };
// Temporary local photos. Replace each image here when the final artwork is supplied.
const photos = {
  matcha: "/menu-templates/cafe_design_a/real-matcha-menu-featured.jpg",
  latte: "/menu-templates/cafe_design_a/real-matcha-latte-featured.jpg",
  cream: "/menu-templates/cafe_design_a/nutty-cream-featured.jpg",
  coffee: "/menu-templates/cafe_round_focus_a/round-cream-coffee.jpg",
  coffee2: "/menu-templates/cafe_round_focus_a/brown-sugar-flat-white.jpg",
  coffee3: "/menu-templates/cafe_round_focus_a/orange-cream-coldbrew.jpg",
  bagel: "/menu-templates/fast_food_loop_bagel_a/featured-plain-bagel-loop-packaging.webp",
  bakery: "/menu-templates/fast_food_loop_bagel_a/featured-baked-fresh-every-day.webp",
  dining: "/menu-templates/restaurant_onue_a/onue-dining-atmosphere-v1.webp",
  platter: "/menu-templates/cafe_round_focus_a/cheese-platter.jpg",
  cocktail: "/menu-templates/cafe_round_focus_a/rosy-orange-cocktail.jpg",
  dessert: "/menu-templates/fast_food_loop_bagel_a/strawberry-cream-cheese.webp",
};

export const DETAIL_FEATURES = [
  { id: "cover", label: "대표 영역", title: "대표 영역으로 우리 매장의 시그니처를 홍보해보세요", description: "인기 상품과 새롭게 선보이는 메뉴를 사진으로 소개해보세요.", summary: "인기 메뉴를 사진으로 소개해요.", steps: [
    { title: "메뉴에 시선을 모으세요", description: "대표 영역 없이 메뉴를 간결하게 안내할 수 있어요.", image: photos.coffee },
    { title: "대표 상품을 크게 소개하세요", description: "대표 영역을 켜고 인기 상품의 사진을 포스터처럼 보여주세요.", image: photos.matcha },
  ] },
  { id: "images", label: "상품 이미지", title: "작은 썸네일부터 크게 보는 사진까지", description: "메뉴의 맛과 분위기를 사진으로 먼저 전해보세요.", summary: "사진과 확대 보기로 생생하게.", steps: [
    { title: "텍스트로 간결하게 안내", description: "상품 사진을 끄면 메뉴 이름과 설명을 중심으로 보여줄 수 있어요.", image: photos.dining },
    { title: "썸네일로 메뉴를 소개", description: "상품 이미지를 켜면 메뉴와 함께 작은 사진이 나타나요.", image: photos.latte },
    { title: "모서리 모양도 매장답게", description: "메뉴 관리에서 이미지 모서리의 둥근 정도를 조절하세요.", image: photos.cream },
    { title: "사진을 누르면 더 크게", description: "썸네일을 누르면 큰 이미지로 메뉴를 자세히 확인할 수 있어요.", image: photos.matcha },
  ] },
  { id: "prices", label: "가격 옵션", title: "HOT·ICE부터 사이즈까지, 가격을 한눈에", description: "온도와 크기에 따라 달라지는 가격을 알기 쉽게 안내하세요.", summary: "구성별 가격을 한눈에 안내해요.", steps: [
    { title: "기본 가격을 깔끔하게", description: "옵션이 없는 메뉴는 하나의 가격으로 간결하게 안내하세요.", image: photos.coffee },
    { title: "HOT·ICE를 나란히", description: "카테고리에 가격 열을 더해 온도별 가격을 나란히 보여주세요.", image: photos.latte },
    { title: "사이즈별 가격도 한곳에", description: "SMALL·TALL·LARGE처럼 원하는 구성의 이름과 가격을 설정하세요.", image: photos.coffee2 },
    { title: "가격 설명을 직접 입력", description: "‘ICE ONLY’처럼 주문에 필요한 가격 설명을 직접 적을 수 있어요.", image: photos.cream },
  ] },
  { id: "sale", label: "기간 할인", title: "정해진 시간의 혜택을, 더 눈에 띄게", description: "할인 가격과 매장만의 문구로 오늘의 혜택을 알려보세요.", summary: "할인과 남은 시간을 알려요.", steps: [
    { title: "필요한 때만 할인 켜기", description: "평소에는 기본 가격으로, 설정한 기간에는 할인 가격으로 안내하세요.", image: photos.bagel },
    { title: "할인 가격을 눈에 띄게", description: "기간 할인을 켜면 해당 상품에 할인 혜택이 표시돼요.", image: photos.latte },
    { title: "매장만의 할인 문구", description: "‘오늘의 특가’처럼 텍스트칩에 원하는 문구를 직접 넣어보세요.", image: photos.dessert },
    { title: "남은 시간을 함께 안내", description: "1초씩 줄어드는 타이머로 할인 종료까지의 시간을 알려주세요.", image: photos.coffee3 },
  ] },
  { id: "widgets", label: "위젯", title: "메뉴 사이에 매장의 소식도 더해보세요", description: "사진과 글을 조합해 필요한 안내를 메뉴판에 담아보세요.", summary: "사진과 글로 매장 소식을 전해요.", steps: [
    { title: "이미지만으로 생생하게", description: "이미지 위젯으로 이벤트나 추천 메뉴 사진을 보여주세요.", image: photos.platter },
    { title: "텍스트로 또렷하게", description: "텍스트 위젯에 영업 안내나 매장 소식을 간단히 적어보세요.", image: photos.dining },
    { title: "이미지와 설명을 함께", description: "사진에 제목과 본문을 더해 소식을 자세히 전할 수 있어요.", image: photos.bakery },
  ] },
  { id: "ads", label: "광고", title: "메뉴판을 여는 순간, 놓치지 않을 소식", description: "신메뉴와 매장 이벤트를 팝업으로 먼저 알려보세요.", summary: "이벤트를 팝업으로 먼저 알려요.", steps: [
    { title: "첫 화면에서 소식 전하기", description: "메뉴판 위에 팝업을 띄워 손님에게 중요한 소식을 먼저 안내하세요.", image: photos.dessert },
    { title: "여러 장을 순서대로", description: "준비한 광고 이미지가 한 장씩 차례로 넘어가며 표시돼요.", image: photos.cocktail },
    { title: "손님이 직접 넘겨보기", description: "자동 전환을 기다리지 않고 옆으로 넘겨 다른 광고도 확인할 수 있어요.", image: photos.bakery },
  ] },
  { id: "call", label: "호출", title: "손을 들지 않아도, 필요한 요청을 바로", description: "손님이 테이블에서 필요한 요청을 선택해 전달할 수 있어요.", summary: "필요한 요청을 바로 전달해요.", steps: [
    { title: "호출 버튼 열기", description: "메뉴판에서 호출 버튼을 누르면 요청할 항목을 볼 수 있어요.", image: photos.dining },
    { title: "필요한 항목 선택", description: "물이나 식기 요청처럼 매장에서 준비한 항목을 선택하세요.", image: photos.platter },
    { title: "직원에게 요청 보내기", description: "선택한 요청을 전송하고 호출이 접수되었는지 확인할 수 있어요.", image: photos.cocktail },
  ] },
  { id: "order", label: "주문", title: "메뉴 선택부터 주문 내역 확인까지, 한곳에서", description: "원하는 메뉴를 담아 후불로 주문하고 내역을 다시 확인하세요.", summary: "상품 담기부터 후불 주문까지.", steps: [
    { title: "원하는 메뉴 담기", description: "상품의 장바구니 버튼을 눌러 원하는 메뉴와 수량을 담아보세요.", image: photos.bagel },
    { title: "장바구니에서 확인", description: "담은 메뉴와 최종 주문 금액을 한곳에서 확인하세요.", image: photos.platter },
    { title: "후불로 주문하기", description: "주문 버튼을 눌러 매장에 전송하세요. 결제는 매장에서 진행해요.", image: photos.dining },
    { title: "주문 내역 다시 보기", description: "주문한 상품과 금액, 진행 상태를 주문 내역에서 확인할 수 있어요.", image: photos.coffee3 },
  ] },
] as const;

export type DetailFeatureId = typeof DETAIL_FEATURES[number]["id"];
export function getDetailFeatureSlides(feature: typeof DETAIL_FEATURES[number], { album, multiPage }: { album: boolean; multiPage: boolean }): readonly DetailFeatureSlide[] {
  if (feature.id === "prices" && multiPage) return [
    { title: "상품마다 기본 가격 설정", description: "상품별 가격을 입력해 메뉴와 함께 안내하세요.", image: photos.dining },
    { title: "잔과 보틀 등 옵션 추가", description: "같은 상품의 여러 구성을 옵션 이름과 가격으로 구분해보세요.", image: photos.cocktail },
    { title: "사이즈별 구성도 자유롭게", description: "작은 사이즈와 큰 사이즈처럼 원하는 구성에 맞춰 옵션을 만들 수 있어요.", image: photos.platter },
    { title: "옵션 이름 직접 작성", description: "손님이 원하는 구성을 쉽게 고르도록 옵션 이름을 직접 입력하세요.", image: photos.coffee2 },
  ];
  if (feature.id === "images" && album) return [...feature.steps, { title: "앨범 사진 비율 선택", description: "1:1, 4:5, 5:4 중 메뉴 사진에 어울리는 비율을 고를 수 있어요.", image: photos.coffee2 }];
  return feature.steps;
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
