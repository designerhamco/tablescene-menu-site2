export const sections = [
  { id: "hero", label: "Intro" },
  { id: "services", label: "Service" },
  { id: "allinone", label: "Connect" },
  { id: "devices", label: "Device" },
  { id: "pricing", label: "Plans" },
  { id: "portfolio", label: "Works" },
  { id: "faq", label: "Q&A" },
] as const;

export const services = [
  {
    id: "web-menu-pro-v1",
    title: "PRO 1.0",
    description: "주문, 결제, 호출 등 매장 운영의 핵심 기능을 모두 담은 실속형 올인원 솔루션.",
    image: "https://images.unsplash.com/photo-1659035260002-11d486d6e9f5?q=75&w=720",
    video: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    link: "/services/pro-v1",
  },
  {
    id: "web-menu-dining",
    title: "DINING",
    description: "웹 메뉴판과 완벽히 어우러지는 QR 웰컴 카드. 매장의 품격을 완성하는 프리미엄 솔루션.",
    image: "https://images.unsplash.com/photo-1728044849280-10a1a75cff83?q=75&w=720",
    video: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
    link: "/",
  },
  {
    id: "web-menu-pro-ai",
    title: "PRO AI",
    description: "AI가 매출과 재고를 분석하고 마케팅까지. 매장 운영의 패러다임을 바꾸는 차세대 솔루션.",
    image: "https://images.unsplash.com/photo-1561284081-ebf6c977bbde?q=75&w=720",
    link: "#",
    isAi: true,
    disabled: true,
  },
] as const;

export const flowCards = [
  { icon: "users", title: "스마트 웨이팅", desc: "대기 등록부터 입장 안내,\n미리 주문하는 선주문 기능", badge: "PRO AI" },
  { icon: "tablet", title: "주문 & 결제", desc: "웹 메뉴판 결제 (PG 연동),\n웹 POS 실시간 연동" },
  { icon: "bell", title: "스마트 직원 호출", desc: "진동벨 없이 웹에서 즉시 호출,\n요청 항목 자유로운 커스텀" },
  { icon: "message", title: "CRM & 멤버십", desc: "결제 시 자동 포인트 적립,\n주문 시 현금처럼 사용" },
] as const;

export const plans = [
  {
    id: "pro-v1",
    name: "올인원 통합 관리",
    tagline: "PRO 1.0",
    keywords: ["주문/결제", "직원 호출", "효율적 운영"],
    narrative: "주문부터 결제, 직원 호출까지 매장 운영에 필요한 핵심 기능을 하나로 담았습니다. 효율적인 매장 관리를 시작하세요.",
    link: "/services/pro-v1",
    poster: "https://images.unsplash.com/photo-1556910103-1c02745a30bf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=75&w=720",
    disabled: false,
  },
  {
    id: "dining",
    name: "프리미엄 커스텀",
    tagline: "DINING",
    keywords: ["파인다이닝", "QR 웰컴 카드", "프리미엄 커스텀"],
    narrative: "웹 메뉴판과 완벽한 조화를 이루는 프리미엄 QR 웰컴 카드를 제작해 드립니다. 매장의 품격을 높이는 차별화된 경험을 제공하세요.",
    link: "/",
    poster: "https://images.unsplash.com/photo-1574096079513-d8259312b785?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=75&w=720",
    disabled: false,
  },
  {
    id: "pro-ai",
    name: "AI 자동화 솔루션",
    tagline: "PRO AI",
    keywords: ["매출 분석", "마케팅 자동화", "운영 최적화"],
    narrative: "AI가 매출 데이터를 분석하여 마케팅 전략을 제안하고 실행합니다. 매장 운영의 새로운 패러다임을 경험해보세요.",
    link: "#",
    poster: "https://images.unsplash.com/photo-1588560107833-167198a53677?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=75&w=720",
    disabled: true,
  },
] as const;

export const portfolioContent = {
  PRO: [
    { id: "p1", text: "스마트 웨이팅", image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=75&w=900" },
    { id: "p2", text: "주문/결제/알림톡", image: "https://images.unsplash.com/photo-1728044849280-10a1a75cff83?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=75&w=900" },
    { id: "p3", text: "포인트 적립 시스템", image: "https://images.unsplash.com/photo-1764795849878-59b546cfe9c7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=75&w=900" },
    { id: "p4", text: "직원호출", image: "https://images.unsplash.com/photo-1748813792553-1999ee082427?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=75&w=900" },
    { id: "p5", text: "언어변경", image: "https://images.unsplash.com/photo-1542382257-80dedb725088?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=75&w=900" },
    { id: "p6", text: "주방대시보드 연동", image: "https://images.unsplash.com/photo-1556740738-b6a63e27c4df?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=75&w=900" },
    { id: "p7", text: "메뉴페이지", image: "https://images.unsplash.com/photo-1641630376356-fb9e646b0ea4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=75&w=900" },
  ],
  DINING: [
    { id: "s1", text: "메뉴페이지", image: "https://images.unsplash.com/photo-1641630376356-fb9e646b0ea4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=75&w=900" },
    { id: "s2", text: "직원호출", image: "https://images.unsplash.com/photo-1748813792553-1999ee082427?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=75&w=900" },
    { id: "s3", text: "언어변경", image: "https://images.unsplash.com/photo-1542382257-80dedb725088?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=75&w=900" },
  ],
} as const;

export const faqData = [
  {
    category: "도입 및 기기",
    items: [
      ["서비스 도입 시 별도의 기기를 구매해야 하나요?", "아니요. 사장님이 이미 사용 중인 태블릿, PC, 스마트폰만 있다면 어디서든 바로 사용 가능합니다. 손님들은 개인 휴대폰으로 메뉴를 보기 때문에 비싼 하드웨어 추가 비용이 들지 않아 경제적입니다."],
      ["현재 사용 중인 포스(POS)기와 연동되나요?", "본 서비스는 포스사와 연동하는 방식이 아닌, 독자적인 아티메뉴 대시보드(웹 POS)를 사용합니다. 주방, 카운터, 사장님 스마트폰까지 장소에 구애받지 않고 주문을 확인하고 관리할 수 있습니다."],
      ["테이블별로 QR 코드를 다르게 만들어야 하나요?", "네, 각 테이블 고유의 QR 코드를 생성해 드립니다. 창가석, 야외테라스, 단체석 등 매장 구조에 맞춰 원하는 이름으로 관리할 수 있습니다."],
    ],
  },
  {
    category: "메뉴 및 운영",
    items: [
      ["메뉴 수정은 실시간으로 가능한가요?", "네, 관리자 페이지에서 메뉴 품절 처리, 가격 변경, 사진 수정을 하는 즉시 손님 화면에 반영됩니다. 종이 메뉴판처럼 다시 인쇄할 필요가 없습니다."],
      ["사용 중 오류가 발생하거나 궁금한 점이 있으면 어떡하나요?", "서비스 이용 중 문의 사항은 카카오톡 상담을 통해 남겨주세요. 해결이 어려운 문제는 지원팀이 원격 제어로 사장님의 화면을 실시간으로 보면서 도와드립니다."],
      ["웹 방식이면 인터넷이 끊기거나 불안정하지 않을까요?", "안정적인 클라우드 서버를 기반으로 작동하므로 매장 인터넷 환경만 원활하다면 끊김 없이 사용 가능합니다. 일시적으로 불안정할 경우 스마트폰 테더링으로 임시 대처도 가능합니다."],
    ],
  },
  {
    category: "결제 및 정산 (PRO 전용)",
    items: [
      ["결제 방식은 어떻게 구성되어 있나요?", "기본적으로 웹 메뉴판을 통한 온라인 선결제를 지원합니다. 현장 카드 리더기나 현금 결제를 원할 경우 대시보드에서 주문의 결제 상태를 수동으로 변경해 관리할 수 있습니다."],
      ["PG 결제 가맹 계약은 사장님이 직접 해야 하나요?", "네, 결제 대금이 사장님 계좌로 안전하게 정산되어야 하므로 PG 가맹 계약은 필수입니다. 가입 가이드를 제공하고, 발급된 가맹점 ID 값을 시스템에 등록하면 결제 기능이 활성화됩니다."],
      ["결제 수수료는 어떻게 되나요?", "포트원을 이용해도 영세/중소 가맹점 우대 수수료 혜택을 동일하게 적용받을 수 있습니다. PG사 및 결제 수단에 따라 세부 수수료는 달라질 수 있습니다."],
    ],
  },
] as const;
