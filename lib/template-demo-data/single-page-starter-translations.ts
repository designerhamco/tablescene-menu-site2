export const SINGLE_PAGE_STARTER_TRANSLATION_LOCALES = ["en", "zh", "ja"] as const;

export type SinglePageStarterTranslationLocale = (typeof SINGLE_PAGE_STARTER_TRANSLATION_LOCALES)[number];

type StarterSiteTranslationCopy = {
  restaurantName: string;
  restaurantCategory: string;
  brandDescription: string;
  introDescription: string;
  menuCoverDescription: string;
  aboutDescription: string;
  footerNotices: [string, string, string];
};

type StarterItemTranslationCopy = {
  name: string;
  description: string;
};

type StarterPromotionTranslationCopy = {
  badgeText: string;
  timeDisplayText?: string;
};

export type SinglePageStarterLocaleCopy = {
  site: StarterSiteTranslationCopy;
  pageTitle: string;
  categoryNames: Record<string, string>;
  categoryDescriptions?: Record<string, string>;
  items: Record<string, StarterItemTranslationCopy>;
  promotions: Record<string, StarterPromotionTranslationCopy>;
};

export type SinglePageStarterTranslationBundle = Record<SinglePageStarterTranslationLocale, SinglePageStarterLocaleCopy>;

const COMMON_PROMOTIONS = {
  en: {
    "americano-morning-deal": { badgeText: "MORNING DEAL", timeDisplayText: "Daily from 8 AM to 10 AM" },
  },
  zh: {
    "americano-morning-deal": { badgeText: "早晨优惠", timeDisplayText: "每天上午8点至10点" },
  },
  ja: {
    "americano-morning-deal": { badgeText: "モーニング", timeDisplayText: "毎日午前8時から10時まで" },
  },
} satisfies Record<SinglePageStarterTranslationLocale, Record<string, StarterPromotionTranslationCopy>>;

const AUBE_TRANSLATIONS: SinglePageStarterTranslationBundle = {
  en: {
    site: {
      restaurantName: "AUBE COFFEE",
      restaurantCategory: "Cafe",
      brandDescription: "A modern cafe offering colorful, wholesome flavors with fresh specialty coffee and organic ingredients.",
      introDescription: "Fresh specialty coffee and organic ingredients in a colorful, wholesome menu.",
      menuCoverDescription: "A modern cafe offering colorful, wholesome flavors with fresh specialty coffee and organic ingredients.",
      aboutDescription: "A crisp cafe experience centered on a curated menu and signature drinks.",
      footerNotices: ["Wi-Fi AUBE_GUEST · PW 1234-5678", "Instagram @aube_coffee", ""],
    },
    pageTitle: "Menu",
    categoryNames: {
      "signature-coffee": "SIGNATURE COFFEE",
      "classic-coffee": "CLASSIC COFFEE",
      "non-coffee": "NON-COFFEE",
      ade: "ADE",
      bakery: "BAKERY",
    },
    categoryDescriptions: {
      "classic-coffee": "Choose your beans: nutty blend / bright single origin / decaf +500 KRW",
    },
    items: {
      "jeju-matcha-cream-latte": { name: "Jeju Matcha Cream Latte", description: "A signature latte topped with rich Jeju matcha and smooth cream" },
      "nutty-cream-latte": { name: "Nutty Cream Latte", description: "A creamy latte with a rich roasted nut finish" },
      "black-sesame-cream-latte": { name: "Black Sesame Cream Latte", description: "A smooth latte finished with deep, nutty black sesame cream" },
      americano: { name: "Americano", description: "Clean acidity with a balanced, nutty finish" },
      "cafe-latte": { name: "Cafe Latte", description: "Smooth milk and espresso" },
      "flat-white": { name: "Flat White", description: "Bold espresso with finely textured milk foam" },
      "vanilla-bean-latte": { name: "Vanilla Bean Latte", description: "A latte with the gentle sweetness of vanilla bean" },
      "valrhona-choco-latte": { name: "Valrhona Chocolate Latte", description: "Deep, rich Valrhona chocolate" },
      "jeju-matcha-latte": { name: "Jeju Matcha Latte", description: "Bittersweet Jeju matcha with smooth milk" },
      "earl-grey-milk-tea": { name: "Earl Grey Milk Tea", description: "Bergamot-scented tea blended with milk" },
      "lemon-basil-ade": { name: "Lemon Basil Ade", description: "Fresh lemon juice with refreshing basil" },
      "grapefruit-rosemary-ade": { name: "Grapefruit Rosemary Ade", description: "Fresh grapefruit brightened with rosemary" },
      "green-grape-mint-ade": { name: "Green Grape Mint Ade", description: "Sweet green grape with cooling mint" },
      "classic-butter-scone": { name: "Classic Butter Scone", description: "Rich French cultured butter flavor" },
      "lemon-madeleine": { name: "Lemon Madeleine", description: "A moist madeleine scented with lemon" },
      "chocolate-financier": { name: "Chocolate Financier", description: "Deep dark chocolate and hazelnut flavor" },
      "butter-croissant": { name: "Butter Croissant", description: "A flaky croissant layered with French butter" },
      "blueberry-cheese-danish": { name: "Blueberry Cheese Danish", description: "A crisp Danish topped with blueberry and cream cheese" },
      "classic-tiramisu": { name: "Classic Tiramisu", description: "A smooth pairing of espresso and mascarpone" },
    },
    promotions: {
      ...COMMON_PROMOTIONS.en,
      "classic-butter-scone-closeout": { badgeText: "LAST BATCH" },
    },
  },
  zh: {
    site: {
      restaurantName: "AUBE COFFEE",
      restaurantCategory: "咖啡馆",
      brandDescription: "使用新鲜精品咖啡豆和有机食材，呈现健康而多彩风味的现代咖啡品牌。",
      introDescription: "以新鲜精品咖啡豆和有机食材呈现健康多彩的风味。",
      menuCoverDescription: "使用新鲜精品咖啡豆和有机食材，呈现健康而多彩风味的现代咖啡品牌。",
      aboutDescription: "以精选菜单和招牌饮品打造清晰舒适的咖啡体验。",
      footerNotices: ["Wi-Fi AUBE_GUEST · 密码 1234-5678", "Instagram @aube_coffee", ""],
    },
    pageTitle: "菜单",
    categoryNames: {
      "signature-coffee": "招牌咖啡",
      "classic-coffee": "经典咖啡",
      "non-coffee": "非咖啡饮品",
      ade: "气泡饮",
      bakery: "烘焙甜点",
    },
    categoryDescriptions: {
      "classic-coffee": "咖啡豆选择：坚果风味拼配 / 明亮单一产地 / 低咖啡因 +500韩元",
    },
    items: {
      "jeju-matcha-cream-latte": { name: "济州抹茶奶油拿铁", description: "浓郁济州抹茶搭配柔滑奶油的招牌拿铁" },
      "nutty-cream-latte": { name: "坚果奶油拿铁", description: "带有浓郁坚果香的奶油拿铁" },
      "black-sesame-cream-latte": { name: "黑芝麻奶油拿铁", description: "柔滑拿铁搭配浓香黑芝麻奶油" },
      americano: { name: "美式咖啡", description: "清爽酸度与坚果香的平衡" },
      "cafe-latte": { name: "咖啡拿铁", description: "柔滑牛奶与浓缩咖啡" },
      "flat-white": { name: "馥芮白", description: "浓郁浓缩咖啡搭配细腻奶泡" },
      "vanilla-bean-latte": { name: "香草荚拿铁", description: "带有香草荚淡雅甜味的拿铁" },
      "valrhona-choco-latte": { name: "法芙娜巧克力拿铁", description: "法芙娜巧克力的浓郁风味" },
      "jeju-matcha-latte": { name: "济州抹茶拿铁", description: "微苦济州抹茶与柔滑牛奶" },
      "earl-grey-milk-tea": { name: "伯爵奶茶", description: "佛手柑香气与牛奶交融的奶茶" },
      "lemon-basil-ade": { name: "柠檬罗勒气泡饮", description: "鲜榨柠檬与罗勒的清爽口感" },
      "grapefruit-rosemary-ade": { name: "西柚迷迭香气泡饮", description: "新鲜西柚与迷迭香的明亮组合" },
      "green-grape-mint-ade": { name: "青葡萄薄荷气泡饮", description: "青葡萄的甜味与薄荷的清凉" },
      "classic-butter-scone": { name: "经典黄油司康", description: "法国发酵黄油的浓郁香气" },
      "lemon-madeleine": { name: "柠檬玛德琳", description: "带有柠檬香气的湿润玛德琳" },
      "chocolate-financier": { name: "巧克力费南雪", description: "黑巧克力与榛果的深邃风味" },
      "butter-croissant": { name: "黄油可颂", description: "以法国黄油层层烘烤的酥脆可颂" },
      "blueberry-cheese-danish": { name: "蓝莓芝士丹麦酥", description: "酥脆丹麦酥配蓝莓与奶油芝士" },
      "classic-tiramisu": { name: "经典提拉米苏", description: "浓缩咖啡与马斯卡彭的柔滑组合" },
    },
    promotions: {
      ...COMMON_PROMOTIONS.zh,
      "classic-butter-scone-closeout": { badgeText: "即将售罄" },
    },
  },
  ja: {
    site: {
      restaurantName: "AUBE COFFEE",
      restaurantCategory: "カフェ",
      brandDescription: "新鮮なスペシャルティコーヒーとオーガニック食材で、健やかで彩り豊かな味を提案するモダンカフェです。",
      introDescription: "新鮮なスペシャルティコーヒーとオーガニック食材で彩り豊かな味を届けます。",
      menuCoverDescription: "新鮮なスペシャルティコーヒーとオーガニック食材で、健やかで彩り豊かな味を提案するモダンカフェです。",
      aboutDescription: "厳選したメニューとシグネチャードリンクを中心に、心地よいカフェ体験を提案します。",
      footerNotices: ["Wi-Fi AUBE_GUEST · PW 1234-5678", "Instagram @aube_coffee", ""],
    },
    pageTitle: "メニュー",
    categoryNames: {
      "signature-coffee": "シグネチャーコーヒー",
      "classic-coffee": "クラシックコーヒー",
      "non-coffee": "ノンコーヒー",
      ade: "エイド",
      bakery: "ベーカリー",
    },
    categoryDescriptions: {
      "classic-coffee": "豆の選択：香ばしいブレンド / 爽やかなシングルオリジン / デカフェ +500ウォン",
    },
    items: {
      "jeju-matcha-cream-latte": { name: "済州抹茶クリームラテ", description: "濃厚な済州抹茶になめらかなクリームをのせたシグネチャーラテ" },
      "nutty-cream-latte": { name: "ナッティクリームラテ", description: "香ばしいナッツクリームのラテ" },
      "black-sesame-cream-latte": { name: "黒ごまクリームラテ", description: "深く香ばしい黒ごまクリームを合わせたなめらかなラテ" },
      americano: { name: "アメリカーノ", description: "すっきりした酸味と香ばしさのバランス" },
      "cafe-latte": { name: "カフェラテ", description: "なめらかなミルクとエスプレッソ" },
      "flat-white": { name: "フラットホワイト", description: "濃厚なエスプレッソときめ細かなミルクフォーム" },
      "vanilla-bean-latte": { name: "バニラビーンズラテ", description: "バニラビーンズのやさしい甘さを加えたラテ" },
      "valrhona-choco-latte": { name: "ヴァローナショコララテ", description: "濃厚なヴァローナチョコレートの深い味わい" },
      "jeju-matcha-latte": { name: "済州抹茶ラテ", description: "ほろ苦い済州抹茶となめらかなミルク" },
      "earl-grey-milk-tea": { name: "アールグレイミルクティー", description: "ベルガモットの香りとミルクが調和したミルクティー" },
      "lemon-basil-ade": { name: "レモンバジルエイド", description: "生レモン果汁とバジルの爽やかさ" },
      "grapefruit-rosemary-ade": { name: "グレープフルーツローズマリーエイド", description: "生グレープフルーツとローズマリーの爽やかな組み合わせ" },
      "green-grape-mint-ade": { name: "青ぶどうミントエイド", description: "青ぶどうの甘さとミントの清涼感" },
      "classic-butter-scone": { name: "クラシックバタースコーン", description: "フランス産発酵バターの豊かな風味" },
      "lemon-madeleine": { name: "レモンマドレーヌ", description: "レモンが香るしっとりしたマドレーヌ" },
      "chocolate-financier": { name: "ショコラフィナンシェ", description: "ダークチョコレートとヘーゼルナッツの深い風味" },
      "butter-croissant": { name: "バタークロワッサン", description: "フランス産バターを幾層にも折り込んだクロワッサン" },
      "blueberry-cheese-danish": { name: "ブルーベリーチーズデニッシュ", description: "ブルーベリーとクリームチーズをのせた香ばしいデニッシュ" },
      "classic-tiramisu": { name: "クラシックティラミス", description: "エスプレッソとマスカルポーネのなめらかな調和" },
    },
    promotions: {
      ...COMMON_PROMOTIONS.ja,
      "classic-butter-scone-closeout": { badgeText: "まもなく完売" },
    },
  },
};

const MOCHA_FOREST_TRANSLATIONS: SinglePageStarterTranslationBundle = {
  en: {
    site: {
      restaurantName: "MOCHA FOREST",
      restaurantCategory: "Cafe",
      brandDescription: "Dark roasts and chocolate flavors in a forest-inspired coffee bar.",
      introDescription: "A coffee bar for deep roasts and rich chocolate flavors.",
      menuCoverDescription: "A coffee bar for deep roasts and rich chocolate flavors.",
      aboutDescription: "Dark-roasted coffee, chocolate drinks, and comforting desserts.",
      footerNotices: ["Wi-Fi · MOCHA_GUEST", "Instagram · @mocha.forest", "Decaf beans are available."],
    },
    pageTitle: "Menu",
    categoryNames: {
      "signature-coffee": "FOREST SIGNATURE",
      "classic-coffee": "ESPRESSO",
      "non-coffee": "CHOCOLATE",
      ade: "TEA & ADE",
      bakery: "DESSERT",
    },
    items: {
      "forest-mocha": { name: "Forest Mocha", description: "Dark chocolate mocha with espresso and cream" },
      "hazelnut-cream-latte": { name: "Hazelnut Cream Latte", description: "Hazelnut cream with bold espresso" },
      "matcha-cloud": { name: "Matcha Cloud", description: "Jeju matcha with light cream" },
      americano: { name: "Americano", description: "Full-bodied with dark chocolate notes" },
      "cafe-latte": { name: "Cafe Latte", description: "Balanced espresso and nutty milk" },
      "flat-white": { name: "Flat White", description: "Double espresso with silky milk foam" },
      "maple-oat-latte": { name: "Maple Oat Latte", description: "Gentle maple sweetness with oat milk" },
      "dark-chocolate-latte": { name: "Dark Chocolate Latte", description: "Deep and intense cacao flavor" },
      "salted-caramel-chocolate": { name: "Salted Caramel Chocolate", description: "Chocolate balanced by salted caramel" },
      "cacao-oat-milk": { name: "Cacao Oat Milk", description: "Cacao blended with nutty oat milk" },
      "black-tea-plum-ade": { name: "Black Tea Plum Ade", description: "Sparkling black tea with bright plum" },
      "lemon-ginger-tea": { name: "Lemon Ginger Tea", description: "Warm-brewed lemon and ginger tea" },
      "chamomile-apple-tea": { name: "Chamomile Apple Tea", description: "A calming blend of chamomile and apple" },
      "dark-chocolate-brownie": { name: "Dark Chocolate Brownie", description: "Moist brownie with rich dark chocolate" },
      "hazelnut-financier": { name: "Hazelnut Financier", description: "Roasted hazelnut and buttery richness" },
      "earl-grey-pound-cake": { name: "Earl Grey Pound Cake", description: "Tender pound cake with Earl Grey" },
      "cacao-canele": { name: "Cacao Canele", description: "Cacao aroma with a caramelized crust" },
      "forest-tiramisu": { name: "Forest Tiramisu", description: "Layers of espresso and dark cacao" },
      "mocha-walnut-cookie": { name: "Mocha Walnut Cookie", description: "Soft mocha cookie with walnuts" },
    },
    promotions: {
      ...COMMON_PROMOTIONS.en,
      "dark-chocolate-brownie-closeout": { badgeText: "LAST BATCH" },
    },
  },
  zh: {
    site: {
      restaurantName: "MOCHA FOREST",
      restaurantCategory: "咖啡馆",
      brandDescription: "以深度烘焙和巧克力风味为核心，呈现幽暗森林氛围的咖啡吧。",
      introDescription: "专注深度烘焙与浓郁巧克力风味的咖啡吧。",
      menuCoverDescription: "专注深度烘焙与浓郁巧克力风味的咖啡吧。",
      aboutDescription: "深烘咖啡、巧克力饮品与温暖甜点。",
      footerNotices: ["Wi-Fi · MOCHA_GUEST", "Instagram · @mocha.forest", "可更换为低咖啡因咖啡豆。"],
    },
    pageTitle: "菜单",
    categoryNames: {
      "signature-coffee": "森林招牌",
      "classic-coffee": "浓缩咖啡",
      "non-coffee": "巧克力",
      ade: "茶与气泡饮",
      bakery: "甜点",
    },
    items: {
      "forest-mocha": { name: "森林摩卡", description: "黑巧克力、浓缩咖啡与柔滑奶油调制的招牌摩卡" },
      "hazelnut-cream-latte": { name: "榛果奶油拿铁", description: "烘烤榛果奶油与浓郁浓缩咖啡的组合" },
      "matcha-cloud": { name: "抹茶云朵", description: "济州抹茶拿铁覆上轻盈奶油" },
      americano: { name: "美式咖啡", description: "黑巧克力般的甜感与饱满口感" },
      "cafe-latte": { name: "咖啡拿铁", description: "浓缩咖啡与香醇牛奶的平衡" },
      "flat-white": { name: "馥芮白", description: "双份浓缩咖啡与细腻奶泡的浓郁风味" },
      "maple-oat-latte": { name: "枫糖燕麦拿铁", description: "枫糖的淡雅甜味与燕麦奶" },
      "dark-chocolate-latte": { name: "黑巧克力拿铁", description: "深厚浓郁的可可风味" },
      "salted-caramel-chocolate": { name: "海盐焦糖巧克力", description: "浓郁巧克力与海盐焦糖的平衡" },
      "cacao-oat-milk": { name: "可可燕麦奶", description: "可可与香醇燕麦奶调制的饮品" },
      "black-tea-plum-ade": { name: "红茶李子气泡饮", description: "红茶与李子调制的清爽气泡饮" },
      "lemon-ginger-tea": { name: "柠檬姜茶", description: "温暖冲泡的柠檬与生姜茶" },
      "chamomile-apple-tea": { name: "洋甘菊苹果茶", description: "洋甘菊与苹果香气的舒缓拼配" },
      "dark-chocolate-brownie": { name: "黑巧克力布朗尼", description: "加入浓郁黑巧克力烘烤的湿润布朗尼" },
      "hazelnut-financier": { name: "榛果费南雪", description: "烘烤榛果与黄油的醇香" },
      "earl-grey-pound-cake": { name: "伯爵磅蛋糕", description: "带有伯爵茶香的柔软磅蛋糕" },
      "cacao-canele": { name: "可可可露丽", description: "可可香气与焦糖化外壳" },
      "forest-tiramisu": { name: "森林提拉米苏", description: "层层叠加的浓缩咖啡与黑可可" },
      "mocha-walnut-cookie": { name: "摩卡核桃曲奇", description: "加入摩卡与核桃烘烤的柔软曲奇" },
    },
    promotions: {
      ...COMMON_PROMOTIONS.zh,
      "dark-chocolate-brownie-closeout": { badgeText: "即将售罄" },
    },
  },
  ja: {
    site: {
      restaurantName: "MOCHA FOREST",
      restaurantCategory: "カフェ",
      brandDescription: "深煎りの香りとチョコレートの風味を、静かな森のムードで楽しむコーヒーバーです。",
      introDescription: "深煎りの香りと濃厚なチョコレートを楽しむコーヒーバーです。",
      menuCoverDescription: "深煎りの香りと濃厚なチョコレートを楽しむコーヒーバーです。",
      aboutDescription: "深煎りコーヒーとチョコレートドリンク、心ほどけるデザート。",
      footerNotices: ["Wi-Fi · MOCHA_GUEST", "Instagram · @mocha.forest", "デカフェ豆に変更できます。"],
    },
    pageTitle: "メニュー",
    categoryNames: {
      "signature-coffee": "フォレストシグネチャー",
      "classic-coffee": "エスプレッソ",
      "non-coffee": "チョコレート",
      ade: "ティー＆エイド",
      bakery: "デザート",
    },
    items: {
      "forest-mocha": { name: "フォレストモカ", description: "ダークチョコレートとエスプレッソ、なめらかなクリームのシグネチャーモカ" },
      "hazelnut-cream-latte": { name: "ヘーゼルナッツクリームラテ", description: "ローストヘーゼルナッツクリームと濃厚なエスプレッソ" },
      "matcha-cloud": { name: "抹茶クラウド", description: "済州抹茶ラテに軽やかなクリームをのせました" },
      americano: { name: "アメリカーノ", description: "ダークチョコレートの甘みとしっかりしたボディ" },
      "cafe-latte": { name: "カフェラテ", description: "エスプレッソと香ばしいミルクのバランス" },
      "flat-white": { name: "フラットホワイト", description: "ダブルショットときめ細かなミルクフォーム" },
      "maple-oat-latte": { name: "メープルオーツラテ", description: "メープルのやさしい甘さとオーツミルク" },
      "dark-chocolate-latte": { name: "ダークチョコレートラテ", description: "カカオの深く濃厚な味わい" },
      "salted-caramel-chocolate": { name: "ソルティキャラメルショコラ", description: "濃厚なチョコレートと塩キャラメルの調和" },
      "cacao-oat-milk": { name: "カカオオーツミルク", description: "カカオと香ばしいオーツミルクのドリンク" },
      "black-tea-plum-ade": { name: "紅茶プラムエイド", description: "紅茶とプラムの爽やかなスパークリングドリンク" },
      "lemon-ginger-tea": { name: "レモンジンジャーティー", description: "レモンと生姜を温かく抽出したティー" },
      "chamomile-apple-tea": { name: "カモミールアップルティー", description: "カモミールとりんごの穏やかなブレンド" },
      "dark-chocolate-brownie": { name: "ダークチョコレートブラウニー", description: "濃厚なダークチョコレートを使ったしっとりブラウニー" },
      "hazelnut-financier": { name: "ヘーゼルナッツフィナンシェ", description: "ローストヘーゼルナッツとバターの香ばしさ" },
      "earl-grey-pound-cake": { name: "アールグレイパウンド", description: "アールグレイが香るやわらかなパウンドケーキ" },
      "cacao-canele": { name: "カカオカヌレ", description: "カカオの香りとキャラメリゼした表面" },
      "forest-tiramisu": { name: "フォレストティラミス", description: "エスプレッソとダークカカオを重ねたティラミス" },
      "mocha-walnut-cookie": { name: "モカウォルナッツクッキー", description: "モカとくるみを入れて焼いたしっとりクッキー" },
    },
    promotions: {
      ...COMMON_PROMOTIONS.ja,
      "dark-chocolate-brownie-closeout": { badgeText: "まもなく完売" },
    },
  },
};

const SUNDAY_LINE_TRANSLATIONS: SinglePageStarterTranslationBundle = {
  en: {
    site: {
      restaurantName: "SUNDAY ROASTERS",
      restaurantCategory: "Cafe",
      brandDescription: "A neighborhood roastery serving balanced coffee and simple desserts for an easy, unhurried break.",
      introDescription: "A neighborhood roastery for good coffee and simple desserts.",
      menuCoverDescription: "A neighborhood roastery for good coffee and simple desserts.",
      aboutDescription: "Balanced coffee and quietly comforting desserts.",
      footerNotices: ["Wi-Fi · SUNDAY_GUEST", "Instagram · @sunday.roasters", "Pets are welcome at outdoor seats only."],
    },
    pageTitle: "Menu",
    categoryNames: { signature: "SIGNATURE COFFEE", coffee: "COFFEE", "non-coffee": "NON-COFFEE", "tea-ade": "TEA & ADE", "bakery-dessert": "BAKERY & DESSERT" },
    items: {
      "sunday-cream-latte": { name: "Sunday Cream Latte", description: "A signature latte with nutty cream and smooth espresso" },
      "salted-maple-latte": { name: "Salted Maple Latte", description: "A latte with gentle maple sweetness and salted cream" },
      "orange-vanilla-cold-brew": { name: "Orange Vanilla Cold Brew", description: "Smooth cold brew with orange aroma and vanilla cream" },
      americano: { name: "Americano", description: "Balanced nuttiness with a clean finish" },
      "cafe-latte": { name: "Cafe Latte", description: "Bold espresso with smooth milk" },
      "flat-white": { name: "Flat White", description: "Rich espresso with finely textured milk foam" },
      "matcha-cream-latte": { name: "Matcha Cream Latte", description: "Jeju matcha with light, smooth cream" },
      "dark-chocolate-milk": { name: "Dark Chocolate Milk", description: "Rich dark chocolate blended with smooth milk" },
      "grapefruit-rosemary-ade": { name: "Grapefruit Rosemary Ade", description: "A bright ade with fresh grapefruit and rosemary" },
      "chamomile-citrus-tea": { name: "Chamomile Citrus Tea", description: "A blend of chamomile and citrus aromas" },
      "earl-grey-peach-tea": { name: "Earl Grey Peach Tea", description: "Earl Grey aroma with gentle peach sweetness" },
      "brown-butter-scone": { name: "Brown Butter Scone", description: "A crisp scone with nutty brown butter" },
      "lemon-madeleine": { name: "Lemon Madeleine", description: "A moist madeleine scented with lemon" },
      "pecan-caramel-tart": { name: "Pecan Caramel Tart", description: "A crisp tart filled with pecans and caramel" },
      "vanilla-pudding": { name: "Vanilla Pudding", description: "A smooth pudding made with vanilla bean and cream" },
      "carrot-cream-cheese-cake": { name: "Carrot Cream Cheese Cake", description: "Spiced carrot cake with smooth cream cheese" },
      "pistachio-cookie": { name: "Pistachio Cookie", description: "A nutty cookie generously filled with pistachios" },
    },
    promotions: { ...COMMON_PROMOTIONS.en, "brown-butter-scone-closeout": { badgeText: "LAST BATCH" } },
  },
  zh: {
    site: {
      restaurantName: "SUNDAY ROASTERS",
      restaurantCategory: "咖啡馆",
      brandDescription: "一家社区烘焙咖啡馆，提供平衡的咖啡和朴实甜点，让你悠闲享受片刻。",
      introDescription: "适合慢慢享用好咖啡与朴实甜点的社区烘焙馆。",
      menuCoverDescription: "适合慢慢享用好咖啡与朴实甜点的社区烘焙馆。",
      aboutDescription: "平衡的咖啡与令人安心的甜点。",
      footerNotices: ["Wi-Fi · SUNDAY_GUEST", "Instagram · @sunday.roasters", "宠物仅可使用户外座位。"],
    },
    pageTitle: "菜单",
    categoryNames: { signature: "招牌咖啡", coffee: "咖啡", "non-coffee": "非咖啡饮品", "tea-ade": "茶与气泡饮", "bakery-dessert": "烘焙与甜点" },
    items: {
      "sunday-cream-latte": { name: "星期日奶油拿铁", description: "坚果奶油与柔滑浓缩咖啡调制的招牌拿铁" },
      "salted-maple-latte": { name: "海盐枫糖拿铁", description: "淡雅枫糖甜味与海盐奶油拿铁" },
      "orange-vanilla-cold-brew": { name: "橙香草冷萃", description: "橙香与香草奶油搭配的柔滑冷萃" },
      americano: { name: "美式咖啡", description: "平衡的坚果香与清爽余味" },
      "cafe-latte": { name: "咖啡拿铁", description: "浓郁浓缩咖啡与柔滑牛奶" },
      "flat-white": { name: "馥芮白", description: "浓郁浓缩咖啡与细腻奶泡" },
      "matcha-cream-latte": { name: "抹茶奶油拿铁", description: "济州抹茶与清爽奶油的组合" },
      "dark-chocolate-milk": { name: "黑巧克力牛奶", description: "浓郁黑巧克力与柔滑牛奶" },
      "grapefruit-rosemary-ade": { name: "西柚迷迭香气泡饮", description: "新鲜西柚与迷迭香的清爽气泡饮" },
      "chamomile-citrus-tea": { name: "洋甘菊柑橘茶", description: "洋甘菊与柑橘香气的拼配茶" },
      "earl-grey-peach-tea": { name: "伯爵蜜桃茶", description: "伯爵茶香与蜜桃的淡雅甜味" },
      "brown-butter-scone": { name: "焦化黄油司康", description: "带有坚果香焦化黄油的酥脆司康" },
      "lemon-madeleine": { name: "柠檬玛德琳", description: "带有柠檬香气的湿润玛德琳" },
      "pecan-caramel-tart": { name: "碧根果焦糖挞", description: "加入碧根果与焦糖的酥脆挞" },
      "vanilla-pudding": { name: "香草布丁", description: "以香草荚与鲜奶油制成的柔滑布丁" },
      "carrot-cream-cheese-cake": { name: "胡萝卜奶油芝士蛋糕", description: "香料胡萝卜蛋糕搭配柔滑奶油芝士" },
      "pistachio-cookie": { name: "开心果曲奇", description: "加入大量开心果烘烤的香醇曲奇" },
    },
    promotions: { ...COMMON_PROMOTIONS.zh, "brown-butter-scone-closeout": { badgeText: "即将售罄" } },
  },
  ja: {
    site: {
      restaurantName: "SUNDAY ROASTERS",
      restaurantCategory: "カフェ",
      brandDescription: "おいしい豆と素朴なデザートをゆっくり楽しめる、バランスのよいコーヒーを届ける街のロースタリーです。",
      introDescription: "おいしいコーヒーと素朴なデザートを楽しむ街のロースタリーです。",
      menuCoverDescription: "おいしいコーヒーと素朴なデザートを楽しむ街のロースタリーです。",
      aboutDescription: "バランスのよいコーヒーと心ほどけるデザート。",
      footerNotices: ["Wi-Fi · SUNDAY_GUEST", "Instagram · @sunday.roasters", "ペットは屋外席のみご利用いただけます。"],
    },
    pageTitle: "メニュー",
    categoryNames: { signature: "シグネチャーコーヒー", coffee: "コーヒー", "non-coffee": "ノンコーヒー", "tea-ade": "ティー＆エイド", "bakery-dessert": "ベーカリー＆デザート" },
    items: {
      "sunday-cream-latte": { name: "サンデークリームラテ", description: "香ばしいクリームとエスプレッソをなめらかに楽しむシグネチャーラテ" },
      "salted-maple-latte": { name: "ソルティメープルラテ", description: "メープルのやさしい甘さと塩クリームのラテ" },
      "orange-vanilla-cold-brew": { name: "オレンジバニラコールドブリュー", description: "オレンジの香りとバニラクリームを加えたなめらかなコールドブリュー" },
      americano: { name: "アメリカーノ", description: "バランスのよい香ばしさとすっきりした後味" },
      "cafe-latte": { name: "カフェラテ", description: "濃厚なエスプレッソとなめらかなミルク" },
      "flat-white": { name: "フラットホワイト", description: "濃厚なエスプレッソときめ細かなミルクフォーム" },
      "matcha-cream-latte": { name: "抹茶クリームラテ", description: "済州抹茶と軽やかなクリームの組み合わせ" },
      "dark-chocolate-milk": { name: "ダークチョコレートミルク", description: "濃厚なダークチョコレートとなめらかなミルク" },
      "grapefruit-rosemary-ade": { name: "グレープフルーツローズマリーエイド", description: "生グレープフルーツとローズマリーが爽やかなエイド" },
      "chamomile-citrus-tea": { name: "カモミールシトラスティー", description: "カモミールと柑橘の香りを合わせたブレンドティー" },
      "earl-grey-peach-tea": { name: "アールグレイピーチティー", description: "アールグレイの香りと桃のやさしい甘さ" },
      "brown-butter-scone": { name: "ブラウンバタースコーン", description: "香ばしいブラウンバター風味のさくさくスコーン" },
      "lemon-madeleine": { name: "レモンマドレーヌ", description: "レモンが香るしっとりしたマドレーヌ" },
      "pecan-caramel-tart": { name: "ピーカンキャラメルタルト", description: "ピーカンナッツとキャラメルを詰めた香ばしいタルト" },
      "vanilla-pudding": { name: "バニラプリン", description: "バニラビーンズと生クリームで作ったなめらかなプリン" },
      "carrot-cream-cheese-cake": { name: "キャロットクリームチーズケーキ", description: "スパイス香るキャロットケーキとなめらかなクリームチーズ" },
      "pistachio-cookie": { name: "ピスタチオクッキー", description: "ピスタチオをたっぷり入れた香ばしいクッキー" },
    },
    promotions: { ...COMMON_PROMOTIONS.ja, "brown-butter-scone-closeout": { badgeText: "まもなく完売" } },
  },
};

const ROUND_FOCUS_TRANSLATIONS: SinglePageStarterTranslationBundle = {
  en: {
    site: {
      restaurantName: "ROUND ROASTERS",
      restaurantCategory: "Cafe",
      brandDescription: "Coffee for every day, made with rounded aromas and comforting flavors.",
      introDescription: "Coffee for every day, made with rounded aromas and comforting flavors.",
      menuCoverDescription: "Coffee for every day, made with rounded aromas and comforting flavors.",
      aboutDescription: "Easygoing coffee with round aromas and a clean finish.",
      footerNotices: ["Wi-Fi · ROUND_GUEST", "Instagram · @round.roasters", "Decaf beans are available."],
    },
    pageTitle: "Menu",
    categoryNames: { "house-special": "HOUSE SPECIALS", espresso: "ESPRESSO", "milk-cream": "MILK & CREAM", "tea-ade": "TEA & ADE", bake: "BAKE" },
    items: {
      "round-cream-coffee": { name: "Round Cream Coffee", description: "Signature coffee with smooth cream and nutty espresso" },
      "brown-sugar-flat-white": { name: "Brown Sugar Flat White", description: "A flat white with the gentle sweetness of brown sugar" },
      "orange-cream-coldbrew": { name: "Orange Cream Cold Brew", description: "Cold brew with orange aroma and smooth cream" },
      espresso: { name: "Espresso", description: "Bold aroma with clean sweetness" },
      americano: { name: "Americano", description: "Nutty aroma with a balanced finish" },
      cappuccino: { name: "Cappuccino", description: "Rich espresso with generous milk foam" },
      "cafe-latte": { name: "Cafe Latte", description: "Espresso balanced with smooth milk" },
      "vanilla-bean-milk": { name: "Vanilla Bean Milk", description: "Sweet milk infused with vanilla bean" },
      "matcha-oat-milk": { name: "Matcha Oat Milk", description: "Jeju matcha with nutty oat milk" },
      "citrus-mint-ade": { name: "Citrus Mint Ade", description: "A bright ade with citrus and mint" },
      "earl-grey-peach-tea": { name: "Earl Grey Peach Tea", description: "Earl Grey aroma with gentle peach sweetness" },
      "fig-butter-scone": { name: "Fig Butter Scone", description: "A scone baked with figs and cultured butter" },
      "lemon-madeleine": { name: "Lemon Madeleine", description: "A moist madeleine scented with lemon" },
    },
    promotions: { ...COMMON_PROMOTIONS.en },
  },
  zh: {
    site: {
      restaurantName: "ROUND ROASTERS",
      restaurantCategory: "咖啡馆",
      brandDescription: "以圆润香气和舒适风味，制作适合每日享用的咖啡。",
      introDescription: "以圆润香气和舒适风味，制作适合每日享用的咖啡。",
      menuCoverDescription: "以圆润香气和舒适风味，制作适合每日享用的咖啡。",
      aboutDescription: "圆润香气与清爽余味的日常咖啡。",
      footerNotices: ["Wi-Fi · ROUND_GUEST", "Instagram · @round.roasters", "可更换为低咖啡因咖啡豆。"],
    },
    pageTitle: "菜单",
    categoryNames: { "house-special": "本店招牌", espresso: "浓缩咖啡", "milk-cream": "牛奶与奶油", "tea-ade": "茶与气泡饮", bake: "烘焙" },
    items: {
      "round-cream-coffee": { name: "圆润奶油咖啡", description: "柔滑奶油与坚果香浓缩咖啡调制的招牌咖啡" },
      "brown-sugar-flat-white": { name: "红糖馥芮白", description: "带有红糖淡雅甜味的馥芮白" },
      "orange-cream-coldbrew": { name: "橙香奶油冷萃", description: "橙香与柔滑奶油搭配的冷萃咖啡" },
      espresso: { name: "浓缩咖啡", description: "浓郁香气与清爽甜感" },
      americano: { name: "美式咖啡", description: "坚果香与平衡的余味" },
      cappuccino: { name: "卡布奇诺", description: "浓郁浓缩咖啡与丰盈奶泡" },
      "cafe-latte": { name: "咖啡拿铁", description: "浓缩咖啡与柔滑牛奶的平衡" },
      "vanilla-bean-milk": { name: "香草荚牛奶", description: "香草荚与牛奶调制的甜美饮品" },
      "matcha-oat-milk": { name: "抹茶燕麦奶", description: "济州抹茶与香醇燕麦奶" },
      "citrus-mint-ade": { name: "柑橘薄荷气泡饮", description: "柑橘与薄荷香气的清爽气泡饮" },
      "earl-grey-peach-tea": { name: "伯爵蜜桃茶", description: "伯爵茶香与蜜桃的淡雅甜味" },
      "fig-butter-scone": { name: "无花果黄油司康", description: "加入无花果与发酵黄油烘烤的司康" },
      "lemon-madeleine": { name: "柠檬玛德琳", description: "带有柠檬香气的湿润玛德琳" },
    },
    promotions: { ...COMMON_PROMOTIONS.zh },
  },
  ja: {
    site: {
      restaurantName: "ROUND ROASTERS",
      restaurantCategory: "カフェ",
      brandDescription: "丸みのある香りと心地よい味わいで、毎日のコーヒーを作ります。",
      introDescription: "丸みのある香りと心地よい味わいで、毎日のコーヒーを作ります。",
      menuCoverDescription: "丸みのある香りと心地よい味わいで、毎日のコーヒーを作ります。",
      aboutDescription: "丸みのある香りとすっきりした後味のデイリーコーヒー。",
      footerNotices: ["Wi-Fi · ROUND_GUEST", "Instagram · @round.roasters", "デカフェ豆に変更できます。"],
    },
    pageTitle: "メニュー",
    categoryNames: { "house-special": "ハウススペシャル", espresso: "エスプレッソ", "milk-cream": "ミルク＆クリーム", "tea-ade": "ティー＆エイド", bake: "ベイク" },
    items: {
      "round-cream-coffee": { name: "ラウンドクリームコーヒー", description: "なめらかなクリームと香ばしいエスプレッソのシグネチャーコーヒー" },
      "brown-sugar-flat-white": { name: "ブラウンシュガーフラットホワイト", description: "ブラウンシュガーのやさしい甘さを加えたフラットホワイト" },
      "orange-cream-coldbrew": { name: "オレンジクリームコールドブリュー", description: "オレンジの香りとなめらかなクリームのコールドブリュー" },
      espresso: { name: "エスプレッソ", description: "濃厚な香りとすっきりした甘み" },
      americano: { name: "アメリカーノ", description: "ナッツの香ばしさとバランスのよい後味" },
      cappuccino: { name: "カプチーノ", description: "豊かなミルクフォームと濃厚なエスプレッソ" },
      "cafe-latte": { name: "カフェラテ", description: "エスプレッソとなめらかなミルクの調和" },
      "vanilla-bean-milk": { name: "バニラビーンズミルク", description: "バニラビーンズとミルクの甘いドリンク" },
      "matcha-oat-milk": { name: "抹茶オーツミルク", description: "済州抹茶と香ばしいオーツミルク" },
      "citrus-mint-ade": { name: "シトラスミントエイド", description: "柑橘とミントが爽やかなエイド" },
      "earl-grey-peach-tea": { name: "アールグレイピーチティー", description: "アールグレイの香りと桃のやさしい甘さ" },
      "fig-butter-scone": { name: "いちじくバタースコーン", description: "いちじくと発酵バターを入れて焼いたスコーン" },
      "lemon-madeleine": { name: "レモンマドレーヌ", description: "レモンが香るしっとりしたマドレーヌ" },
    },
    promotions: { ...COMMON_PROMOTIONS.ja },
  },
};

export const SINGLE_PAGE_STARTER_TRANSLATIONS = {
  cafe_design_a: AUBE_TRANSLATIONS,
  cafe_mocha_forest_a: MOCHA_FOREST_TRANSLATIONS,
  cafe_sunday_line_a: SUNDAY_LINE_TRANSLATIONS,
  cafe_round_focus_a: ROUND_FOCUS_TRANSLATIONS,
} as const satisfies Record<string, SinglePageStarterTranslationBundle>;

export function getSinglePageStarterTranslations(templateKey: string | null | undefined) {
  if (!templateKey) return null;
  return SINGLE_PAGE_STARTER_TRANSLATIONS[templateKey as keyof typeof SINGLE_PAGE_STARTER_TRANSLATIONS] ?? null;
}
