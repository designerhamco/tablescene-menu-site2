export type GuidePlan = "basic" | "dining" | "display";
export type GuideTabPlan = "basic" | "display";
export type GuideDevice = "windows" | "mac" | "ipad" | "android";
export type GuideBrowser = "chrome" | "edge" | "safari" | "samsung";
export type GuideSectionId = "connection" | "fullscreen" | "zoom";
export type GuideVideo = { src: string; captionsSrc: string; poster?: string };
export type GuideControl = "more" | "fullscreen" | "zoom-in" | "zoom-out";
export type GuideStep = string | readonly (string | { control: GuideControl })[];
export type GuideShortcut = {
  device: string;
  commands: readonly { label: string; keys: readonly string[] }[];
};
export type GuideSection = {
  id: GuideSectionId;
  title: string;
  body: string;
  steps: readonly GuideStep[];
  shortcuts?: readonly GuideShortcut[];
  toolbar?: readonly { device: string; steps: readonly string[] }[];
  note?: string;
  sources?: readonly { label: string; href: string }[];
};

export const GUIDE_PLANS = [
  {
    id: "basic",
    label: "베이직•다이닝",
  },
  {
    id: "display",
    label: "디스플레이",
  },
] as const;
export const GUIDE_DEVICES = [
  { id: "windows", label: "Windows PC", browsers: ["chrome", "edge"] },
  { id: "mac", label: "Mac", browsers: ["safari", "chrome", "edge"] },
  { id: "ipad", label: "iPad", browsers: ["safari"] },
  { id: "android", label: "Android 태블릿", browsers: ["chrome", "samsung"] },
] as const satisfies readonly {
  id: GuideDevice;
  label: string;
  browsers: readonly GuideBrowser[];
}[];
export const GUIDE_BROWSER_LABELS: Record<GuideBrowser, string> = {
  chrome: "Chrome",
  edge: "Edge",
  safari: "Safari",
  samsung: "삼성 인터넷",
};

// Add a captioned video for a specific plan/device/browser/section when footage arrives.
// Example key: basic:mac:safari:fullscreen. Missing footage renders a clear placeholder.
export const GUIDE_VIDEOS: Readonly<Partial<Record<string, GuideVideo>>> = {};

export function normalizeGuidePlan(value: string | undefined): GuideTabPlan {
  return value === "display" ? "display" : "basic";
}
export function getGuideDevice(
  plan: GuidePlan,
  device: GuideDevice,
): GuideDevice {
  return plan === "display" && (device === "ipad" || device === "android")
    ? "windows"
    : device;
}
export function getGuideBrowsers(device: GuideDevice): readonly GuideBrowser[] {
  return GUIDE_DEVICES.find((entry) => entry.id === device)!.browsers;
}
export function getGuideBrowser(
  device: GuideDevice,
  browser: GuideBrowser,
): GuideBrowser {
  const browsers = getGuideBrowsers(device);
  return browsers.includes(browser) ? browser : browsers[0];
}
export function guideVideoKey(
  plan: GuidePlan,
  device: GuideDevice,
  browser: GuideBrowser,
  section: GuideSectionId,
) {
  return `${plan}:${device}:${browser}:${section}`;
}
const chromeSource = {
  label: "Chrome 공식 도움말",
  href: "https://support.google.com/chrome/answer/96810?hl=ko",
};
const edgeSource = {
  label: "Edge 공식 도움말",
  href: "https://support.microsoft.com/ko-kr/edge/keyboard-shortcuts-in-microsoft-edge",
};
const safariWindowSource = {
  label: "Safari 공식 도움말",
  href: "https://support.apple.com/ko-kr/guide/safari/ibrw1012/mac",
};
const safariZoomSource = {
  label: "Safari 단축키 안내",
  href: "https://support.apple.com/ko-kr/guide/safari/cpsh003/mac",
};
const ipadSource = {
  label: "iPad Safari 공식 도움말",
  href: "https://support.apple.com/ko-kr/guide/ipad/ipad54f3cde6/ipados",
};
const versionNote =
  "메뉴 이름과 위치는 운영체제·브라우저 버전에 따라 다를 수 있습니다.";

function chromeDesktopSections(): GuideSection[] {
  return [
    {
      id: "fullscreen",
      title: "전체 화면으로 메뉴판 보기",
      body: "Chrome의 전체 화면 기능으로 메뉴판을 화면 가득 표시하세요.",
      steps: [
        "컴퓨터의 Chrome에서 공개 메뉴판 주소를 엽니다.",
        ["오른쪽 위의 ", { control: "more" }, "를 클릭합니다."],
        ["‘확대/축소’ 옆의 ", { control: "fullscreen" }, "을 클릭합니다."],
      ],
      toolbar: [
        {
          device: "Windows·Linux",
          steps: [
            "전체 화면을 켠 뒤 마우스를 화면 상단에서 아래로 옮깁니다.",
            "주소창과 탭 표시줄이 숨겨졌는지 확인합니다. 별도 툴바 설정은 필요하지 않습니다.",
          ],
        },
        {
          device: "Mac",
          steps: [
            "전체 화면에서 마우스를 화면 맨 위로 올려 Mac의 메뉴 막대를 표시합니다.",
            "보기(View) → ‘전체화면에서 툴바 항상 표시’에 체크가 있다면 클릭해 해제합니다.",
            "마우스를 화면 아래로 옮겨 주소창과 탭 표시줄이 숨겨졌는지 확인합니다. 이미 체크가 없다면 그대로 두세요.",
          ],
        },
      ],
      shortcuts: [
        { device: "Windows·Linux", commands: [{ label: "전체 화면", keys: ["F11"] }] },
        { device: "Mac", commands: [{ label: "전체 화면", keys: ["⌘", "Ctrl", "F"] }] },
      ],
      note: "전체 화면을 끝내려면 같은 단축키를 다시 누르세요.",
      sources: [chromeSource],
    },
    {
      id: "zoom",
      title: "메뉴판 크기 조정하기",
      body: "브라우저 배율을 바꿔 메뉴판의 글자와 이미지를 함께 확대하거나 축소하세요.",
      steps: [
        "컴퓨터의 Chrome에서 공개 메뉴판 주소를 엽니다.",
        ["오른쪽 위의 ", { control: "more" }, "를 클릭하고 ‘확대/축소’를 찾습니다."],
        [{ control: "zoom-in" }, " 또는 ", { control: "zoom-out" }, "를 눌러 원하는 크기로 맞춥니다. 기본 크기는 100%입니다."],
      ],
      shortcuts: [
        { device: "Windows·Linux", commands: [
          { label: "확대", keys: ["Ctrl", "+"] },
          { label: "축소", keys: ["Ctrl", "−"] },
          { label: "기본 크기", keys: ["Ctrl", "0"] },
        ] },
        { device: "Mac", commands: [
          { label: "확대", keys: ["⌘", "+"] },
          { label: "축소", keys: ["⌘", "−"] },
          { label: "기본 크기", keys: ["⌘", "0"] },
        ] },
      ],
      note: "브라우저 배율은 지금 보는 기기의 표시 크기입니다. 저장된 메뉴 디자인은 바뀌지 않습니다.",
      sources: [chromeSource, {
        label: "Chrome 단축키 안내",
        href: "https://support.google.com/chrome/answer/157179?hl=ko",
      }],
    },
  ];
}

function browserSections(
  device: GuideDevice,
  browser: GuideBrowser,
): GuideSection[] {
  if ((device === "windows" || device === "mac") && browser === "chrome")
    return chromeDesktopSections();
  if (device === "ipad")
    return [
      {
        id: "fullscreen",
        title: "주소창을 접고 메뉴에 집중하기",
        body: "iPad의 Safari에서는 도구 막대를 잠시 숨기거나 홈 화면에 추가해 메뉴판을 열 수 있습니다.",
        steps: [
          "Safari에서 공개 메뉴판 주소를 엽니다.",
          "주소창의 페이지 메뉴에서 ‘도구 막대 가리기’를 선택합니다. 다시 보려면 화면 상단을 탭합니다.",
          "매장에서 반복해서 사용할 때는 공유 → 홈 화면에 추가를 선택합니다. ‘웹 앱으로 열기’가 보이면 켠 뒤 추가하고, 홈 화면의 아이콘으로 실행합니다.",
        ],
        note: "PC의 F11 전체 화면과는 다른 방식입니다. QR로 연 일반 브라우저나 앱 안의 브라우저에서 주소창을 항상 숨길 수 있는 것은 아닙니다.",
        sources: [
          ipadSource,
          {
            label: "홈 화면에서 앱처럼 열기",
            href: "https://support.apple.com/ko-kr/guide/ipad/ipad8f1f7a29/ipados",
          },
        ],
      },
      {
        id: "zoom",
        title: "읽기 편한 메뉴판 크기",
        body: "페이지 확대·축소로 화면의 글자와 이미지를 함께 조정하세요.",
        steps: [
          "Safari에서 메뉴판을 연 뒤 주소창의 페이지 메뉴를 엽니다.",
          "‘페이지 확대/축소’에서 확대 또는 축소를 선택합니다. 버전에 따라 큰 A·작은 A로 표시됩니다.",
          "기본 크기로 돌아가려면 실제 크기 또는 100%를 선택합니다.",
        ],
        note: "홈 화면으로 실행했을 때는 Safari의 확대 메뉴가 보이지 않을 수 있습니다. Safari에서 먼저 표시 상태를 확인하세요.",
        sources: [ipadSource],
      },
    ];
  if (device === "android")
    return [
      {
        id: "fullscreen",
        title: "태블릿에서 메뉴판 넓게 보기",
        body: "Android 태블릿은 PC와 전체 화면 방식이 다릅니다. 사용하는 브라우저의 화면 표시를 먼저 확인하세요.",
        steps: [
          `${GUIDE_BROWSER_LABELS[browser]}에서 공개 메뉴판 주소를 엽니다.`,
          "페이지를 스크롤해 주소창과 도구 막대가 접히는지 확인합니다. 기기와 버전에 따라 동작이 다를 수 있습니다.",
          "주소창을 계속 숨겨야 하는 매장용 화면이라면 PC의 Chrome·Edge 전체 화면 연결 방식을 이용하세요.",
        ],
        note: "홈 화면에 만든 일반 바로가기는 브라우저 주소창을 없애는 기능이 아닙니다. QR 접속이나 앱 내부 브라우저에서도 전체 화면을 보장하지 않습니다.",
      },
      browser === "samsung"
        ? {
            id: "zoom",
            title: "삼성 인터넷에서 읽기 크기 조정",
            body: "글자 크기와 화면 확대는 서로 다른 설정입니다. 필요한 방식으로 조정한 뒤 실제 메뉴 배치를 확인하세요.",
            steps: [
              "삼성 인터넷에서 메뉴판을 연 뒤 메뉴를 엽니다.",
              "‘글자 크기’가 제공되면 슬라이더로 조절합니다. 글자 크기는 글자 중심의 설정이며 PC의 전체 페이지 배율과 같지 않습니다.",
              "화면 전체를 일시적으로 확대하려면 지원되는 페이지에서 두 손가락을 벌리거나 오므립니다.",
            ],
            note: `${versionNote} 삼성 공식 안내는 Android 9~12 기준이며 최신 버전에서는 항목이 다를 수 있습니다.`,
            sources: [
              {
                label: "삼성전자서비스 공식 안내",
                href: "https://www.samsungsvc.co.kr/solution/36557",
              },
            ],
          }
        : {
            id: "zoom",
            title: "Chrome에서 메뉴판 크기 조정",
            body: "특정 메뉴판의 확대 배율을 조정해 글자와 이미지를 함께 크게 보세요.",
            steps: [
              "Chrome에서 메뉴판을 열고 더보기(⋮) → 확대/축소를 선택합니다.",
              "슬라이더를 움직여 편한 크기로 맞추고, 기본 크기는 100%로 되돌립니다.",
              "확대/축소 메뉴가 보이지 않으면 설정 → 접근성에서 ‘기본 메뉴에 확대/축소 옵션 표시’를 켭니다.",
            ],
            note: "특정 사이트의 배율 조정을 먼저 이용하세요. 접근성의 기본 확대/축소를 바꾸면 다른 사이트에도 영향을 줄 수 있습니다.",
            sources: [
              {
                ...chromeSource,
                href: "https://support.google.com/chrome/answer/96810?co=GENIE.Platform%3DAndroid&hl=ko",
              },
            ],
          },
    ];
  const mac = device === "mac";
  const safari = browser === "safari";
  const modifier = mac ? "⌘" : "Ctrl";
  const label = GUIDE_BROWSER_LABELS[browser];
  const source = browser === "edge" ? edgeSource : chromeSource;
  return [
    {
      id: "fullscreen",
      title: "주소창 없이 메뉴판에 집중하기",
      body: "전체 화면을 켜면 브라우저의 주소창과 도구 영역을 줄이고 메뉴판을 더 넓게 보여줄 수 있습니다.",
      steps: safari
        ? [
            "Safari에서 공개 메뉴판 주소를 엽니다.",
            "윈도우 왼쪽 위 초록색 버튼에서 전체 화면을 선택합니다.",
            "전체 화면에서 상단 보기 → ‘전체 화면에서 항상 도구 막대 보기’의 체크를 끕니다. 화면 위로 포인터를 가져가면 도구 막대가 다시 나타납니다.",
          ]
        : [
            `${label}에서 공개 메뉴판 주소를 엽니다.`,
            mac
              ? "윈도우 왼쪽 위 초록색 버튼으로 전체 화면을 시작합니다."
              : "오른쪽 위 더보기 메뉴의 확대/축소 옆 전체 화면 아이콘을 누르거나 F11을 누릅니다.",
            mac
              ? "상단 보기 메뉴에서 전체 화면의 도구 막대 표시 항목을 확인합니다. 표시되어 있다면 끄고, 포인터를 화면 아래로 옮겨 확인합니다."
              : "원래 창으로 돌아가려면 F11을 다시 누릅니다. 키보드 설정에 따라 Fn + F11이 필요할 수 있습니다.",
          ],
      note:
        safari || mac
          ? `${versionNote} 전체 화면 진입과 도구 막대 항상 표시는 서로 다른 설정입니다.`
          : "삼성·LG 등 PC 브랜드가 달라도 Windows의 Chrome·Edge는 같은 방식으로 설정합니다.",
      sources: safari ? [safariWindowSource] : [source],
    },
    {
      id: "zoom",
      title: "메뉴판 크기를 편하게 맞추기",
      body: "화면의 글자와 이미지가 작거나 크게 보이면 브라우저 배율을 한 단계씩 바꿔보세요.",
      steps: [
        safari
          ? "Safari의 보기 메뉴에서 확대 또는 축소를 선택합니다."
          : `${label}의 오른쪽 위 더보기 메뉴에서 확대/축소의 + 또는 −를 누릅니다.`,
        `단축키는 확대 ${modifier} + +, 축소 ${modifier} + −입니다. 메뉴판의 제목·가격·버튼이 잘 보이는지 확인합니다.`,
        safari
          ? "기본 배율은 보기 메뉴의 ‘실제 크기’로 되돌립니다."
          : `기본 배율은 100%로 맞추거나 ${modifier} + 0으로 되돌립니다.`,
      ],
      note: "브라우저 배율은 지금 보는 기기의 표시 크기입니다. 저장된 메뉴 디자인은 바뀌지 않으며, 글자만 바꾸려면 메뉴 관리의 디자인 설정을 이용하세요.",
      sources: safari ? [safariZoomSource] : [source],
    },
  ];
}
export function getGuideSections(
  plan: GuidePlan,
  device: GuideDevice,
  browser: GuideBrowser,
): GuideSection[] {
  const actualDevice = getGuideDevice(plan, device);
  const sections = browserSections(
    actualDevice,
    getGuideBrowser(actualDevice, browser),
  );
  if (plan === "dining")
    sections[0] = {
      ...sections[0],
      body: "다이닝 메뉴에서 표시할 페이지를 선택한 뒤 전체 화면을 켜세요.",
    };
  if (plan !== "display") return sections;
  return [
    {
      id: "connection",
      title: "매장의 큰 화면에 메뉴판 연결하기",
      body: "일반 모니터는 PC를 연결하고, 스마트 TV는 웹 브라우저 지원 여부를 먼저 확인하세요.",
      steps: [
        "미니 PC나 노트북을 HDMI로 모니터에 연결하고 모니터의 입력을 맞춥니다.",
        "연결한 PC에서 공개 메뉴판 주소를 열고 표시할 페이지를 선택합니다.",
        "브라우저 전체 화면과 모니터의 화면 방향·자동 꺼짐을 각각 확인합니다.",
      ],
      note: "스마트 TV는 모델별 브라우저와 웹 기능이 달라 같은 메뉴를 제공하지 않을 수 있습니다. TV 브라우저에서 표시가 어렵다면 PC 연결 방식을 이용하세요. 디스플레이 신규 신청은 준비 중입니다.",
    },
    ...sections,
  ];
}
