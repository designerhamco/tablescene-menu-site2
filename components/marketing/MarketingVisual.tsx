import Image from "next/image";
import {
  Bell,
  Check,
  Globe2,
  ImageIcon,
  LayoutGrid,
  Megaphone,
  Monitor,
  ShoppingBag,
  Sparkles,
  Timer,
} from "lucide-react";
import styles from "./marketing.module.css";

export type VisualKind =
  | "featured"
  | "gallery"
  | "prices"
  | "sale"
  | "widgets"
  | "advertising"
  | "call"
  | "order"
  | "pages"
  | "cover"
  | "media"
  | "ai"
  | "languages"
  | "devices";
const photos = [
  "/menu-templates/cafe_design_a/black-sesame-featured.jpg",
  "/menu-templates/cafe_design_a/nutty-cream-featured.jpg",
  "/menu-templates/cafe_design_a/malcha.jpg",
];

function ProductPhoto({ index = 0 }: { index?: number }) {
  return (
    <Image
      src={photos[index]}
      alt=""
      width={720}
      height={720}
      className={styles.productPhoto}
      sizes="(max-width: 767px) 80vw, 36vw"
    />
  );
}

export default function MarketingVisual({ kind }: { kind: VisualKind }) {
  return (
    <div className={styles.visual} data-visual={kind} aria-hidden="true">
      {kind === "featured" || kind === "cover" || kind === "media" ? (
        <div className={styles.poster}>
          <span className={styles.demoEyebrow}>
            {kind === "cover"
              ? "AUBE TABLE"
              : kind === "media"
                ? "SEASONAL FILM & IMAGE"
                : "OUR SIGNATURE"}
          </span>
          <div className={styles.posterPhoto}>
            <ProductPhoto index={kind === "cover" ? 1 : 0} />
          </div>
          <strong>
            {kind === "cover" ? "A moment to savour." : "Black sesame latte"}
          </strong>
          <span>
            {kind === "media"
              ? "메뉴 대신, 한 장면을 가득하게"
              : "고소한 흑임자와 부드러운 크림"}
          </span>
        </div>
      ) : null}
      {kind === "gallery" ? (
        <div className={styles.photoGallery}>
          <span className={styles.demoPill}>매장만의 이미지 앨범</span>
          <div>
            {[0, 1, 2].map((index) => (
              <div key={index}>
                <ProductPhoto index={index} />
              </div>
            ))}
          </div>
          <span className={styles.demoCaption}>1:1 · 4:5 · 5:4</span>
        </div>
      ) : null}
      {kind === "prices" ? (
        <div className={styles.demoPaper}>
          <span className={styles.demoEyebrow}>COFFEE & DESSERT</span>
          <strong className={styles.demoTitle}>취향에 맞게, 한 잔.</strong>
          {["아메리카노", "카페라떼", "흑임자 크림 라떼"].map((name, i) => (
            <div className={styles.priceRow} key={name}>
              <strong>{name}</strong>
              <div>
                <span>HOT</span>
                <b>{[4500, 5000, 6500][i].toLocaleString()}</b>
                <span>ICE</span>
                <b>{[5000, 5500, 7000][i].toLocaleString()}</b>
              </div>
            </div>
          ))}
        </div>
      ) : null}
      {kind === "sale" ? (
        <div className={styles.saleDemo}>
          <div className={styles.salePhoto}>
            <ProductPhoto index={1} />
          </div>
          <div>
            <span className={styles.demoPill}>
              <Timer size={14} />
              오늘의 타임 세일
            </span>
            <strong className={styles.demoTitle}>Nutty cream latte</strong>
            <del>6,800원</del>
            <b className={styles.salePrice}>5,500원</b>
            <span className={styles.countdown}>02 : 18 : 45</span>
            <span className={styles.demoCaption}>
              설정한 기간에 맞춰 할인 표시
            </span>
          </div>
        </div>
      ) : null}
      {kind === "widgets" ? (
        <div className={styles.widgetDemo}>
          <span className={styles.demoEyebrow}>A LITTLE NOTE FOR YOU</span>
          <Megaphone size={30} />
          <strong>오늘의 작은 즐거움</strong>
          <p>
            오후의 커피와 함께
            <br />갓 구운 디저트를 만나보세요.
          </p>
          <span className={styles.demoPill}>매장 소식 · 추천 메뉴</span>
        </div>
      ) : null}
      {kind === "advertising" ? (
        <div className={styles.adDemo}>
          <ProductPhoto index={2} />
          <div>
            <span className={styles.demoEyebrow}>NEW SEASON</span>
            <strong>초록빛 한 잔의 여유</strong>
            <span>메뉴판 위에서 만나는 매장 프로모션</span>
          </div>
        </div>
      ) : null}
      {kind === "call" || kind === "order" ? (
        <div className={styles.phoneDemo}>
          <span className={styles.demoEyebrow}>ARTIMENU · TABLE 1</span>
          <div className={styles.phonePhoto}>
            <ProductPhoto />
          </div>
          <strong>흑임자 크림 라떼</strong>
          <div className={styles.phoneAction}>
            {kind === "call" ? <Bell size={20} /> : <ShoppingBag size={20} />}
            {kind === "call" ? "직원 호출" : "메뉴 담기"}
          </div>
          <div className={styles.phoneSheet}>
            <strong>
              {kind === "call" ? "무엇을 도와드릴까요?" : "취향대로 골라주세요"}
            </strong>
            {(kind === "call"
              ? ["물 부탁드려요", "주문을 도와주세요"]
              : ["ICE · +500원", "수량 1개"]
            ).map((text) => (
              <span key={text}>
                <Check size={14} />
                {text}
              </span>
            ))}
          </div>
        </div>
      ) : null}
      {kind === "pages" ? (
        <div className={styles.pagesDemo}>
          <div>
            <span className={styles.demoPill}>01 · COVER</span>
            <span>02 · SIGNATURE</span>
            <span>03 · COFFEE</span>
          </div>
          <div className={styles.pagePreview}>
            <ProductPhoto index={1} />
            <strong>Signature collection</strong>
            <span>원하는 페이지를 원하는 화면에</span>
          </div>
        </div>
      ) : null}
      {kind === "ai" ? (
        <div className={styles.aiDemo}>
          <Sparkles size={28} />
          <span className={styles.demoPill}>메뉴 초안 정리</span>
          <div className={styles.aiInput}>
            아메리카노 4500 카페라떼 5000
            <br />
            흑임자 크림 라떼 6500
          </div>
          {["아메리카노", "카페라떼", "흑임자 크림 라떼"].map((name, i) => (
            <div className={styles.aiRow} key={name}>
              <Check size={15} />
              <span>{name}</span>
              <b>{[4500, 5000, 6500][i].toLocaleString()}</b>
            </div>
          ))}
        </div>
      ) : null}
      {kind === "languages" ? (
        <div className={styles.languageDemo}>
          <Globe2 size={34} />
          <strong>
            한 메뉴판,
            <br />네 가지 언어.
          </strong>
          <div>
            {["한국어", "English", "日本語", "中文"].map((language) => (
              <span key={language}>{language}</span>
            ))}
          </div>
        </div>
      ) : null}
      {kind === "devices" ? (
        <div className={styles.devicesDemo}>
          <div>
            <Monitor size={48} />
            <LayoutGrid size={34} />
            <ImageIcon size={26} />
          </div>
          <strong>매장에서도, 손안에서도.</strong>
          <span>PC · 태블릿 · 스마트폰</span>
          <div className={styles.devicePhotos}>
            {[0, 1, 2].map((index) => (
              <div key={index}>
                <ProductPhoto index={index} />
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
