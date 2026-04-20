export const about = {
  enabled: true,

  // 다국어 문구는 { ko, en, zh, ja } 형태로 입력합니다.
  // 선택한 언어 값이 비어 있으면 ko 값을 대신 보여줍니다.
  storeName: {
    ko: "테이블씬 비스트로",
    en: "Table Scene Bistro",
    zh: "Table Scene Bistro",
    ja: "Table Scene Bistro",
  },

  heroImageEnabled: true,
  heroImageUrl:
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1600&q=80",
  heroImageAlt: {
    ko: "테이블씬 비스트로 매장 이미지",
    en: "Table Scene Bistro restaurant image",
    zh: "Table Scene Bistro 店铺图片",
    ja: "Table Scene Bistro 店内イメージ",
  },

  description: {
    ko: "테이블씬 비스트로는 제철 식재료와 편안한 서비스로 일상의 식사를 조금 더 특별하게 만드는 공간입니다.",
    en: "Table Scene Bistro makes everyday dining feel special with seasonal ingredients and warm service.",
    zh: "Table Scene Bistro 以时令食材和舒适服务，让日常用餐变得更加特别。",
    ja: "Table Scene Bistroは、旬の食材と心地よいサービスで日常の食事を少し特別にする空間です。",
  },

  address: {
    ko: "서울시 성동구 성수이로 24길 12, 1층",
    en: "1F, 12, Seongsui-ro 24-gil, Seongdong-gu, Seoul",
    zh: "首尔市城东区圣水二路24街12号1层",
    ja: "ソウル市城東区聖水二路24ギル12、1階",
  },

  hours: {
    ko: "화-일 11:30 - 22:00 / 브레이크타임 15:00 - 17:00",
    en: "Tue-Sun 11:30 - 22:00 / Break 15:00 - 17:00",
    zh: "周二至周日 11:30 - 22:00 / 休息 15:00 - 17:00",
    ja: "火-日 11:30 - 22:00 / 休憩 15:00 - 17:00",
  },

  contact: {
    type: "phone",
    label: {
      ko: "예약 문의",
      en: "Reservation",
      zh: "预约咨询",
      ja: "予約のお問い合わせ",
    },
    value: "02-123-4567",
    link: "tel:021234567",
  },

  chefs: [
    {
      id: "chef-001",
      enabled: true,
      name: {
        ko: "한서윤",
        en: "Seo-yoon Han",
        zh: "韩叙允",
        ja: "ハン・ソユン",
      },
      title: {
        ko: "총괄 셰프",
        en: "Executive Chef",
        zh: "行政主厨",
        ja: "総括シェフ",
      },
      description: {
        ko: "계절 채소와 해산물을 중심으로 가볍지만 선명한 맛을 만듭니다.",
        en: "Creates light yet vivid flavors centered on seasonal vegetables and seafood.",
        zh: "以时令蔬菜和海鲜为中心，打造轻盈而鲜明的味道。",
        ja: "旬の野菜と魚介を中心に、軽やかで鮮明な味わいを作ります。",
      },
      imageUrl:
        "https://images.unsplash.com/photo-1583394293214-28ded15ee548?auto=format&fit=crop&w=900&q=80",
      sortOrder: 1,
    },
    {
      id: "chef-002",
      enabled: true,
      name: {
        ko: "이도현",
        en: "Do-hyun Lee",
        zh: "李道贤",
        ja: "イ・ドヒョン",
      },
      title: {
        ko: "디저트 셰프",
        en: "Pastry Chef",
        zh: "甜点主厨",
        ja: "デザートシェフ",
      },
      description: {
        ko: "식사의 마지막 장면을 위한 디저트와 작은 페어링을 준비합니다.",
        en: "Prepares desserts and small pairings for the final scene of the meal.",
        zh: "为用餐的最后时刻准备甜点和小搭配。",
        ja: "食事の最後を彩るデザートと小さなペアリングを用意します。",
      },
      imageUrl:
        "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=900&q=80",
      sortOrder: 2,
    },
  ],

  mapLink: "https://maps.google.com",
  reservationHours: {
    ko: "예약 가능 시간 11:30 - 20:30",
    en: "Reservation available 11:30 - 20:30",
    zh: "可预约时间 11:30 - 20:30",
    ja: "予約可能時間 11:30 - 20:30",
  },
  parking: {
    ko: "건물 뒤편 유료 주차장 이용 가능",
    en: "Paid parking available behind the building",
    zh: "可使用建筑后方收费停车场",
    ja: "建物裏の有料駐車場をご利用いただけます",
  },
  wifi: {
    ko: "TABLESCENE_GUEST / 비밀번호는 직원에게 문의",
    en: "TABLESCENE_GUEST / Ask staff for the password",
    zh: "TABLESCENE_GUEST / 密码请咨询工作人员",
    ja: "TABLESCENE_GUEST / パスワードはスタッフにお尋ねください",
  },
  corkage: {
    ko: "와인 병당 20,000원",
    en: "KRW 20,000 per bottle",
    zh: "每瓶 20,000 韩元",
    ja: "ワイン1本につき20,000ウォン",
  },
  closedDays: {
    ko: "매주 월요일 휴무",
    en: "Closed every Monday",
    zh: "每周一休息",
    ja: "毎週月曜日定休",
  },

  sns: [
    {
      id: "sns-001",
      enabled: true,
      type: "instagram",
      label: "인스타그램",
      url: "https://instagram.com",
      sortOrder: 1,
    },
    {
      id: "sns-002",
      enabled: true,
      type: "naver",
      label: "네이버 플레이스",
      url: "https://naver.com",
      sortOrder: 2,
    },
  ],
};
