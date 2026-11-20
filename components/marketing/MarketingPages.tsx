import Image from "next/image";
import { MARKETING_SERVICE_FEATURES as features } from "@/lib/marketing-service-features";
import SitePageHeader from "@/components/layout/SitePageHeader";
import Link from "next/link";
import { ArrowRight } from "@/app/components/ui/site-arrow";
import { buttonVariants } from "@/app/components/ui/button";
import OfficialSiteNavbar from "@/components/layout/OfficialSiteNavbar";
import Footer from "@/app/components/layout/Footer";
import TabletTemplateCarousel from "@/app/components/home/TabletTemplateCarousel";
import { templateSubscriptionPricing } from "@/lib/template-subscription-pricing";
import MarketingVisual, { type VisualKind } from "./MarketingVisual";
import UsageGuides from "./UsageGuides";
import styles from "./marketing.module.css";
import HomeHeroMotion from "./HomeHeroMotion";
import DevicePlatformStory from "./DevicePlatformStory";
import MarketingCopyReveal from "./MarketingCopyReveal";
import ServiceStackStory from "./ServiceStackStory";
import ServiceHomeLink from "@/components/layout/ServiceHomeLink";
import { SERVICE_HOME_HREFS } from "@/lib/service-home-navigation";
import MarketingOperationsVisual, { type OperationsVisualKind } from "./MarketingOperationsVisual";

type Service = "basic" | "dining" | "display";
type Feature = { kind: VisualKind; label: string; title: string; body: string };

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

export function MarketingShell({ children, surface = "default" }: { children: React.ReactNode; surface?: "default" | "dining" }) {
  return (
    <div className={styles.shell} data-surface={surface}>
      <OfficialSiteNavbar />
      <main>{children}</main>
      <Footer />
    </div>
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
      <div className="site-marketing-container">
        <div className={styles.sectionHeading}>

          <h2 id="showcase-heading" className="type-section-title">
            같은 메뉴도,
            <br />
            매장답게 보이도록
          </h2>
          <p className="type-body-lg">
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
      className={`site-marketing-page ${styles.page} ${dark ? styles.darkPage : ""}`}
      data-service-page={service}
    >
      <section className={styles.hero}>
        <div className="site-marketing-container">
          <SitePageHeader title={copy.title} descriptionPurpose="content" description={copy.body} />
          {service !== "basic" ? <div className={styles.serviceIntroAction}>
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
          </div> : null}
          <div
            className={`${styles.heroImage} ${dark ? styles.diningHeroImage : ""}`}
          >
            <Image
              src={copy.image}
              alt={copy.alt}
              width={1536}
              height={864}
              sizes="(min-width: 1920px) calc(100vw - 96px), (min-width: 1334px) calc(100vw - 80px), 94vw"
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
        <div className="site-marketing-container">
          <div className={styles.sectionHeading}>
            <h2 id="feature-heading" className="type-section-title">
              {copy.section}
            </h2>
            <p className="type-body-lg">
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
                  <h3 className="type-section-title" data-marketing-story-title>{feature.title}</h3>
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
          <div className="site-marketing-container">
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
  const operations: { kind: OperationsVisualKind; title: string; body: string }[] = [
    {
      kind: "tables",
      title: "테이블과 키오스크를 한눈에",
      body: "룸별로 테이블과 키오스크를 등록하고, 목록과 배치도로 운영 공간을 정리하세요.",
    },
    {
      kind: "orders",
      title: "들어온 주문부터 진행 상태까지",
      body: "연결된 메뉴판의 주문을 테이블별로 확인하고, 진행 상태를 관리하세요.",
    },
    {
      kind: "calls",
      title: "손님의 요청을 놓치지 않도록",
      body: "어느 테이블에서 무엇을 요청했는지 확인하고, 호출 처리 상태를 관리하세요.",
    },
    {
      kind: "staff",
      title: "함께 일하는 직원에게 필요한 권한만",
      body: "직원을 초대하고 메뉴판별로 필요한 관리·운영 권한을 나누어 주세요.",
    },
  ];
  const capabilities: Feature[] = [
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
    <div className={`site-marketing-page ${styles.page}`} data-marketing-page="home">
      <HomeHeroMotion />
      <div className={styles.presentationSequence}>
        <DevicePlatformStory />
        <ServiceStackStory />
      </div>
      <section className={styles.homeFeatures} id="home-operations" data-home-section="operations">
        <div className="site-marketing-container">
          <MarketingCopyReveal className={styles.sectionHeading}>

            <h2 id="home-operations-heading" tabIndex={-1} className="type-section-title">
              매장 운영도,
              <br />
              한눈에 정리되도록
            </h2>
            <p className="type-body-lg text-zinc-500">
              테이블과 키오스크, 주문과 호출까지. 매장에 필요한 운영 도구를 한곳에 모았습니다.
            </p>
          </MarketingCopyReveal>
          <div className={styles.bentoGrid}>
            {operations.map((feature) => (
              <article key={feature.kind}>
                <div className={styles.cardCopy}>

                  <h3 className="type-content-title">{feature.title}</h3>
                  <p className="site-body-sm">{feature.body}</p>
                </div>
                <MarketingOperationsVisual kind={feature.kind} />
              </article>
            ))}
            <article className={styles.wideCard}>
              <div className={styles.cardCopy}>

                <h3 className="type-subsection-title">
                  여러 메뉴판의 운영도,
                  <br />
                  한곳에서 확인하세요
                </h3>
                <p className="site-body-sm">
                  권한이 있는 메뉴판의 주문과 호출을 한 화면에서 모아 확인하세요.
                </p>
              </div>
              <MarketingOperationsVisual kind="overview" />
            </article>
          </div>
        </div>
      </section>
      <section className={styles.capabilities} data-home-section="capabilities">
        <div className="site-marketing-container">
          <MarketingCopyReveal className={styles.sectionHeading}>

            <h2 className="type-section-title">
              메뉴판이 할 수 있는 일,
              <br />
              조금 더 넓게
            </h2>
            <p className="type-body-lg text-zinc-500">
              손님의 선택은 편하게, 메뉴 관리는 간결하게.
            </p>
          </MarketingCopyReveal>
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
        <div className="site-marketing-container">
          <MarketingCopyReveal className={styles.sectionHeading}>

            <h2 id="pricing-heading" className="type-section-title">
              고르고, 만들고,
              <br />
              바로 보여주세요
            </h2>
            <p className="type-body-lg text-zinc-500">
              메뉴의 구성과 사용할 화면에 맞는 플랜을 선택하세요.
            </p>
          </MarketingCopyReveal>
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
                <ServiceHomeLink
                  href={SERVICE_HOME_HREFS[service]}
                  className={buttonVariants({ variant: "outline", size: "lg" })}
                >
                  플랜 알아보기
                  <ArrowRight size={16} aria-hidden="true" />
                </ServiceHomeLink>
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
