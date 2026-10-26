import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/app/components/ui/button";
import OfficialSiteNavbar from "@/components/layout/OfficialSiteNavbar";
import Footer from "@/app/components/layout/Footer";
import TabletTemplateCarousel from "@/app/components/home/TabletTemplateCarousel";
import { templateSubscriptionPricing } from "@/lib/template-subscription-pricing";
import MarketingVisual, { type VisualKind } from "./MarketingVisual";
import UsageGuides from "./UsageGuides";
import styles from "./marketing.module.css";

type Service = "basic" | "dining" | "display";
type Feature = { kind: VisualKind; label: string; title: string; body: string };

const shared = {
  gallery: {
    kind: "gallery",
    label: "상품 이미지",
    title: "맛이 궁금해지는 메뉴 사진",
    body: "한 장의 사진부터 앨범까지. 메뉴에 어울리는 이미지를 담고, 앨범은 1:1·4:5·5:4 비율로 보여주세요.",
  },
  prices: {
    kind: "prices",
    label: "가격 옵션",
    title: "선택은 다양하게, 가격은 명확하게",
    body: "사이즈와 온도처럼 다른 옵션을 메뉴와 함께 안내해 손님이 가격을 쉽게 비교할 수 있습니다.",
  },
  sale: {
    kind: "sale",
    label: "기간 할인",
    title: "할인이 시작되는 순간까지",
    body: "행사 기간과 할인 가격을 설정하세요. 남은 시간을 함께 보여주어 지금의 혜택을 전할 수 있습니다.",
  },
  advertising: {
    kind: "advertising",
    label: "광고",
    title: "메뉴를 여는 순간, 매장 소식도 함께",
    body: "신메뉴와 시즌 프로모션을 이미지로 소개하세요. 메뉴판에 들어온 손님에게 매장의 새로운 이야기를 전합니다.",
  },
  call: {
    kind: "call",
    label: "직원 호출",
    title: "도움이 필요할 땐 화면에서 바로",
    body: "메뉴판에서 필요한 도움을 선택하는 호출 흐름을 제공합니다. 실제 호출 접수는 매장별 운영 연결 후 사용할 수 있습니다.",
  },
  order: {
    kind: "order",
    label: "테이블 주문",
    title: "고르고, 담고, 한 번에 주문",
    body: "옵션과 수량을 골라 장바구니에 담는 주문 경험. 실제 후불 주문은 매장별 연결 후 이용할 수 있으며 선결제는 준비 중입니다.",
  },
} satisfies Record<string, Feature>;

const features: Record<Service, Feature[]> = {
  basic: [
    {
      kind: "featured",
      label: "대표 상품 영역",
      title: "가장 먼저 보여주고 싶은 한 가지",
      body: "시그니처와 신메뉴를 포스터처럼 소개하세요. 매장을 대표하는 상품에 사진과 설명을 더해 시선을 모읍니다.",
    },
    shared.gallery,
    shared.prices,
    shared.sale,
    {
      kind: "widgets",
      label: "콘텐츠 위젯",
      title: "메뉴 사이에 담는 매장의 이야기",
      body: "추천 메뉴와 이벤트, 꼭 전하고 싶은 안내를 위젯으로 배치해 매장만의 메뉴판을 완성하세요.",
    },
    shared.advertising,
    shared.call,
    shared.order,
  ],
  dining: [
    {
      kind: "pages",
      label: "멀티페이지",
      title: "코스부터 디저트까지, 흐름이 있는 메뉴",
      body: "여러 페이지로 메뉴를 나누어 보여주세요. 코스와 음료, 디저트까지 손님이 원하는 페이지를 차례로 살펴봅니다.",
    },
    {
      kind: "cover",
      label: "커버 페이지",
      title: "첫 장부터 전해지는 매장의 분위기",
      body: "매장의 사진과 이름을 담은 커버로 시작하세요. 메뉴를 읽기 전부터 다이닝의 인상을 전합니다.",
    },
    shared.gallery,
    shared.prices,
    shared.sale,
    shared.advertising,
    shared.call,
    shared.order,
  ],
  display: [
    {
      kind: "pages",
      label: "화면별 페이지",
      title: "각 화면에 필요한 페이지만",
      body: "여러 페이지로 구성한 메뉴 중 화면마다 보여줄 페이지를 지정하세요. 커피와 디저트, 시즌 메뉴를 각각의 화면에 나누어 소개합니다.",
    },
    {
      kind: "media",
      label: "이미지 · 영상 페이지",
      title: "한 화면을 가득 채우는 한 장면",
      body: "메뉴 목록 대신 이미지나 영상만 보여주는 페이지를 구성할 수 있습니다. 브랜드와 신메뉴를 큰 화면으로 소개하세요.",
    },
    {
      ...shared.prices,
      body: "메뉴별 선택 옵션과 가격을 함께 보여주세요. 큰 화면에서도 손님이 원하는 메뉴와 가격을 쉽게 찾을 수 있습니다.",
    },
    shared.sale,
  ],
};

const serviceCopy = {
  basic: {
    name: "베이직",
    eyebrow: "ARTIMENU BASIC",
    title: (
      <>
        한 화면에 담는
        <br />
        우리 매장의 매력
      </>
    ),
    body: "시그니처부터 오늘의 혜택까지, 매장에 어울리는 한 장의 메뉴판.",
    image: "/assets/artimenu-home-hero-psd-v3-1536.webp",
    alt: "매장 모니터와 태블릿, 스마트폰에 연결하는 디지털 메뉴판",
    section: "한 장의 메뉴판에, 필요한 기능을",
  },
  dining: {
    name: "다이닝",
    eyebrow: "ARTIMENU DINING",
    title: (
      <>
        첫 장부터 마지막 메뉴까지,
        <br />
        하나의 다이닝 경험
      </>
    ),
    body: "커버와 사진, 코스와 이야기를 여러 페이지에 여유롭게 담으세요.",
    image: "/menu-templates/dining_aube_table_a/aube-table-cover.png",
    alt: "오브 테이블 다이닝 메뉴판의 커버",
    section: "메뉴를 읽는 시간이, 매장의 경험으로",
  },
  display: {
    name: "디스플레이",
    eyebrow: "ARTIMENU DISPLAY",
    title: (
      <>
        매장의 큰 화면을
        <br />
        가장 매력적인 메뉴판으로
      </>
    ),
    body: "메뉴와 프로모션을 화면마다 다르게. 큰 화면에 맞춘 새로운 전달 방식.",
    image: "/assets/artimenu-home-hero-psd-v3-1536.webp",
    alt: "매장의 모니터와 디지털 기기",
    section: "큰 화면의 가능성을 넓히는 기능",
  },
} as const;

export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <OfficialSiteNavbar />
      <main>{children}</main>
      <Footer />
    </>
  );
}

function Showcase({
  dark = false,
  service,
}: {
  dark?: boolean;
  service?: Service;
}) {
  return (
    <section
      className={`${styles.showcase} ${dark ? styles.darkShowcase : ""}`}
      aria-labelledby="showcase-heading"
    >
      <div className="site-container">
        <div className={styles.sectionHeading}>

          <h2 id="showcase-heading" className="type-section-title">
            같은 메뉴도,
            <br />
            매장답게 보이도록
          </h2>
          <p className="site-body">
            공간의 분위기에 맞는 디자인을 고르고 나만의 메뉴를 담아보세요.
          </p>
        </div>
        <TabletTemplateCarousel showControls={false} compact continuous />
        <div className={styles.centerAction}>
          {service === "display" ? (
            <span className={styles.availability}>
              디스플레이 디자인과 신규 신청은 준비 중입니다
            </span>
          ) : (
            <Link
              href={
                service === "dining"
                  ? "/templates?plan=dining"
                  : "/templates?plan=basic"
              }
              className={buttonVariants({ variant: dark ? "secondary" : "outline", size: "lg" })}
            >
              더 많은 디자인 보기
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

export function MarketingServicePage({ service }: { service: Service }) {
  const copy = serviceCopy[service];
  const dark = service === "dining";
  return (
    <div
      className={`${styles.page} ${dark ? styles.darkPage : ""}`}
      data-service-page={service}
    >
      <section className={styles.hero}>
        <div className="site-container">
          <div className={styles.heroHeading}>

            <h1 className="type-page-title">{copy.title}</h1>
            <p className="type-page-description">{copy.body}</p>
            {service === "display" ? (
              <p className={styles.availability}>
                서비스 소개 · 신규 신청 준비 중
              </p>
            ) : service === "dining" ? (
              <Link
                href={`/templates?plan=${service}`}
                className={buttonVariants({ variant: dark ? "secondary" : "default", size: "lg" })}
              >
                {copy.name} 디자인 선택
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            ) : null}
          </div>
          <div
            className={`${styles.heroImage} ${dark ? styles.diningHeroImage : ""}`}
          >
            <Image
              src={copy.image}
              alt={copy.alt}
              width={1536}
              height={864}
              sizes="(min-width: 1600px) 1520px, 94vw"
              priority
            />
          </div>
        </div>
      </section>
      <Showcase dark={dark} service={service} />
      <section
        className={styles.featureStory}
        aria-labelledby="feature-heading"
      >
        <div className="site-container">
          <div className={styles.sectionHeading}>
            <h2 id="feature-heading" className="type-section-title">
              {copy.section}
            </h2>
            <p className="type-body">
              {service === "display"
                ? "정식 공개를 준비 중인 디스플레이의 구성과 활용 방법을 소개합니다."
                : "메뉴를 보여주는 일부터 매장을 운영하는 순간까지."}
            </p>
          </div>
          <div className={styles.storyList}>
            {features[service].map((feature, i) => (
              <article className={styles.storyRow} key={feature.kind}>
                <div className={styles.storyCopy}>
                  <span className={styles.featureNumber}>
                    {String(i + 1).padStart(2, "0")} / {feature.label}
                  </span>
                  <h3 className="type-subsection-title">{feature.title}</h3>
                  <p className="site-body">{feature.body}</p>
                </div>
                <MarketingVisual kind={feature.kind} />
              </article>
            ))}
          </div>
        </div>
      </section>
      <UsageGuides display={service === "display"} />
      {service !== "display" ? (
        <section className={styles.serviceCta}>
          <div className="site-container">
            <h2 className="type-section-title">
              우리 매장의 메뉴판을 만나보세요
            </h2>
            <Link
              href={`/templates?plan=${service}`}
              className={buttonVariants({ variant: dark ? "secondary" : "default", size: "lg" })}
            >
              디자인 고르고 시작하기
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </section>
      ) : null}
    </div>
  );
}

export function MarketingHome() {
  const customization: Feature[] = [
    {
      kind: "featured",
      label: "대표 상품",
      title: "사진 한 장으로 전하는 시그니처",
      body: "가장 자신 있는 메뉴를 포스터처럼 소개하세요.",
    },
    {
      kind: "widgets",
      label: "위젯",
      title: "메뉴 사이사이, 매장의 소식",
      body: "이벤트와 추천 메뉴를 원하는 위치에 담으세요.",
    },
    {
      kind: "sale",
      label: "기간 할인",
      title: "오늘의 혜택이 눈에 띄도록",
      body: "할인 가격과 남은 시간을 함께 보여주세요.",
    },
    {
      kind: "advertising",
      label: "광고",
      title: "새로운 메뉴를 알리는 첫 장면",
      body: "메뉴판을 여는 손님에게 매장의 프로모션을 전하세요.",
    },
  ];
  const capabilities: Feature[] = [
    shared.order,
    shared.call,
    {
      kind: "ai",
      label: "AI 메뉴 정리",
      title: "메뉴 초안을 빠르게 정리",
      body: "메뉴 정보를 AI로 정리한 뒤 직접 확인하고 완성하세요. AI 기능은 크레딧을 사용합니다.",
    },
    {
      kind: "languages",
      label: "다국어",
      title: "언어가 달라도 편안한 선택",
      body: "한국어·영어·일본어·중국어 메뉴를 한곳에서 관리하세요. 번역에는 AI 크레딧이 사용됩니다.",
    },
  ];
  return (
    <div className={styles.page} data-marketing-page="home">
      <section className={styles.hero}>
        <div className="site-container">
          <div className={styles.heroHeading}>

            <h1 className="type-display">
              메뉴를 보여주는 순간,
              <br />
              매장이 달라집니다
            </h1>
            <p className="site-body">
              디자인부터 메뉴 관리까지.
              <br className={styles.mobileBreak} /> 우리 매장에 맞는 디지털
              메뉴판, 아티메뉴.
            </p>
          </div>
          <div className={styles.heroImage} data-static-hero>
            <Image
              src="/assets/artimenu-home-hero-psd-v3-1536.webp"
              alt="매장의 모니터, 태블릿, 스마트폰으로 연결하는 아티메뉴"
              width={1536}
              height={864}
              priority
              sizes="(min-width: 1600px) 1520px, 94vw"
            />
          </div>
        </div>
      </section>
      <Showcase />
      <section className={styles.homeFeatures}>
        <div className="site-container">
          <div className={styles.sectionHeading}>

            <h2 className="type-section-title">
              메뉴판에도,
              <br />
              매장만의 표정이 필요하니까
            </h2>
            <p className="site-body text-zinc-500">
              사진과 소식, 오늘의 혜택을 더해 매장다운 메뉴판을 완성하세요.
            </p>
          </div>
          <div className={styles.bentoGrid}>
            {customization.map((feature) => (
              <article key={feature.kind}>
                <div className={styles.cardCopy}>

                  <h3 className="type-content-title">{feature.title}</h3>
                  <p className="site-body-sm">{feature.body}</p>
                </div>
                <MarketingVisual kind={feature.kind} />
              </article>
            ))}
            <article className={styles.wideCard}>
              <div className={styles.cardCopy}>

                <h3 className="type-subsection-title">
                  지금 가진 기기로,
                  <br />
                  어디서든 메뉴판을 열어보세요
                </h3>
                <p className="site-body-sm">
                  웹 링크 하나로 PC와 태블릿, 스마트폰에 연결합니다.
                </p>
              </div>
              <MarketingVisual kind="devices" />
            </article>
          </div>
        </div>
      </section>
      <section className={styles.capabilities}>
        <div className="site-container">
          <div className={styles.sectionHeading}>

            <h2 className="type-section-title">
              메뉴판이 할 수 있는 일,
              <br />
              조금 더 넓게
            </h2>
            <p className="site-body text-zinc-500">
              손님의 선택은 편하게, 메뉴 관리는 간결하게.
            </p>
          </div>
          <div className={styles.capabilityGrid}>
            {capabilities.map((feature) => (
              <article key={feature.kind}>
                <MarketingVisual kind={feature.kind} />
                <div className={styles.cardCopy}>

                  <h3 className="type-content-title">{feature.title}</h3>
                  <p className="site-body-sm">{feature.body}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className={styles.pricing} aria-labelledby="pricing-heading">
        <div className="site-container">
          <div className={styles.sectionHeading}>

            <h2 id="pricing-heading" className="type-section-title">
              고르고, 만들고,
              <br />
              바로 보여주세요
            </h2>
            <p className="site-body text-zinc-500">
              메뉴의 구성과 사용할 화면에 맞는 플랜을 선택하세요.
            </p>
          </div>
          <div className={styles.priceGrid}>
            {(["basic", "dining", "display"] as const).map((service, i) => (
              <article key={service}>

                <h3 className="type-subsection-title">
                  {serviceCopy[service].name}
                </h3>
                <p className="site-body-sm">
                  {
                    [
                      "한 장에 담는 매장 메뉴",
                      "커버와 여러 페이지로 전하는 메뉴",
                      "매장의 큰 화면을 위한 메뉴보드",
                    ][i]
                  }
                </p>
                {service === "display" ? (
                  <div className={styles.planPrice}>준비 중</div>
                ) : (
                  <div className={styles.planPrice}>
                    <small>월</small>
                    <strong>
                      {(service === "basic"
                        ? templateSubscriptionPricing.singlePage
                            .earlyBirdMonthly
                        : templateSubscriptionPricing.multiPage.earlyBirdMonthly
                      ).toLocaleString("ko-KR")}
                    </strong>
                    <small>원</small>
                  </div>
                )}
                {service !== "display" ? (
                  <p className={styles.priceNote}>
                    얼리버드 · 정상가 월{" "}
                    {(service === "basic"
                      ? templateSubscriptionPricing.singlePage.regularMonthly
                      : templateSubscriptionPricing.multiPage.regularMonthly
                    ).toLocaleString("ko-KR")}
                    원 · 부가세 포함
                  </p>
                ) : (
                  <p className={styles.priceNote}>
                    신규 신청은 정식 공개 후 안내합니다.
                  </p>
                )}
                <Link
                  href={`/services/${service}`}
                  className={buttonVariants({ variant: "outline", size: "lg" })}
                >
                  플랜 알아보기
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
                {service !== "display" ? (
                  <Link
                    href="/apply"
                    className={buttonVariants({ size: "lg" })}
                  >
                    이 플랜으로 시작
                  </Link>
                ) : (
                  <span className={styles.disabledAction} aria-disabled="true">
                    신청 준비 중
                  </span>
                )}
              </article>
            ))}
          </div>
          <div className={styles.centerAction}>
            <Link href="/apply" className={buttonVariants({ size: "lg" })}>
              나만의 메뉴판 시작하기
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
