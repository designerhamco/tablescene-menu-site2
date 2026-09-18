import type { MenuPageData } from "@/lib/menu-page-data";
import type { SupportedLocale } from "@/lib/locales";
import { getStarterPreset } from "@/lib/menu-starter-presets";
import { getSinglePageStarterTranslations, type SinglePageStarterTranslationLocale } from "@/lib/template-demo-data/single-page-starter-translations";

type PreviewTextLocale = Exclude<SupportedLocale, "ko">;

const COMMON_LABELS: Record<PreviewTextLocale, Record<string, string>> = {
  en: {
    "파인다이닝": "Fine dining",
    "카페": "Cafe",
    "디스플레이": "Display",
    "시즌할인": "SEASONAL DEAL",
    "커피할인": "COFFEE DEAL",
    "썸머 시그니처 특별가": "Summer signature special",
    "클래식 커피 특별가": "Classic coffee special",
  },
  zh: {
    "파인다이닝": "精致餐饮",
    "카페": "咖啡馆",
    "디스플레이": "电子菜单屏",
    "BEST": "人气",
    "NEW": "新品",
    "SIGNATURE": "招牌",
    "시즌할인": "季节优惠",
    "커피할인": "咖啡优惠",
    "썸머 시그니처 특별가": "夏日招牌特价",
    "클래식 커피 특별가": "经典咖啡特价",
    "HOT": "热饮",
    "ICE": "冰饮",
    "Glass": "杯",
    "Bottle": "瓶",
  },
  ja: {
    "파인다이닝": "ファインダイニング",
    "카페": "カフェ",
    "디스플레이": "デジタルメニュー",
    "BEST": "人気",
    "NEW": "新作",
    "SIGNATURE": "シグネチャー",
    "시즌할인": "季節割引",
    "커피할인": "コーヒー割引",
    "썸머 시그니처 특별가": "サマーシグネチャー特別価格",
    "클래식 커피 특별가": "クラシックコーヒー特別価格",
    "HOT": "ホット",
    "ICE": "アイス",
    "Glass": "グラス",
    "Bottle": "ボトル",
  },
};

const AUBE_TABLE_COPY: Record<PreviewTextLocale, Record<string, string>> = {
  en: {
    "오브 테이블": "Aube Table",
    "계절의 온도와 식재료의 결을 한 접시씩 섬세하게 풀어냅니다.": "Each plate delicately expresses the season and the natural texture of its ingredients.",
    "제철 산지의 식재료를 절제된 조리와 섬세한 서비스로 완성하는 컨템포러리 다이닝입니다.": "Contemporary dining shaped by seasonal ingredients, restrained technique, and thoughtful service.",
    "오브 테이블 스페셜 코스 & 셰프 셀렉션": "Aube Table Special Course & Chef Selection",
    "한 접시에서 다음 접시로 이어지는 계절의 흐름을 소개합니다.": "Discover the flow of the season from one plate to the next.",
    "서울시 예시구 아티메뉴로 10": "10 ArtiMenu-ro, Yesi-gu, Seoul",
    "알레르기 및 식이 제한은 예약 시 알려주세요.": "Please tell us about allergies or dietary restrictions when booking.",
    "오브 테이블의 계절을 가장 온전히 경험하는 시그니처 코스": "A signature course that captures the season of Aube Table.",
    "제철 산지의 식재료를 여덟 장면으로 풀어낸 디너 코스": "An eight-scene dinner course built around seasonal ingredients.",
    "1인 기준 · 와인 페어링 + ₩120,000": "Per guest · Wine pairing + ₩120,000",
    "제주 성게 · 감태 · 유자": "Jeju sea urchin · gamtae · yuzu",
    "숙성 방어 · 무 · 캐비아": "Aged yellowtail · radish · caviar",
    "화이트 아스파라거스 · 헤이즐넛": "White asparagus · hazelnut",
    "제주 옥돔 · 조개 · 샤프란": "Jeju tilefish · shellfish · saffron",
    "한우 안심 · 셀러리악 · 트러플": "Hanwoo tenderloin · celeriac · truffle",
    "금귤 · 바닐라 · 올리브 오일": "Kumquat · vanilla · olive oil",
    "오늘의 식재료를 취향에 따라 선택하는 단품 메뉴": "À la carte plates selected to suit your taste and today's ingredients.",
    "식사의 시작을 여는 가벼운 접시": "Light plates to begin the meal.",
    "관자와 시금치": "Scallop & Spinach",
    "가리비 관자 · 시금치 퓌레 · 레몬 버터": "Scallop · spinach purée · lemon butter",
    "랍스터 비스크": "Lobster Bisque",
    "랍스터 · 코냑 · 펜넬": "Lobster · cognac · fennel",
    "제철 식재료의 풍미를 깊게 담은 메인": "Main dishes that bring out the depth of seasonal ingredients.",
    "제주 옥돔": "Jeju Tilefish",
    "조개 육수 · 샤프란 · 제철 채소": "Shellfish broth · saffron · seasonal vegetables",
    "한우 안심": "Hanwoo Tenderloin",
    "셀러리악 · 트러플 · 레드 와인 소스": "Celeriac · truffle · red wine sauce",
    "계절의 여운을 남기는 디저트": "Desserts that leave a seasonal finish.",
    "금귤과 바닐라": "Kumquat & Vanilla",
    "금귤 · 마다가스카르 바닐라 · 올리브 오일": "Kumquat · Madagascar vanilla · olive oil",
    "초콜릿과 헤이즐넛": "Chocolate & Hazelnut",
    "다크 초콜릿 · 헤이즐넛 · 에스프레소": "Dark chocolate · hazelnut · espresso",
    "요리의 흐름을 이어주는 와인과 논알코올 셀렉션": "Wine and non-alcoholic selections that continue the flow of the meal.",
    "소믈리에가 고른 글라스와 보틀 셀렉션": "Sommelier-selected wines by the glass and bottle.",
    "차와 발효 음료로 구성한 페어링": "A pairing of tea and fermented drinks.",
    "제철 과실과 허브로 완성한 논알코올 칵테일": "A non-alcoholic cocktail made with seasonal fruit and herbs.",
    "제철 허브와 차를 발효한 스파클링 티": "Sparkling tea fermented with seasonal herbs.",
    "시그니처 코스를 위한 6잔 구성": "Six glasses selected for the signature course.",
    "차와 발효 음료를 중심으로 한 6잔 구성": "Six tea and fermented-drink pairings.",
  },
  zh: {
    "오브 테이블": "AUBE TABLE",
    "계절의 온도와 식재료의 결을 한 접시씩 섬세하게 풀어냅니다.": "以一道道料理细腻呈现季节的温度与食材的质感。",
    "제철 산지의 식재료를 절제된 조리와 섬세한 서비스로 완성하는 컨템포러리 다이닝입니다.": "以当季产地食材、克制的烹饪和细致服务完成的现代餐饮体验。",
    "오브 테이블 스페셜 코스 & 셰프 셀렉션": "AUBE TABLE 特别套餐与主厨精选",
    "한 접시에서 다음 접시로 이어지는 계절의 흐름을 소개합니다.": "从一道料理到下一道，感受季节流转。",
    "서울시 예시구 아티메뉴로 10": "首尔市示例区 ArtiMenu路 10",
    "알레르기 및 식이 제한은 예약 시 알려주세요.": "如有过敏或饮食限制，请在预约时告知。",
    "Signature Course": "招牌套餐",
    "오브 테이블의 계절을 가장 온전히 경험하는 시그니처 코스": "完整体验 AUBE TABLE 季节风味的招牌套餐。",
    "Aube signature": "AUBE 招牌套餐",
    "제철 산지의 식재료를 여덟 장면으로 풀어낸 디너 코스": "以八道料理演绎当季产地食材的晚餐套餐。",
    "1인 기준 · 와인 페어링 + ₩120,000": "每位 · 葡萄酒搭配 + ₩120,000",
    "Amuse-bouche": "开胃小点", "Cold starter": "冷前菜", "Warm starter": "温前菜", "Fish": "鱼料理", "Main": "主菜", "Dessert": "甜点",
    "제주 성게 · 감태 · 유자": "济州海胆 · 甘苔 · 柚子",
    "숙성 방어 · 무 · 캐비아": "熟成鰤鱼 · 萝卜 · 鱼子酱",
    "화이트 아스파라거스 · 헤이즐넛": "白芦笋 · 榛子",
    "제주 옥돔 · 조개 · 샤프란": "济州玉鲷 · 贝类 · 藏红花",
    "한우 안심 · 셀러리악 · 트러플": "韩牛里脊 · 根芹 · 松露",
    "금귤 · 바닐라 · 올리브 오일": "金橘 · 香草 · 橄榄油",
    "A La Carte Menu": "单点菜单",
    "오늘의 식재료를 취향에 따라 선택하는 단품 메뉴": "依照喜好选择今日食材制作的单点料理。",
    "Starter": "前菜", "식사의 시작을 여는 가벼운 접시": "开启用餐体验的轻盈前菜。",
    "관자와 시금치": "扇贝与菠菜", "가리비 관자 · 시금치 퓌레 · 레몬 버터": "扇贝 · 菠菜泥 · 柠檬黄油",
    "랍스터 비스크": "龙虾浓汤", "랍스터 · 코냑 · 펜넬": "龙虾 · 干邑 · 茴香",
    "제철 식재료의 풍미를 깊게 담은 메인": "充分展现当季食材风味的主菜。",
    "제주 옥돔": "济州玉鲷", "조개 육수 · 샤프란 · 제철 채소": "贝类高汤 · 藏红花 · 时令蔬菜",
    "한우 안심": "韩牛里脊", "셀러리악 · 트러플 · 레드 와인 소스": "根芹 · 松露 · 红酒酱",
    "계절의 여운을 남기는 디저트": "留下季节余韵的甜点。",
    "금귤과 바닐라": "金橘与香草", "금귤 · 마다가스카르 바닐라 · 올리브 오일": "金橘 · 马达加斯加香草 · 橄榄油",
    "초콜릿과 헤이즐넛": "巧克力与榛子", "다크 초콜릿 · 헤이즐넛 · 에스프레소": "黑巧克力 · 榛子 · 浓缩咖啡",
    "Drink Menu": "饮品菜单", "요리의 흐름을 이어주는 와인과 논알코올 셀렉션": "延续料理节奏的葡萄酒与无酒精饮品精选。",
    "Wine": "葡萄酒", "소믈리에가 고른 글라스와 보틀 셀렉션": "侍酒师精选杯装与瓶装葡萄酒。",
    "Non-alcohol": "无酒精饮品", "차와 발효 음료로 구성한 페어링": "以茶与发酵饮品组成的搭配。",
    "Seasonal mocktail": "时令无酒精鸡尾酒", "제철 과실과 허브로 완성한 논알코올 칵테일": "以时令水果和香草调制的无酒精鸡尾酒。",
    "Sparkling tea": "气泡茶", "제철 허브와 차를 발효한 스파클링 티": "以时令香草和茶发酵制成的气泡茶。",
    "Mineral water": "矿泉水", "Wine pairing": "葡萄酒搭配", "시그니처 코스를 위한 6잔 구성": "为招牌套餐搭配的六杯酒款。",
    "Non-alcohol pairing": "无酒精搭配", "차와 발효 음료를 중심으로 한 6잔 구성": "以茶和发酵饮品为主的六杯搭配。",
  },
  ja: {
    "오브 테이블": "AUBE TABLE",
    "계절의 온도와 식재료의 결을 한 접시씩 섬세하게 풀어냅니다.": "季節の温度と食材の質感を、一皿ずつ丁寧に表現します。",
    "제철 산지의 식재료를 절제된 조리와 섬세한 서비스로 완성하는 컨템포러리 다이닝입니다.": "旬の産地食材を、端正な調理ときめ細かなサービスで仕上げるコンテンポラリーダイニングです。",
    "오브 테이블 스페셜 코스 & 셰프 셀렉션": "AUBE TABLE スペシャルコース＆シェフセレクション",
    "한 접시에서 다음 접시로 이어지는 계절의 흐름을 소개합니다.": "一皿から次の一皿へと続く季節の流れをご紹介します。",
    "서울시 예시구 아티메뉴로 10": "ソウル市イェシ区アーティメニュー路10",
    "알레르기 및 식이 제한은 예약 시 알려주세요.": "アレルギーや食事制限はご予約時にお知らせください。",
    "Signature Course": "シグネチャーコース", "오브 테이블의 계절을 가장 온전히 경험하는 시그니처 코스": "AUBE TABLEの季節を余すことなく味わうシグネチャーコースです。",
    "Aube signature": "AUBE シグネチャー", "제철 산지의 식재료를 여덟 장면으로 풀어낸 디너 코스": "旬の産地食材を八つの皿で表現したディナーコースです。",
    "1인 기준 · 와인 페어링 + ₩120,000": "お一人様 · ワインペアリング + ₩120,000",
    "Amuse-bouche": "アミューズ", "Cold starter": "冷前菜", "Warm starter": "温前菜", "Fish": "魚料理", "Main": "メイン", "Dessert": "デザート",
    "제주 성게 · 감태 · 유자": "済州ウニ · カムテ · 柚子", "숙성 방어 · 무 · 캐비아": "熟成ブリ · 大根 · キャビア", "화이트 아스파라거스 · 헤이즐넛": "ホワイトアスパラガス · ヘーゼルナッツ", "제주 옥돔 · 조개 · 샤프란": "済州アマダイ · 貝 · サフラン", "한우 안심 · 셀러리악 · 트러플": "韓牛フィレ · セロリアック · トリュフ", "금귤 · 바닐라 · 올리브 오일": "金柑 · バニラ · オリーブオイル",
    "A La Carte Menu": "アラカルトメニュー", "오늘의 식재료를 취향에 따라 선택하는 단품 메뉴": "本日の食材をお好みに合わせて選べるアラカルトです。",
    "Starter": "前菜", "식사의 시작을 여는 가벼운 접시": "食事の始まりを彩る軽やかな一皿です。", "관자와 시금치": "帆立とほうれん草", "가리비 관자 · 시금치 퓌레 · 레몬 버터": "帆立 · ほうれん草のピュレ · レモンバター", "랍스터 비스크": "オマール海老のビスク", "랍스터 · 코냑 · 펜넬": "オマール海老 · コニャック · フェンネル",
    "제철 식재료의 풍미를 깊게 담은 메인": "旬の食材の味わいを深く引き出したメインです。", "제주 옥돔": "済州アマダイ", "조개 육수 · 샤프란 · 제철 채소": "貝の出汁 · サフラン · 旬野菜", "한우 안심": "韓牛フィレ", "셀러리악 · 트러플 · 레드 와인 소스": "セロリアック · トリュフ · 赤ワインソース",
    "계절의 여운을 남기는 디저트": "季節の余韻を残すデザートです。", "금귤과 바닐라": "金柑とバニラ", "금귤 · 마다가스카르 바닐라 · 올리브 오일": "金柑 · マダガスカルバニラ · オリーブオイル", "초콜릿과 헤이즐넛": "チョコレートとヘーゼルナッツ", "다크 초콜릿 · 헤이즐넛 · 에스프레소": "ダークチョコレート · ヘーゼルナッツ · エスプレッソ",
    "Drink Menu": "ドリンクメニュー", "요리의 흐름을 이어주는 와인과 논알코올 셀렉션": "料理の流れをつなぐワインとノンアルコールのセレクションです。", "Wine": "ワイン", "소믈리에가 고른 글라스와 보틀 셀렉션": "ソムリエが選んだグラスとボトルのセレクションです。", "Non-alcohol": "ノンアルコール", "차와 발효 음료로 구성한 페어링": "お茶と発酵ドリンクのペアリングです。", "Seasonal mocktail": "季節のモクテル", "제철 과실과 허브로 완성한 논알코올 칵테일": "旬の果実とハーブで仕上げたノンアルコールカクテルです。", "Sparkling tea": "スパークリングティー", "제철 허브와 차를 발효한 스파클링 티": "旬のハーブとお茶を発酵させたスパークリングティーです。", "Mineral water": "ミネラルウォーター", "Wine pairing": "ワインペアリング", "시그니처 코스를 위한 6잔 구성": "シグネチャーコースに合わせた6杯構成です。", "Non-alcohol pairing": "ノンアルコールペアリング", "차와 발효 음료를 중심으로 한 6잔 구성": "お茶と発酵ドリンクを中心にした6杯構成です。",
  },
};

const MARAIS_COPY: Record<PreviewTextLocale, Record<string, string>> = {
  en: {
    "메종 마레": "Maison Marais", "불과 숲, 제철의 풍경을 한 접시마다 현대적인 감각으로 풀어냅니다.": "Each plate interprets fire, forest, and the season through a modern lens.", "프렌치 조리의 섬세함에 한국의 계절감을 더한 컨템포러리 다이닝입니다.": "Contemporary dining that pairs refined French technique with Korean seasonality.", "계절의 풍경을 담은 모던 프렌치 다이닝": "Modern French dining inspired by seasonal landscapes.", "정교한 소스와 제철 식재료가 만드는 저녁의 흐름을 소개합니다.": "An evening shaped by precise sauces and seasonal ingredients.", "서울시 예시구 마레길 12": "12 Marais-gil, Yesi-gu, Seoul", "알레르기 및 식이 제한은 예약 시 알려주세요.": "Please tell us about allergies or dietary restrictions when booking.",
    "메종 마레의 계절을 여섯 장면으로 경험하는 디너 코스": "A six-scene dinner course through the season of Maison Marais.", "숲과 바다, 불의 온도를 따라 이어지는 셰프 테이스팅": "A chef's tasting that moves through forest, sea, and fire.", "1인 기준 · 와인 페어링 + ₩95,000": "Per guest · Wine pairing + ₩95,000",
    "첫 인사": "Welcome Bite", "참돔 · 청사과 · 딜": "Red sea bream · green apple · dill", "차가운 전채": "Cold Starter", "대게 · 콜라비 · 캐비아": "Snow crab · kohlrabi · caviar", "따뜻한 전채": "Warm Starter", "아티초크 · 모렐 · 콩테": "Artichoke · morel · Comté", "바다": "Sea", "제주 옥돔 · 홍합 · 샤프란": "Jeju tilefish · mussel · saffron", "불": "Fire", "한우 채끝 · 셀러리악 · 마데이라": "Hanwoo striploin · celeriac · Madeira", "마무리": "Finale", "딸기 · 루바브 · 바질": "Strawberry · rhubarb · basil",
    "오늘의 재료와 취향에 맞춰 고르는 메종 마레의 단품 요리": "Maison Marais plates chosen around today's ingredients and your taste.", "계절 채소의 질감과 향을 살린 가벼운 접시": "Light plates that highlight the texture and aroma of seasonal vegetables.", "화이트 아스파라거스": "White Asparagus", "헤이즐넛 · 레몬 버베나 · 브라운 버터": "Hazelnut · lemon verbena · brown butter", "비트와 염소 치즈": "Beet & Goat Cheese", "라즈베리 · 월넛 · 레드 와인 비네거": "Raspberry · walnut · red wine vinegar",
    "제철 해산물과 섬세한 소스의 조화": "Seasonal seafood paired with delicate sauces.", "제주 옥돔과 뵈르 블랑": "Jeju Tilefish & Beurre Blanc", "홍합 · 펜넬 · 사프란 오일": "Mussel · fennel · saffron oil", "가리비와 샴페인 소스": "Scallop & Champagne Sauce", "콜리플라워 · 캐비아 · 차이브": "Cauliflower · caviar · chive",
    "불의 온도로 풍미를 완성한 메인 요리": "Main dishes finished with the depth of fire.", "오리 가슴살": "Duck Breast", "무화과 · 엔다이브 · 주니퍼 주": "Fig · endive · juniper jus", "한우 채끝": "Hanwoo Striploin", "셀러리악 · 트러플 · 마데이라 소스": "Celeriac · truffle · Madeira sauce",
    "요리의 여운을 이어주는 와인과 논알코올 페어링": "Wine and non-alcoholic pairings that carry the meal's finish.", "섬세한 산도와 향을 중심으로 고른 셀렉션": "A selection centered on fine acidity and aroma.", "우아한 질감과 긴 여운을 지닌 레드 와인": "Red wines with elegant texture and a long finish.", "차와 허브, 제철 과실을 활용한 논알코올 셀렉션": "A non-alcoholic selection of tea, herbs, and seasonal fruit.", "배 · 레몬 버베나 · 토닉": "Pear · lemon verbena · tonic", "우롱차 · 살구 · 자스민": "Oolong tea · apricot · jasmine", "테이스팅 코스를 위한 5잔 구성": "Five glasses selected for the tasting course.", "차와 발효 음료를 중심으로 한 5잔 구성": "Five tea and fermented-drink pairings.",
  },
  zh: {
    "메종 마레": "MAISON MARAIS", "불과 숲, 제철의 풍경을 한 접시마다 현대적인 감각으로 풀어냅니다.": "以现代视角在每一道料理中诠释火、森林与时令风景。", "프렌치 조리의 섬세함에 한국의 계절감을 더한 컨템포러리 다이닝입니다.": "将细腻法式技法与韩国季节感相结合的现代餐饮体验。", "계절의 풍경을 담은 모던 프렌치 다이닝": "承载季节风景的现代法餐", "정교한 소스와 제철 식재료가 만드는 저녁의 흐름을 소개합니다.": "以精致酱汁和时令食材展开一场晚餐。", "서울시 예시구 마레길 12": "首尔市示例区 Marais路 12", "알레르기 및 식이 제한은 예약 시 알려주세요.": "如有过敏或饮食限制，请在预约时告知。",
    "Chef's Tasting": "主厨品鉴套餐", "메종 마레의 계절을 여섯 장면으로 경험하는 디너 코스": "以六道料理体验 MAISON MARAIS 季节风味的晚餐套餐。", "Marais evening": "马雷晚宴", "숲과 바다, 불의 온도를 따라 이어지는 셰프 테이스팅": "循着森林、海洋与火候展开的主厨品鉴套餐。", "1인 기준 · 와인 페어링 + ₩95,000": "每位 · 葡萄酒搭配 + ₩95,000",
    "첫 인사": "迎宾小点", "참돔 · 청사과 · 딜": "真鲷 · 青苹果 · 莳萝", "차가운 전채": "冷前菜", "대게 · 콜라비 · 캐비아": "雪蟹 · 苤蓝 · 鱼子酱", "따뜻한 전채": "温前菜", "아티초크 · 모렐 · 콩테": "洋蓟 · 羊肚菌 · 孔泰奶酪", "바다": "海洋", "제주 옥돔 · 홍합 · 샤프란": "济州玉鲷 · 贻贝 · 藏红花", "불": "火候", "한우 채끝 · 셀러리악 · 마데이라": "韩牛西冷 · 根芹 · 马德拉酒", "마무리": "尾声", "딸기 · 루바브 · 바질": "草莓 · 大黄 · 罗勒",
    "Seasonal Plates": "时令单点", "오늘의 재료와 취향에 맞춰 고르는 메종 마레의 단품 요리": "依据今日食材与个人喜好选择的 MAISON MARAIS 单点料理。", "From the garden": "来自花园", "계절 채소의 질감과 향을 살린 가벼운 접시": "展现时令蔬菜质感与香气的轻盈料理。", "화이트 아스파라거스": "白芦笋", "헤이즐넛 · 레몬 버베나 · 브라운 버터": "榛子 · 柠檬马鞭草 · 焦化黄油", "비트와 염소 치즈": "甜菜与山羊奶酪", "라즈베리 · 월넛 · 레드 와인 비네거": "覆盆子 · 核桃 · 红酒醋",
    "From the sea": "来自海洋", "제철 해산물과 섬세한 소스의 조화": "时令海鲜与细腻酱汁的和谐搭配。", "제주 옥돔과 뵈르 블랑": "济州玉鲷与白黄油酱", "홍합 · 펜넬 · 사프란 오일": "贻贝 · 茴香 · 藏红花油", "가리비와 샴페인 소스": "扇贝与香槟酱", "콜리플라워 · 캐비아 · 차이브": "花椰菜 · 鱼子酱 · 细香葱",
    "From the land": "来自陆地", "불의 온도로 풍미를 완성한 메인 요리": "以火候成就浓郁风味的主菜。", "오리 가슴살": "鸭胸", "무화과 · 엔다이브 · 주니퍼 주": "无花果 · 菊苣 · 杜松子肉汁", "한우 채끝": "韩牛西冷", "셀러리악 · 트러플 · 마데이라 소스": "根芹 · 松露 · 马德拉酒酱",
    "Wine & Pairing": "葡萄酒与搭配", "요리의 여운을 이어주는 와인과 논알코올 페어링": "延续料理余韵的葡萄酒与无酒精搭配。", "Champagne & White": "香槟与白葡萄酒", "섬세한 산도와 향을 중심으로 고른 셀렉션": "以细腻酸度与香气为核心的精选。", "Red Wine": "红葡萄酒", "우아한 질감과 긴 여운을 지닌 레드 와인": "口感优雅、余韵悠长的红葡萄酒。", "Zero Proof": "无酒精", "차와 허브, 제철 과실을 활용한 논알코올 셀렉션": "以茶、香草和时令水果制作的无酒精精选。", "Pear & verbena": "梨与马鞭草", "배 · 레몬 버베나 · 토닉": "梨 · 柠檬马鞭草 · 汤力水", "Fermented tea": "发酵茶", "우롱차 · 살구 · 자스민": "乌龙茶 · 杏 · 茉莉", "Wine pairing": "葡萄酒搭配", "테이스팅 코스를 위한 5잔 구성": "为品鉴套餐搭配的五杯酒款。", "Zero-proof pairing": "无酒精搭配", "차와 발효 음료를 중심으로 한 5잔 구성": "以茶和发酵饮品为主的五杯搭配。",
  },
  ja: {
    "메종 마레": "MAISON MARAIS", "불과 숲, 제철의 풍경을 한 접시마다 현대적인 감각으로 풀어냅니다.": "火と森、旬の風景を一皿ごとにモダンな感性で表現します。", "프렌치 조리의 섬세함에 한국의 계절감을 더한 컨템포러리 다이닝입니다.": "繊細なフレンチの技法に韓国の季節感を重ねたコンテンポラリーダイニングです。", "계절의 풍경을 담은 모던 프렌치 다이닝": "季節の風景を映すモダンフレンチ", "정교한 소스와 제철 식재료가 만드는 저녁의 흐름을 소개합니다.": "精緻なソースと旬の食材が紡ぐディナーをご紹介します。", "서울시 예시구 마레길 12": "ソウル市イェシ区マレ路12", "알레르기 및 식이 제한은 예약 시 알려주세요.": "アレルギーや食事制限はご予約時にお知らせください。",
    "Chef's Tasting": "シェフズテイスティング", "메종 마레의 계절을 여섯 장면으로 경험하는 디너 코스": "MAISON MARAISの季節を六つの皿で体験するディナーコースです。", "Marais evening": "マレ・イブニング", "숲과 바다, 불의 온도를 따라 이어지는 셰프 테이스팅": "森と海、火の温度をたどるシェフテイスティングです。", "1인 기준 · 와인 페어링 + ₩95,000": "お一人様 · ワインペアリング + ₩95,000",
    "첫 인사": "はじまりの一皿", "참돔 · 청사과 · 딜": "真鯛 · 青りんご · ディル", "차가운 전채": "冷前菜", "대게 · 콜라비 · 캐비아": "ズワイガニ · コールラビ · キャビア", "따뜻한 전채": "温前菜", "아티초크 · 모렐 · 콩테": "アーティチョーク · モリーユ · コンテ", "바다": "海", "제주 옥돔 · 홍합 · 샤프란": "済州アマダイ · ムール貝 · サフラン", "불": "火", "한우 채끝 · 셀러리악 · 마데이라": "韓牛サーロイン · セロリアック · マデイラ", "마무리": "余韻", "딸기 · 루바브 · 바질": "苺 · ルバーブ · バジル",
    "Seasonal Plates": "季節のアラカルト", "오늘의 재료와 취향에 맞춰 고르는 메종 마레의 단품 요리": "本日の食材とお好みに合わせて選ぶMAISON MARAISのアラカルトです。", "From the garden": "ガーデンから", "계절 채소의 질감과 향을 살린 가벼운 접시": "旬野菜の食感と香りを生かした軽やかな一皿です。", "화이트 아스파라거스": "ホワイトアスパラガス", "헤이즐넛 · 레몬 버베나 · 브라운 버터": "ヘーゼルナッツ · レモンバーベナ · 焦がしバター", "비트와 염소 치즈": "ビーツと山羊チーズ", "라즈베리 · 월넛 · 레드 와인 비네거": "ラズベリー · くるみ · 赤ワインビネガー",
    "From the sea": "海から", "제철 해산물과 섬세한 소스의 조화": "旬の魚介と繊細なソースの調和。", "제주 옥돔과 뵈르 블랑": "済州アマダイとブールブラン", "홍합 · 펜넬 · 사프란 오일": "ムール貝 · フェンネル · サフランオイル", "가리비와 샴페인 소스": "帆立とシャンパンソース", "콜리플라워 · 캐비아 · 차이브": "カリフラワー · キャビア · チャイブ",
    "From the land": "大地から", "불의 온도로 풍미를 완성한 메인 요리": "火の温度で味わいを仕上げたメインです。", "오리 가슴살": "鴨胸肉", "무화과 · 엔다이브 · 주니퍼 주": "いちじく · アンディーブ · ジュニパーのジュ", "한우 채끝": "韓牛サーロイン", "셀러리악 · 트러플 · 마데이라 소스": "セロリアック · トリュフ · マデイラソース",
    "Wine & Pairing": "ワイン＆ペアリング", "요리의 여운을 이어주는 와인과 논알코올 페어링": "料理の余韻をつなぐワインとノンアルコールのペアリングです。", "Champagne & White": "シャンパーニュ＆白", "섬세한 산도와 향을 중심으로 고른 셀렉션": "繊細な酸と香りを中心に選んだセレクションです。", "Red Wine": "赤ワイン", "우아한 질감과 긴 여운을 지닌 레드 와인": "優雅な質感と長い余韻を持つ赤ワインです。", "Zero Proof": "ノンアルコール", "차와 허브, 제철 과실을 활용한 논알코올 셀렉션": "お茶、ハーブ、旬の果実を使ったノンアルコールセレクションです。", "Pear & verbena": "洋梨とバーベナ", "배 · 레몬 버베나 · 토닉": "洋梨 · レモンバーベナ · トニック", "Fermented tea": "発酵茶", "우롱차 · 살구 · 자스민": "烏龍茶 · 杏 · ジャスミン", "Wine pairing": "ワインペアリング", "테이스팅 코스를 위한 5잔 구성": "テイスティングコースに合わせた5杯構成です。", "Zero-proof pairing": "ノンアルコールペアリング", "차와 발효 음료를 중심으로 한 5잔 구성": "お茶と発酵ドリンクを中心にした5杯構成です。",
  },
};

const DISPLAY_ITEM_NAMES: Record<PreviewTextLocale, Record<string, string>> = {
  en: {},
  zh: {
    "바질 크림 라떼": "罗勒奶油拿铁", "오트 너티 라떼": "燕麦坚果拿铁", "바닐라빈 슈페너": "香草阿芙佳朵咖啡", "솔티드 카라멜 라떼": "海盐焦糖拿铁", "흑임자 아인슈페너": "黑芝麻奶油咖啡", "아메리카노": "美式咖啡", "카페 라떼": "咖啡拿铁", "바닐라 빈 라떼": "香草荚拿铁", "카푸치노": "卡布奇诺", "콜드브루": "冷萃咖啡", "제주 말차 라떼": "济州抹茶拿铁", "말차 에스프레소": "抹茶浓缩咖啡", "발로나 초코 라떼": "法芙娜巧克力拿铁", "딸기 라떼": "草莓拿铁", "흑임자 크림 라떼": "黑芝麻奶油拿铁", "로얄 밀크티": "皇家奶茶", "클래식 버터 스콘": "经典黄油司康", "무화과 휘낭시에": "无花果费南雪", "솔티 초코 휘낭시에": "海盐巧克力费南雪", "바스크 치즈케이크": "巴斯克芝士蛋糕", "자몽 허니 에이드": "葡萄柚蜂蜜气泡饮", "청포도 라임 에이드": "青葡萄青柠气泡饮", "레몬 바질 에이드": "柠檬罗勒气泡饮", "제주 한라봉 주스": "济州汉拿峰果汁", "수박 민트 주스": "西瓜薄荷果汁", "복숭아 아이스티": "蜜桃冰茶", "애플 히비스커스 티": "苹果洛神花茶", "유자 캐모마일 티": "柚子洋甘菊茶", "패션후르츠 블랙티": "百香果红茶",
  },
  ja: {
    "바질 크림 라떼": "バジルクリームラテ", "오트 너티 라떼": "オーツナッツラテ", "바닐라빈 슈페너": "バニラビーンズ・アインシュペナー", "솔티드 카라멜 라떼": "ソルティキャラメルラテ", "흑임자 아인슈페너": "黒ごまアインシュペナー", "아메리카노": "アメリカーノ", "카페 라떼": "カフェラテ", "바닐라 빈 라떼": "バニラビーンズラテ", "카푸치노": "カプチーノ", "콜드브루": "コールドブリュー", "제주 말차 라떼": "済州抹茶ラテ", "말차 에스프레소": "抹茶エスプレッソ", "발로나 초코 라떼": "ヴァローナチョコラテ", "딸기 라떼": "ストロベリーラテ", "흑임자 크림 라떼": "黒ごまクリームラテ", "로얄 밀크티": "ロイヤルミルクティー", "클래식 버터 스콘": "クラシックバタースコーン", "무화과 휘낭시에": "いちじくフィナンシェ", "솔티 초코 휘낭시에": "ソルティチョコフィナンシェ", "바스크 치즈케이크": "バスクチーズケーキ", "자몽 허니 에이드": "グレープフルーツハニーエイド", "청포도 라임 에이드": "青ぶどうライムエイド", "레몬 바질 에이드": "レモンバジルエイド", "제주 한라봉 주스": "済州ハルラボンジュース", "수박 민트 주스": "スイカミントジュース", "복숭아 아이스티": "ピーチアイスティー", "애플 히비스커스 티": "アップルハイビスカスティー", "유자 캐모마일 티": "柚子カモミールティー", "패션후르츠 블랙티": "パッションフルーツブラックティー",
  },
};

const DISPLAY_COPY: Record<PreviewTextLocale, Record<string, string>> = {
  en: {
    "썸머 블루": "Summer Blue", "디스플레이 메뉴보드 미리보기": "Digital menu board preview", "좋은 원두와 정성스러운 디저트로 일상에 작은 여유를 더하는 카페입니다.": "A cafe bringing a little pause to every day with quality coffee and carefully made desserts.", "서울시 예시구 오브로 12": "12 Aube-ro, Yesi-gu, Seoul", "매일 10:00 - 21:00": "Daily 10:00 - 21:00", "시즌 프로모션": "Seasonal Promotion", "시그니처 추천": "Signature Picks", "전체 메뉴": "Full Menu", "디저트 프로모션": "Dessert Promotion", "썸머 시그니처 출시 기념": "Summer Signature Launch", "클래식 커피 할인": "Classic Coffee Deal",
  },
  zh: {
    "썸머 블루": "夏日蓝", "디스플레이 메뉴보드 미리보기": "电子菜单屏预览", "좋은 원두와 정성스러운 디저트로 일상에 작은 여유를 더하는 카페입니다.": "以优质咖啡豆和精心制作的甜点，为日常增添片刻悠闲。", "서울시 예시구 오브로 12": "首尔市示例区 Aube路 12", "매일 10:00 - 21:00": "每日 10:00 - 21:00", "시즌 프로모션": "季节推广", "시그니처 추천": "招牌推荐", "전체 메뉴": "全部菜单", "디저트 프로모션": "甜点推广", "SIGNATURE COFFEE": "招牌咖啡", "CLASSIC COFFEE": "经典咖啡", "NON-COFFEE": "非咖啡饮品", "BAKERY": "烘焙甜点", "FRESH ADE & JUICE": "鲜果气泡饮与果汁", "SUMMER TEA": "夏日茶饮", "썸머 시그니처 출시 기념": "夏日招牌新品纪念", "클래식 커피 할인": "经典咖啡优惠",
  },
  ja: {
    "썸머 블루": "サマーブルー", "디스플레이 메뉴보드 미리보기": "デジタルメニューボードプレビュー", "좋은 원두와 정성스러운 디저트로 일상에 작은 여유를 더하는 카페입니다.": "上質なコーヒー豆と丁寧に作ったデザートで、日常に小さな余白を届けるカフェです。", "서울시 예시구 오브로 12": "ソウル市イェシ区オーブ路12", "매일 10:00 - 21:00": "毎日 10:00 - 21:00", "시즌 프로모션": "季節のプロモーション", "시그니처 추천": "シグネチャーおすすめ", "전체 메뉴": "全メニュー", "디저트 프로모션": "デザートプロモーション", "SIGNATURE COFFEE": "シグネチャーコーヒー", "CLASSIC COFFEE": "クラシックコーヒー", "NON-COFFEE": "ノンコーヒー", "BAKERY": "ベーカリー", "FRESH ADE & JUICE": "フレッシュエイド＆ジュース", "SUMMER TEA": "サマーティー", "썸머 시그니처 출시 기념": "サマーシグネチャー発売記念", "클래식 커피 할인": "クラシックコーヒー割引",
  },
};

function translateText<T extends string | null | undefined>(value: T, copy: Record<string, string>): T extends string ? string : T {
  if (value == null) return value as T extends string ? string : T;
  return (copy[value] ?? value) as T extends string ? string : T;
}

function titleCaseEnglishLabel(value: string) {
  return value.toLowerCase().replace(/(^|[\s&/-])([a-z])/g, (_match, prefix: string, letter: string) => `${prefix}${letter.toUpperCase()}`);
}

function applyTextMap(data: MenuPageData, locale: PreviewTextLocale, copy: Record<string, string>): MenuPageData {
  const mergedCopy = { ...COMMON_LABELS[locale], ...copy };
  const settings = data.menuSite.settings && typeof data.menuSite.settings === "object" && !Array.isArray(data.menuSite.settings)
    ? Object.fromEntries(Object.entries(data.menuSite.settings).map(([key, value]) => [key, typeof value === "string" ? translateText(value, mergedCopy) : value]))
    : data.menuSite.settings;

  return {
    ...data,
    menuSite: {
      ...data.menuSite,
      name: translateText(data.menuSite.name, mergedCopy) ?? data.menuSite.name,
      description: translateText(data.menuSite.description, mergedCopy),
      business_name: translateText(data.menuSite.business_name, mergedCopy),
      business_address: translateText(data.menuSite.business_address, mergedCopy),
      restaurant_name: translateText(data.menuSite.restaurant_name, mergedCopy),
      restaurant_category: translateText(data.menuSite.restaurant_category, mergedCopy),
      restaurant_address: translateText(data.menuSite.restaurant_address, mergedCopy),
      intro_title: translateText(data.menuSite.intro_title, mergedCopy),
      intro_description: translateText(data.menuSite.intro_description, mergedCopy),
      brand_description: translateText(data.menuSite.brand_description, mergedCopy),
      menu_cover_title: translateText(data.menuSite.menu_cover_title, mergedCopy),
      menu_cover_description: translateText(data.menuSite.menu_cover_description, mergedCopy),
      about_description: translateText(data.menuSite.about_description, mergedCopy),
      opening_hours: translateText(data.menuSite.opening_hours, mergedCopy),
      settings,
    },
    pages: data.pages.map((page) => ({ ...page, title: translateText(page.title, mergedCopy) ?? page.title, description: translateText(page.description, mergedCopy) })),
    categories: data.categories.map((category) => ({
      ...category,
      name: translateText(category.name, mergedCopy) ?? category.name,
      description: translateText(category.description, mergedCopy),
      course_price_label: translateText(category.course_price_label, mergedCopy),
      course_price_description: translateText(category.course_price_description, mergedCopy),
      priceColumns: category.priceColumns.map((column) => ({ ...column, label: translateText(column.label, mergedCopy) ?? column.label })),
    })),
    items: data.items.map((item) => ({
      ...item,
      name: translateText(item.name, mergedCopy) ?? item.name,
      set_name: translateText(item.set_name, mergedCopy),
      description: translateText(item.description, mergedCopy),
      price_label: translateText(item.price_label, mergedCopy),
      priceNote: translateText(item.priceNote, mergedCopy),
      portion_label: translateText(item.portion_label, mergedCopy),
      badge: translateText(item.badge, mergedCopy),
      badge_label: translateText(item.badge_label, mergedCopy),
    })),
    priceOptions: data.priceOptions.map((option) => ({ ...option, label: translateText(option.label, mergedCopy) ?? option.label })),
    timeSales: data.timeSales.map((sale) => ({ ...sale, name: translateText(sale.name, mergedCopy) ?? sale.name, displayText: translateText(sale.displayText, mergedCopy), badgeText: translateText(sale.badgeText, mergedCopy) ?? sale.badgeText })),
  };
}

function applySinglePageCopy(data: MenuPageData, locale: SinglePageStarterTranslationLocale): MenuPageData {
  const translations = getSinglePageStarterTranslations(data.menuSite.template_key);
  if (!translations) return data;
  const copy = translations[locale];
  const preset = getStarterPreset(data.menuSite.template_key, data.menuSite.restaurant_category, data.menuSite.template_category);
  const categoryCopyById = new Map<string, { name: string; description?: string }>();
  const itemCopyById = new Map<string, { name: string; description: string }>();
  const promotionCopyById = new Map<string, { badgeText: string; timeDisplayText?: string }>();

  preset.pages.forEach((page, pageIndex) => {
    page.categories.forEach((category, categoryIndex) => {
      if (!category.key) return;
      categoryCopyById.set(`${data.menuSite.id}-category-${pageIndex}-${categoryIndex}`, {
        name: copy.categoryNames[category.key] ?? category.name,
        description: copy.categoryDescriptions?.[category.key],
      });
      category.items.forEach((item, itemIndex) => {
        if (!item.key) return;
        const itemCopy = copy.items[item.key];
        if (itemCopy) itemCopyById.set(`${data.menuSite.id}-item-${pageIndex}-${categoryIndex}-${itemIndex}`, itemCopy);
      });
    });
  });
  (preset.time_sales ?? []).forEach((sale, saleIndex) => {
    if (!sale.key) return;
    const saleCopy = copy.promotions[sale.key];
    if (saleCopy) promotionCopyById.set(`${data.menuSite.id}-time-sale-${saleIndex}`, saleCopy);
  });

  const settings = data.menuSite.settings && typeof data.menuSite.settings === "object" && !Array.isArray(data.menuSite.settings)
    ? { ...data.menuSite.settings }
    : {};
  settings.footer_notice_1 = copy.site.footerNotices[0];
  settings.footer_notice_2 = copy.site.footerNotices[1];
  settings.footer_notice_3 = copy.site.footerNotices[2];

  return {
    ...data,
    menuSite: {
      ...data.menuSite,
      name: copy.site.restaurantName,
      business_name: copy.site.restaurantName,
      restaurant_name: copy.site.restaurantName,
      restaurant_category: copy.site.restaurantCategory,
      intro_title: copy.site.restaurantName,
      intro_description: copy.site.introDescription,
      brand_description: copy.site.brandDescription,
      menu_cover_title: copy.site.restaurantName,
      menu_cover_description: copy.site.menuCoverDescription,
      about_description: copy.site.aboutDescription,
      opening_hours: copy.site.footerNotices[0],
      restaurant_address: copy.site.footerNotices[1],
      restaurant_phone: copy.site.footerNotices[2],
      settings,
    },
    pages: data.pages.map((page) => ({ ...page, title: copy.pageTitle })),
    categories: data.categories.map((category) => {
      const localized = categoryCopyById.get(category.id);
      return localized ? { ...category, name: localized.name, description: localized.description ?? category.description } : category;
    }),
    items: data.items.map((item) => {
      const localized = itemCopyById.get(item.id);
      return localized ? { ...item, name: localized.name, description: localized.description } : item;
    }),
    timeSales: data.timeSales.map((sale) => {
      const localized = promotionCopyById.get(sale.id);
      return localized ? { ...sale, badgeText: localized.badgeText, displayText: localized.timeDisplayText ?? sale.displayText } : sale;
    }),
  };
}

function applyDisplayCopy(data: MenuPageData, locale: PreviewTextLocale): MenuPageData {
  const itemNames = DISPLAY_ITEM_NAMES[locale];
  const copy = { ...DISPLAY_COPY[locale], ...itemNames };
  const withEnglishNames = locale === "en"
    ? {
        ...data,
        items: data.items.map((item) => ({
          ...item,
          name: item.set_name ? titleCaseEnglishLabel(item.set_name) : item.name,
        })),
      }
    : data;
  return applyTextMap(withEnglishNames, locale, copy);
}

export function applyStarterPreviewLocalization(data: MenuPageData, locale: SupportedLocale): MenuPageData {
  const localizedBase = { ...data, locale, enabledLocales: ["ko", "en", "zh", "ja"] as SupportedLocale[] };
  if (locale === "ko") return localizedBase;

  if (getSinglePageStarterTranslations(data.menuSite.template_key)) {
    return applySinglePageCopy(localizedBase, locale);
  }
  if (data.menuSite.template_key === "dining_aube_table_a") {
    return applyTextMap(localizedBase, locale, AUBE_TABLE_COPY[locale]);
  }
  if (data.menuSite.template_key === "dining_aube_table_b") {
    return applyTextMap(localizedBase, locale, MARAIS_COPY[locale]);
  }
  if (data.menuSite.template_key === "display_menu_a") {
    return applyDisplayCopy(localizedBase, locale);
  }

  return localizedBase;
}
