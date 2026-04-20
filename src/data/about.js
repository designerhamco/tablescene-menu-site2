export const about = {
  enabled: true,
  storeName: "Table Scene Bistro",
  description:
    "테이블씬 비스트로는 제철 식재료와 편안한 서비스로 일상의 식사를 조금 더 특별하게 만드는 공간입니다.",
  address: "서울시 성동구 성수이로 24길 12, 1층",
  hours: "화-일 11:30 - 22:00 / 브레이크타임 15:00 - 17:00",
  contact: {
    type: "phone",
    label: "예약 문의",
    value: "02-123-4567",
    link: "tel:021234567",
  },
  chefs: [
    {
      id: "chef-001",
      enabled: true,
      name: "한서윤",
      title: "Executive Chef",
      description: "계절 채소와 해산물을 중심으로 가볍지만 선명한 맛을 만듭니다.",
      image:
        "https://images.unsplash.com/photo-1583394293214-28ded15ee548?auto=format&fit=crop&w=900&q=80",
      sortOrder: 1,
    },
    {
      id: "chef-002",
      enabled: true,
      name: "이도현",
      title: "Pastry Chef",
      description: "식사의 마지막 장면을 위한 디저트와 작은 페어링을 준비합니다.",
      image:
        "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=900&q=80",
      sortOrder: 2,
    },
  ],
  mapLink: "https://maps.google.com",
  reservationHours: "예약 가능 시간 11:30 - 20:30",
  parking: "건물 뒤편 유료 주차장 이용 가능",
  wifi: "TABLESCENE_GUEST / 비밀번호는 직원에게 문의",
  corkage: "와인 병당 20,000원",
  closedDays: "매주 월요일 휴무",
  sns: [
    {
      id: "sns-001",
      enabled: true,
      type: "instagram",
      label: "Instagram",
      url: "https://instagram.com",
      sortOrder: 1,
    },
    {
      id: "sns-002",
      enabled: true,
      type: "naver",
      label: "Naver Place",
      url: "https://naver.com",
      sortOrder: 2,
    },
  ],
};
