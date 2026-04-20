export const settings = {
  // 화면 상단에 보이는 사이트 이름입니다.
  siteTitle: "TABLESCENE",

  // 처음 접속했을 때 보여줄 페이지입니다. intro, about, menu, events 중 하나를 입력하세요.
  defaultPage: "intro",

  // 페이지를 켜고 끄는 곳입니다.
  // enabled를 false로 바꾸면 햄버거 메뉴와 화면에서 해당 페이지가 사라집니다.
  // label은 햄버거 메뉴에 보이는 이름입니다.
  pages: {
    intro: {
      enabled: true,
      label: "인트로",
    },
    about: {
      enabled: true,
      label: "소개",
    },
    menu: {
      enabled: true,
      label: "메뉴",
    },
    events: {
      enabled: true,
      label: "이벤트",
    },
  },

  // 페이지 안의 작은 섹션을 켜고 끄는 곳입니다.
  // true는 보이기, false는 숨기기입니다.
  sections: {
    about: {
      // 소개 페이지의 셰프 소개 영역
      chefs: true,

      // 소개 페이지의 SNS 링크 영역
      sns: true,

      // 소개 페이지의 예약/주차/와이파이/콜키지/휴무일 안내 영역
      extraInfo: true,
    },
    menu: {
      // 메뉴 이미지 표시 여부
      images: true,

      // BEST, NEW 같은 사용자 정의 라벨 표시 여부
      labels: true,

      // 원산지 정보 표시 여부
      origin: true,
    },
    events: {
      // 이벤트 이미지 표시 여부
      images: true,

      // 이벤트 기간/가격/혜택 상세 표시 여부
      details: true,
    },
  },
};
