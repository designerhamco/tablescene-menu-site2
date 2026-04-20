export const events = {
  enabled: true,

  // 다국어 문구는 { ko, en, zh, ja } 형태로 입력합니다.
  // 선택한 언어 값이 비어 있으면 ko 값을 대신 보여줍니다.
  slides: [
    {
      id: "event-001",
      enabled: true,
      visible: true,
      title: {
        ko: "평일 런치 세트",
        en: "Weekday Lunch Set",
        zh: "工作日午餐套餐",
        ja: "平日ランチセット",
      },
      subtitle: {
        ko: "11:30 - 14:30",
        en: "11:30 - 14:30",
        zh: "11:30 - 14:30",
        ja: "11:30 - 14:30",
      },
      description: {
        ko: "파스타 또는 리조또 주문 시 오늘의 수프와 음료를 함께 제공합니다.",
        en: "Order pasta or risotto and enjoy today's soup and a drink together.",
        zh: "点购意面或烩饭时，可享用今日汤品和饮品。",
        ja: "パスタまたはリゾットをご注文で、本日のスープとドリンクをご提供します。",
      },
      imageUrl:
        "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=80",
      period: {
        ko: "2026.04.01 - 2026.06.30",
        en: "Apr 1, 2026 - Jun 30, 2026",
        zh: "2026.04.01 - 2026.06.30",
        ja: "2026.04.01 - 2026.06.30",
      },
      price: {
        ko: "메뉴 가격 + 4,000원",
        en: "Menu price + KRW 4,000",
        zh: "菜单价格 + 4,000韩元",
        ja: "メニュー価格 + 4,000ウォン",
      },
      benefitDetails: {
        ko: "수프, 미니 샐러드, 커피 또는 탄산음료 포함",
        en: "Includes soup, mini salad, coffee or soda",
        zh: "包含汤品、迷你沙拉、咖啡或汽水",
        ja: "スープ、ミニサラダ、コーヒーまたはソーダ付き",
      },
      sortOrder: 1,
    },
    {
      id: "event-002",
      enabled: true,
      visible: true,
      title: {
        ko: "와인 페어링 나이트",
        en: "Wine Pairing Night",
        zh: "葡萄酒搭配之夜",
        ja: "ワインペアリングナイト",
      },
      subtitle: {
        ko: "금요일 저녁 한정",
        en: "Friday evenings only",
        zh: "仅限周五晚间",
        ja: "金曜ディナー限定",
      },
      description: {
        ko: "시그니처 메뉴 2종과 어울리는 글라스 와인을 추천해드립니다.",
        en: "We recommend glass wines that pair well with two signature dishes.",
        zh: "为两款招牌菜单推荐适合搭配的杯装葡萄酒。",
        ja: "シグネチャーメニュー2種に合うグラスワインをご提案します。",
      },
      imageUrl:
        "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=1200&q=80",
      period: {
        ko: "매주 금요일 18:00 - 21:00",
        en: "Every Friday 18:00 - 21:00",
        zh: "每周五 18:00 - 21:00",
        ja: "毎週金曜日 18:00 - 21:00",
      },
      price: {
        ko: "1인 39,000원",
        en: "KRW 39,000 per person",
        zh: "每人 39,000韩元",
        ja: "1名 39,000ウォン",
      },
      benefitDetails: {
        ko: "예약 고객 우선, 당일 잔여석 이용 가능",
        en: "Priority for reservations, remaining seats available on the day",
        zh: "预约客人优先，当日可使用剩余座位",
        ja: "予約のお客様優先、当日残席利用可",
      },
      sortOrder: 2,
    },
    {
      id: "event-003",
      enabled: true,
      visible: false,
      title: {
        ko: "숨김 이벤트",
        en: "Hidden Event",
        zh: "隐藏活动",
        ja: "非表示イベント",
      },
      subtitle: {
        ko: "관리용 예시",
        en: "Admin example",
        zh: "管理用示例",
        ja: "管理用サンプル",
      },
      description: {
        ko: "visible을 false로 두면 화면에 보이지 않습니다.",
        en: "Set visible to false to hide it from the screen.",
        zh: "将 visible 设为 false 后，画面中不会显示。",
        ja: "visibleをfalseにすると画面に表示されません。",
      },
      imageUrl: "",
      period: {
        ko: "",
        en: "",
        zh: "",
        ja: "",
      },
      price: {
        ko: "",
        en: "",
        zh: "",
        ja: "",
      },
      benefitDetails: {
        ko: "",
        en: "",
        zh: "",
        ja: "",
      },
      sortOrder: 3,
    },
  ],
};
