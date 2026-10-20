import type { SinglePageStarterTranslationBundle } from "./single-page-starter-translations";

const entries = {
  en: [
    ["Seared scallop", "Golden scallop with herb purée"], ["Artisan cheese plate", "Aged cheeses, seasonal fruit and crackers"], ["Spicy chicken wings", "Crispy wings with a spicy glaze"],
    ["Citrus garden salad", "Baby leaves, orange and lemon dressing"], ["Burrata & tomato", "Burrata, ripe tomatoes and basil oil"], ["Soup of the day", "Seasonal vegetable soup with sourdough"],
    ["Slow-cooked ragù pasta", "Beef ragù and Parmigiano"], ["Lemon prawn linguine", "Prawns, lemon butter and parsley"], ["Porcini risotto", "Creamy rice with woodland mushrooms"], ["Striploin steak", "Grilled striploin, vegetables and red-wine sauce"],
    ["Truffle fries", "Truffle oil and Parmigiano"], ["Sourdough & butter", "Warm sourdough with whipped butter"], ["Classic tiramisu", "Espresso and mascarpone cream"], ["Vanilla panna cotta", "Vanilla cream with seasonal fruit compote"],
    ["Americano", ""], ["Grapefruit rosemary soda", ""], ["House wine", "Red or white · glass"],

    ["Mushroom Crostini","Crisp baguette topped with roasted mushrooms and ricotta."], ["Roasted Beet Salad","Roasted beetroot, baby leaves and bright balsamic dressing."], ["Lemon Mint Soda","A sparkling drink with fresh lemon and mint."],
  ],
  zh: [
    ["黄油煎扇贝", "香煎扇贝配香草泥"], ["精选奶酪拼盘", "熟成奶酪、时令水果与饼干"], ["香辣鸡翅", "香脆鸡翅配香辣酱汁"],
    ["柑橘田园沙拉", "嫩叶蔬菜、橙子与柠檬沙拉汁"], ["布拉塔番茄", "布拉塔奶酪、熟番茄与罗勒油"], ["每日例汤", "时令蔬菜汤配酸面包"],
    ["慢炖肉酱意面", "慢炖牛肉酱与帕尔马干酪"], ["柠檬鲜虾意面", "鲜虾、柠檬黄油与欧芹"], ["牛肝菌烩饭", "浓郁菌香与奶油烩饭"], ["西冷牛排", "炭烤西冷、烤蔬菜与红酒汁"],
    ["松露薯条", "松露油与帕尔马干酪"], ["酸面包与黄油", "热酸面包配打发黄油"], ["经典提拉米苏", "浓缩咖啡与马斯卡彭奶油"], ["香草奶冻", "香草奶油配时令水果酱"],
    ["美式咖啡", ""], ["西柚迷迭香气泡饮", ""], ["招牌葡萄酒", "红葡萄酒或白葡萄酒 · 杯"],

    ["蘑菇烤面包","香脆法棍搭配烤蘑菇与乳清奶酪。"], ["烤甜菜沙拉","烤甜菜与嫩叶蔬菜，搭配清新香醋汁。"], ["柠檬薄荷苏打","清新柠檬与薄荷调制的气泡饮。"],
  ],
  ja: [
    ["ホタテのバターソテー", "香ばしいホタテとハーブのピュレ"], ["チーズプレート", "熟成チーズと季節の果物、クラッカー"], ["スパイシーチキンウィング", "香ばしい手羽先とスパイシーソース"],
    ["シトラスガーデンサラダ", "ベビーリーフ、オレンジとレモンドレッシング"], ["ブッラータとトマト", "ブッラータ、完熟トマトとバジルオイル"], ["本日のスープ", "季節野菜のスープとサワードウ"],
    ["じっくり煮込んだラグーパスタ", "牛肉のラグーとパルミジャーノ"], ["海老のレモンリングイネ", "海老、レモンバターとイタリアンパセリ"], ["ポルチーニのリゾット", "豊かなきのこの香りとクリーミーなお米"], ["サーロインステーキ", "グリルステーキ、焼き野菜と赤ワインソース"],
    ["トリュフフライ", "トリュフオイルとパルミジャーノ"], ["サワードウとバター", "温かいサワードウとホイップバター"], ["クラシックティラミス", "エスプレッソとマスカルポーネクリーム"], ["バニラパンナコッタ", "バニラクリームと季節の果実のコンポート"],
    ["アメリカーノ", ""], ["グレープフルーツローズマリーソーダ", ""], ["ハウスワイン", "赤または白 · グラス"],

    ["きのこのクロスティーニ","ローストきのことリコッタをのせた香ばしいバゲット。"], ["ローストビーツサラダ","ローストビーツとベビーリーフに爽やかなバルサミコドレッシング。"], ["レモンミントソーダ","レモンとミントが爽やかに香るソーダ。"],
  ],
};
const keys = ["scallop", "cheese", "chicken", "salad", "burrata", "soup", "ragu", "prawn", "risotto", "steak", "fries", "bread", "tiramisu", "panna", "americano", "ade", "wine", "mushroom-crostini", "roasted-beet-salad", "lemon-mint-soda"];
const categories = ["signature", "starters", "mains", "sides", "dessert", "drinks"];
const copy = {
  en: { desc: "A relaxed table inspired by the season.", notices: ["Lunch 11:30–15:00 · Dinner 17:00–22:00", "Please ask our team about food allergens.", "All prices include tax."], categories: ["SIGNATURE", "STARTERS", "PASTA & MAINS", "SIDES", "SWEET FINISH", "DRINKS"], categoryDescriptions: ["Seasonal favourites", "A light start to your meal", "Plates to savour slowly"] },
  zh: { desc: "以当季风味，准备一顿悠闲的美食。", notices: ["午餐 11:30–15:00 · 晚餐 17:00–22:00", "食物过敏相关信息请咨询店员。", "所有价格均含税。"], categories: ["招牌菜", "前菜", "意面与主菜", "配菜", "甜品", "饮品"], categoryDescriptions: ["时令招牌菜", "开启餐桌的轻盈一盘", "慢慢享用的丰盛主菜"] },
  ja: { desc: "旬のおいしさを、ゆったり楽しむ食卓へ。", notices: ["ランチ 11:30–15:00 · ディナー 17:00–22:00", "アレルギーについてはスタッフへお尋ねください。", "価格はすべて税込です。"], categories: ["シグネチャー", "前菜", "パスタ・メイン", "サイド", "デザート", "ドリンク"], categoryDescriptions: ["季節を味わうシグネチャー", "食事の始まりを彩る一皿", "ゆっくり楽しむメイン料理"] },
};
export const ONUE_TRANSLATIONS = Object.fromEntries(Object.entries(copy).map(([locale, text]) => [locale, {
  site: { restaurantName: "ONUE TABLE", restaurantCategory: locale === "en" ? "Restaurant & Dining" : locale === "zh" ? "餐厅" : "レストラン", brandDescription: text.desc, introDescription: text.desc, menuCoverDescription: text.desc, aboutDescription: text.desc, footerNotices: text.notices },
  pageTitle: "ONUE TABLE", categoryNames: Object.fromEntries(categories.map((key, i) => [key, text.categories[i]])),
  categoryDescriptions: Object.fromEntries(categories.slice(0, 3).map((key, i) => [key, text.categoryDescriptions[i]])),
  items: Object.fromEntries(keys.map((key, i) => [key, { name: entries[locale as keyof typeof entries][i][0], description: entries[locale as keyof typeof entries][i][1] }])), promotions: {},
}])) as SinglePageStarterTranslationBundle;
