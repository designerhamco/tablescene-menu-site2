# Tablescene Menu Site

레스토랑용 반응형 웹 메뉴판 템플릿입니다.  
React와 Vite로 만들어졌고, 첫 버전은 구글 시트 연동 없이 로컬 데이터 파일을 수정해서 내용을 바꾸는 구조입니다.

## 배포 업데이트

최근 배포되었습니다.

## 사이트 구조

사이트는 하나의 웹앱 안에서 4개 페이지를 보여줍니다.

- Intro: 첫 화면
- About: 가게 소개, 주소, 운영시간, 셰프, SNS
- Menu: 여러 장으로 넘겨보는 메뉴판
- Events: 여러 장으로 넘겨보는 이벤트 안내

햄버거 메뉴를 누르면 원하는 페이지로 이동할 수 있습니다.  
모바일과 태블릿에서는 메뉴판처럼 화면을 꽉 채우고, 내용이 길면 각 페이지 안에서 스크롤됩니다.

## 어떤 파일을 수정하면 어디가 바뀌나요?

데이터는 `src/data` 폴더에 나누어져 있습니다.

| 수정할 파일 | 바뀌는 화면 |
| --- | --- |
| `src/data/settings.js` | 페이지 on/off, 섹션 on/off, 상단 사이트 이름 |
| `src/data/intro.js` | 인트로 페이지 |
| `src/data/about.js` | 소개 페이지, 가게 대표 이미지, 셰프 소개, SNS 링크 |
| `src/data/menu.js` | 메뉴 페이지 |
| `src/data/events.js` | 이벤트 페이지 |

화면 디자인을 바꾸고 싶으면 `src/styles/main.css`를 수정하면 됩니다.

## 페이지나 섹션 숨기기

`src/data/settings.js`에서 `enabled` 값을 바꾸면 페이지를 숨길 수 있습니다.

```js
menu: {
  enabled: false,
  label: "Menu",
}
```

섹션도 같은 방식으로 끌 수 있습니다.

```js
sections: {
  about: {
    chefs: false,
    sns: true,
    extraInfo: true,
  },
}
```

`true`는 보이기, `false`는 숨기기입니다.

## 소개 페이지 가게 이미지 수정 방법

`src/data/about.js`의 대표 이미지 필드를 수정합니다.

```js
heroImageEnabled: true,
heroImageUrl: "이미지 주소",
heroImageAlt: {
  ko: "이미지 설명",
  en: "Image description",
  zh: "图片说明",
  ja: "画像の説明",
},
```

주의할 점:

- 이미지를 보이게 하려면 `heroImageEnabled: true`로 둡니다.
- 이미지를 숨기려면 `heroImageEnabled: false`로 바꿉니다.
- 이미지 주소를 비우고 싶으면 `heroImageUrl: ""`로 입력하세요.
- `heroImageAlt`는 접근성과 대체 텍스트용 설명입니다.
- 나중에 구글 시트와 연결할 때는 `heroImageEnabled`, `heroImageUrl`, `heroImageAlt_ko`, `heroImageAlt_en`, `heroImageAlt_zh`, `heroImageAlt_ja` 컬럼으로 옮기기 쉽습니다.

## 메뉴 추가 방법

`src/data/menu.js`를 엽니다.  
메뉴는 아래 순서로 들어 있습니다.

```txt
slides
└─ categories
   └─ items
```

새 메뉴를 추가하려면 원하는 카테고리의 `items` 배열 안에서 기존 메뉴 한 묶음을 복사한 뒤, 쉼표 뒤에 붙여 넣고 내용을 바꾸면 됩니다.

문구 필드는 다국어 객체로 입력합니다.

```js
name: {
  ko: "새 메뉴 이름",
  en: "New Menu",
  zh: "新菜单",
  ja: "新メニュー",
}
```

선택한 언어 값이 비어 있으면 `ko` 값이 대신 보입니다.

```js
{
  id: "menu-008",
  categoryId: "category-001",
  enabled: true,
  name: {
    ko: "새 메뉴 이름",
    en: "New Menu",
    zh: "新菜单",
    ja: "新メニュー",
  },
  price: 15000,
  description: {
    ko: "메뉴 설명",
    en: "Menu description",
    zh: "菜单说明",
    ja: "メニュー説明",
  },
  isRecommended: false,
  useLabel: true,
  labelName: {
    ko: "신메뉴",
    en: "New",
    zh: "新品",
    ja: "新メニュー",
  },
  isSoldOut: false,
  imageUrl: "",
  origin: {
    ko: "원산지 정보",
    en: "Origin information",
    zh: "产地信息",
    ja: "原産地情報",
  },
  sortOrder: 3,
}
```

주의할 점:

- `id`는 다른 메뉴와 겹치지 않게 바꿔주세요.
- `price`는 숫자로 쓰면 `15,000원`처럼 표시됩니다.
- `labelName`은 `BEST`, `NEW`, `추천` 등 원하는 문구를 자유롭게 넣을 수 있습니다.
- 이미지를 쓰지 않으려면 `imageUrl: ""`로 비워두세요.
- 메뉴를 잠깐 숨기려면 `enabled: false`로 바꾸세요.

## 셰프 추가 방법

`src/data/about.js`의 `chefs` 배열을 수정합니다.  
기존 셰프 한 묶음을 복사해서 쉼표 뒤에 붙여 넣고 내용을 바꾸면 됩니다.

```js
{
  id: "chef-003",
  enabled: true,
  name: {
    ko: "셰프 이름",
    en: "Chef Name",
    zh: "厨师姓名",
    ja: "シェフ名",
  },
  title: {
    ko: "셰프",
    en: "Chef",
    zh: "厨师",
    ja: "シェフ",
  },
  description: {
    ko: "셰프 소개 문구",
    en: "Chef introduction",
    zh: "厨师介绍",
    ja: "シェフ紹介文",
  },
  imageUrl: "",
  sortOrder: 3,
}
```

주의할 점:

- `id`는 `chef-003`, `chef-004`처럼 겹치지 않게 입력하세요.
- 이미지가 없으면 `imageUrl: ""`로 비워두세요.
- 화면에서 숨기려면 `enabled: false`로 바꾸세요.

## SNS 추가 방법

`src/data/about.js`의 `sns` 배열을 수정합니다.  
기존 SNS 한 묶음을 복사해서 쉼표 뒤에 붙여 넣고 내용을 바꾸면 됩니다.

```js
{
  id: "sns-003",
  enabled: true,
  type: "youtube",
  label: "YouTube",
  url: "https://youtube.com",
  sortOrder: 3,
}
```

`label`은 화면에 보이는 이름이고, `url`은 클릭했을 때 이동할 주소입니다.

## 이벤트 추가 방법

`src/data/events.js`의 `slides` 배열을 수정합니다.  
기존 이벤트 한 묶음을 복사해서 쉼표 뒤에 붙여 넣고 내용을 바꾸면 됩니다.

```js
{
  id: "event-004",
  enabled: true,
  visible: true,
  title: {
    ko: "새 이벤트 제목",
    en: "New Event",
    zh: "新活动",
    ja: "新イベント",
  },
  subtitle: {
    ko: "부제목",
    en: "Subtitle",
    zh: "副标题",
    ja: "サブタイトル",
  },
  description: {
    ko: "이벤트 설명 또는 혜택 문구",
    en: "Event description or benefit copy",
    zh: "活动说明或优惠文案",
    ja: "イベント説明または特典文",
  },
  imageUrl: "",
  period: {
    ko: "2026.05.01 - 2026.05.31",
    en: "May 1, 2026 - May 31, 2026",
    zh: "2026.05.01 - 2026.05.31",
    ja: "2026.05.01 - 2026.05.31",
  },
  price: {
    ko: "1인 29,000원",
    en: "KRW 29,000 per person",
    zh: "每人 29,000韩元",
    ja: "1名 29,000ウォン",
  },
  benefitDetails: {
    ko: "혜택 상세 내용",
    en: "Benefit details",
    zh: "优惠详情",
    ja: "特典詳細",
  },
  sortOrder: 4,
}
```

주의할 점:

- `enabled: false`는 이벤트 데이터 자체를 끄는 값입니다.
- `visible: false`는 데이터를 남겨두되 고객 화면에는 숨기는 값입니다.
- 이미지가 없으면 `imageUrl: ""`로 비워두세요.

## 실행 방법

처음 한 번만 설치합니다.

```bash
npm install
```

개발 서버를 실행합니다.

```bash
npm run dev
```

터미널에 표시되는 `Local:` 주소를 브라우저에서 열면 됩니다.

예시:

```txt
http://127.0.0.1:5173/
```

이미 다른 서버가 `5173` 포트를 사용 중이면 `5174`, `5175`처럼 다른 주소가 표시될 수 있습니다. 그때는 터미널에 나온 주소로 접속하세요.

## 나중에 구글 시트와 연결하기

현재 화면은 `src/data/index.js`에서 합쳐진 `restaurantData`를 사용합니다.  
지금은 로컬 데이터가 `src/lib/normalizeRestaurantData.js`를 거쳐 화면에 들어갑니다.  
나중에 구글 시트를 연결할 때도 화면 컴포넌트는 그대로 두고, Google Sheets 데이터를 앱 내부의 다국어 객체 구조로 변환하면 됩니다.

현재 프로젝트는 `VITE_SHEET_WEBAPP_URL` 환경변수에 Google Apps Script 웹앱 JSON URL이 있으면, 사이트 시작 시 해당 URL을 먼저 읽습니다.  
불러오기에 성공하면 시트 데이터를 사용하고, 실패하거나 환경변수가 비어 있으면 기존 로컬 데이터 파일을 자동으로 사용합니다.

로컬에서 테스트하려면 프로젝트 루트에 `.env.local` 파일을 만들고 아래처럼 입력합니다.

```txt
VITE_SHEET_WEBAPP_URL=Google Apps Script 웹앱 JSON URL
```

`.env.local`은 GitHub에 올리지 않습니다. Cloudflare Pages에서는 대시보드의 환경변수 설정에 같은 이름으로 등록해야 합니다.

시트 컬럼을 앱 내부 구조로 바꾸는 helper는 `src/lib/normalizeSheetData.js`에 준비해두었습니다.  
예를 들어 시트에 `name_ko`, `name_en`, `name_zh`, `name_ja` 컬럼이 있으면 앱 안에서는 아래처럼 바꿔서 사용합니다.

```js
name: {
  ko: "새 메뉴 이름",
  en: "New Menu",
  zh: "新菜单",
  ja: "新メニュー",
}
```

번역이 비어 있으면 화면에서는 한국어(`ko`) 값을 대신 보여줍니다.

추천 시트 탭과 주요 컬럼은 아래처럼 잡으면 좋습니다.

| 시트 탭 | 주요 컬럼 |
| --- | --- |
| `Settings` | `siteTitle`, `defaultPage`, `introEnabled`, `aboutEnabled`, `menuEnabled`, `eventsEnabled` |
| `Intro` | `enabled`, `storeName_ko`, `storeName_en`, `storeName_zh`, `storeName_ja`, `headline_ko`, `headline_en`, `headline_zh`, `headline_ja`, `shortText_ko`, `shortText_en`, `shortText_zh`, `shortText_ja`, `backgroundImageUrl`, `startButtonText_ko`, `startButtonText_en`, `startButtonText_zh`, `startButtonText_ja` |
| `About` | `enabled`, `storeName_ko`, `storeName_en`, `storeName_zh`, `storeName_ja`, `description_ko`, `description_en`, `description_zh`, `description_ja`, `address_ko`, `address_en`, `address_zh`, `address_ja`, `hours_ko`, `hours_en`, `hours_zh`, `hours_ja`, `contactType`, `contactLabel_ko`, `contactLabel_en`, `contactLabel_zh`, `contactLabel_ja`, `contactValue`, `contactLink`, `heroImageEnabled`, `heroImageUrl`, `heroImageAlt_ko`, `heroImageAlt_en`, `heroImageAlt_zh`, `heroImageAlt_ja`, `mapLink`, `reservationHours_ko`, `reservationHours_en`, `reservationHours_zh`, `reservationHours_ja`, `parking_ko`, `parking_en`, `parking_zh`, `parking_ja`, `wifi_ko`, `wifi_en`, `wifi_zh`, `wifi_ja`, `corkage_ko`, `corkage_en`, `corkage_zh`, `corkage_ja`, `closedDays_ko`, `closedDays_en`, `closedDays_zh`, `closedDays_ja` |
| `Chefs` | `id`, `enabled`, `name_ko`, `name_en`, `name_zh`, `name_ja`, `title_ko`, `title_en`, `title_zh`, `title_ja`, `description_ko`, `description_en`, `description_zh`, `description_ja`, `imageUrl`, `sortOrder` |
| `SNS` | `id`, `enabled`, `type`, `label`, `url`, `sortOrder` |
| `MenuSlides` | `id`, `enabled`, `title_ko`, `title_en`, `title_zh`, `title_ja`, `sortOrder` |
| `MenuCategories` | `id`, `slideId`, `enabled`, `name_ko`, `name_en`, `name_zh`, `name_ja`, `sortOrder` |
| `MenuItems` | `id`, `categoryId`, `enabled`, `name_ko`, `name_en`, `name_zh`, `name_ja`, `price`, `description_ko`, `description_en`, `description_zh`, `description_ja`, `isRecommended`, `useLabel`, `labelName_ko`, `labelName_en`, `labelName_zh`, `labelName_ja`, `isSoldOut`, `imageUrl`, `origin_ko`, `origin_en`, `origin_zh`, `origin_ja`, `sortOrder` |
| `Events` | `id`, `enabled`, `visible`, `title_ko`, `title_en`, `title_zh`, `title_ja`, `subtitle_ko`, `subtitle_en`, `subtitle_zh`, `subtitle_ja`, `description_ko`, `description_en`, `description_zh`, `description_ja`, `imageUrl`, `period_ko`, `period_en`, `period_zh`, `period_ja`, `price_ko`, `price_en`, `price_zh`, `price_ja`, `benefitDetails_ko`, `benefitDetails_en`, `benefitDetails_zh`, `benefitDetails_ja`, `sortOrder` |

핵심 원칙:

- 여러 행으로 늘어나는 데이터에는 `id`, `enabled`, `sortOrder`를 둡니다.
- 고객에게 보여줄지 따로 관리해야 하는 이벤트에는 `visible`을 함께 둡니다.
- 화면에 보이는 문구는 `name_ko`, `name_en`, `name_zh`, `name_ja`처럼 언어 코드를 붙인 컬럼으로 나누면 지금의 다국어 객체 구조로 바꾸기 쉽습니다.
- 번역이 비어 있으면 한국어(`_ko`) 값을 대신 보여주는 구조로 두면 됩니다.
- 이미지 주소 필드는 `imageUrl` 또는 더 구체적인 `heroImageUrl`, `backgroundImageUrl`처럼 `Url`로 끝나게 맞춥니다.
- 시트에서 가져온 원본 데이터는 바로 컴포넌트에 넣지 말고, `src/lib/normalizeRestaurantData.js`에서 변환한 뒤 사용합니다.

### Google Apps Script 응답 속도 개선

사이트는 시트 데이터를 `VITE_SHEET_WEBAPP_URL`에 등록된 Apps Script 웹앱 JSON URL에서 읽습니다.  
첫 방문 로딩이 길게 느껴지면 Apps Script 쪽에서 `CacheService`를 사용해 JSON 응답을 잠깐 저장하는 방식이 가장 효과적입니다.

권장 캐시 시간은 60초에서 300초 사이입니다.

- 시트를 수정한 내용이 거의 즉시 반영되어야 하면 `60초`
- 방문자가 많고 속도가 더 중요하면 `300초`

Apps Script의 `doGet` 함수는 아래 흐름으로 구성하면 됩니다.

```js
const CACHE_KEY = "tablescene-menu-json";
const CACHE_SECONDS = 60;

function doGet() {
  const cache = CacheService.getScriptCache();
  const cachedJson = cache.get(CACHE_KEY);

  if (cachedJson) {
    return createJsonResponse(cachedJson);
  }

  const data = buildRestaurantJsonFromSheets();
  const json = JSON.stringify(data);

  cache.put(CACHE_KEY, json, CACHE_SECONDS);

  return createJsonResponse(json);
}

function createJsonResponse(json) {
  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}
```

기존 Apps Script에 이미 시트를 읽어서 JSON을 만드는 코드가 있다면, 그 부분을 `buildRestaurantJsonFromSheets()` 함수 안으로 옮기면 됩니다.

```js
function buildRestaurantJsonFromSheets() {
  // 기존에 Intro, About, MenuItems, Events 탭을 읽어서
  // JSON 객체로 만들던 코드를 여기에 넣습니다.
  return {
    intro: [],
    about: [],
    menuSlides: [],
    menuCategories: [],
    menuItems: [],
    events: [],
  };
}
```

시트를 수정했는데 바로 반영하고 싶다면 캐시 시간이 끝날 때까지 기다리거나, Apps Script 편집기에서 아래 함수를 한 번 실행해 캐시를 비울 수 있습니다.

```js
function clearTablesceneCache() {
  CacheService.getScriptCache().remove("tablescene-menu-json");
}
```

현재 사이트 쪽에서도 마지막으로 성공한 시트 데이터를 브라우저 `localStorage`에 저장합니다.  
그래서 첫 방문은 Apps Script 응답을 기다리지만, 재방문부터는 저장된 시트 데이터를 먼저 보여주고 백그라운드에서 최신 데이터를 다시 불러옵니다.

### 시트 행 변환 예시

Google Sheets의 `MenuItems` 탭 한 행이 아래처럼 들어온다고 가정합니다.

```js
{
  id: "menu-008",
  name_ko: "새 메뉴 이름",
  name_en: "New Menu",
  name_zh: "新菜单",
  name_ja: "新メニュー",
  description_ko: "메뉴 설명",
  description_en: "Menu description",
  description_zh: "菜单说明",
  description_ja: "メニュー説明",
}
```

`normalizeSheetData.js`의 helper를 거치면 앱에서는 아래처럼 쓰기 좋은 형태가 됩니다.

```js
{
  id: "menu-008",
  name: {
    ko: "새 메뉴 이름",
    en: "New Menu",
    zh: "新菜单",
    ja: "新メニュー",
  },
  description: {
    ko: "메뉴 설명",
    en: "Menu description",
    zh: "菜单说明",
    ja: "メニュー説明",
  },
}
```

소개 페이지 대표 이미지는 `About` 탭에서 아래 컬럼으로 제어하면 됩니다.

| 컬럼 | 의미 |
| --- | --- |
| `heroImageEnabled` | `true`면 이미지 표시, `false`면 숨김 |
| `heroImageUrl` | 표시할 이미지 주소 |
| `heroImageAlt_ko` | 한국어 이미지 설명 |
| `heroImageAlt_en` | 영어 이미지 설명 |
| `heroImageAlt_zh` | 중국어 이미지 설명 |
| `heroImageAlt_ja` | 일본어 이미지 설명 |

## 배포 전 마지막 확인

Cloudflare Pages에 올리기 전, VS Code 터미널에서 아래 명령을 확인합니다.

```bash
npm run dev
```

개발 서버 주소가 나오면 브라우저에서 화면이 잘 보이는지 확인합니다.

```bash
npm run build
```

`npm run build`가 에러 없이 끝나면 배포 준비는 거의 끝난 상태입니다.  
Cloudflare Pages는 사용자가 입력한 빌드 명령의 종료 코드가 `0`이면 빌드 성공으로 판단합니다.

## 배포에 올리지 않아도 되는 파일

GitHub에는 소스 코드와 설정 파일만 올리면 됩니다.  
아래 파일과 폴더는 `.gitignore`에 들어 있어서 GitHub에 올리지 않습니다.

| 파일 또는 폴더 | 이유 |
| --- | --- |
| `node_modules` | `npm install`로 다시 설치되는 패키지 폴더 |
| `dist` | `npm run build`로 다시 만들어지는 빌드 결과물 |
| `.DS_Store` | macOS가 자동으로 만드는 로컬 파일 |
| `*.log` | 실행 중 생길 수 있는 로그 파일 |
| `.env`, `.env.local` | 나중에 API 키 같은 민감한 값을 넣을 수 있는 환경 파일 |

## Cloudflare Pages 설정값

Cloudflare Pages에서 GitHub 저장소를 연결한 뒤, 빌드 설정은 아래처럼 입력합니다.

| 항목 | 값 |
| --- | --- |
| Framework preset | `Vite` |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | 비워두기 |

이 프로젝트는 Vite 기반 React 앱이므로 빌드 결과가 `dist` 폴더에 만들어집니다.

Google Apps Script 웹앱 JSON을 사용하려면 Cloudflare Pages의 환경변수에도 아래 값을 추가합니다.

| 환경변수 이름 | 값 |
| --- | --- |
| `VITE_SHEET_WEBAPP_URL` | Google Apps Script 웹앱 JSON URL |

이 값을 추가하거나 바꾼 뒤에는 Cloudflare Pages에서 다시 배포해야 사이트에 반영됩니다.

## GitHub에 코드 올리기

아직 GitHub에 올리지 않았다면 프로젝트 폴더에서 아래 순서로 진행합니다.

```bash
git init
git add .
git commit -m "first deploy prep"
```

그다음 GitHub에서 새 저장소를 만든 뒤, GitHub가 보여주는 저장소 주소를 연결해서 푸시합니다.

```bash
git branch -M main
git remote add origin 깃허브저장소주소
git push -u origin main
```

여기까지 끝나면 Cloudflare Pages에서 이 GitHub 저장소를 연결할 수 있습니다.

## Cloudflare Pages 배포 순서

1. Cloudflare 대시보드에서 `Workers & Pages`로 이동합니다.
2. `Create application` 또는 `Create project`를 선택합니다.
3. `Pages`에서 GitHub 저장소를 연결합니다.
4. 방금 올린 저장소를 선택합니다.
5. 빌드 설정에 아래 값을 입력합니다.

```txt
Framework preset: Vite
Build command: npm run build
Build output directory: dist
```

6. 배포를 시작합니다.
7. 빌드가 성공하면 Cloudflare가 제공하는 Pages 주소로 사이트를 확인합니다.
