/* eslint-disable @next/next/no-img-element -- Existing renderer captures retain their exact aspect ratios. */
import MarketingCopyReveal from "./MarketingCopyReveal";
import styles from "./ServiceStackStory.module.css";

const services = [
  {
    key: "basic", name: "베이직", english: "BASIC",
    body: "시그니처부터 오늘의 혜택까지, 한 장에 담는 우리 매장의 메뉴판.",
    image: { src: "/assets/device-platform-v2/menu-monitor.webp", width: 1280, height: 722, alt: "리얼 맛차 베이직 메뉴판의 전체 메뉴" },
  },
  {
    key: "dining", name: "다이닝", english: "DINING",
    body: "커버부터 코스와 음료까지, 여러 장으로 이어지는 다이닝 메뉴판.",
    image: { src: "/assets/service-stack-v1/dining-course.webp", width: 1280, height: 800, alt: "오브 테이블의 시그니처 코스 메뉴 페이지" },
  },
  {
    key: "display", name: "디스플레이", english: "DISPLAY",
    body: "매장의 TV와 모니터에 메뉴와 프로모션을 크게 보여주는 메뉴판.",
    image: { src: "/assets/service-stack-v1/display-menu.webp", width: 1280, height: 720, alt: "썸머 블루 디스플레이의 전체 메뉴 화면" },
  },
] as const;

/** Each opaque sticky section is covered by the next section in normal scroll order. */
export default function ServiceStackStory() {
  return <div id="service-stories" className={styles.stack} data-service-stack>
    {services.map((service, index) => <section key={service.key} id={`service-${service.key}`} className={styles.panel} data-service-panel={service.key} aria-labelledby={`service-${service.key}-heading`}>
      <div className={`site-marketing-container ${styles.layout}`}>
        <MarketingCopyReveal className={`site-stack-content ${styles.copy}`}>
          <div className={styles.identity}>
            <p className="type-caption">0{index + 1} / ARTIMENU {service.english}</p>
          </div>
          <div className="site-stack-title">
            <h2 id={`service-${service.key}-heading`} className="type-section-title">{service.name}</h2>
            <p className={`type-body ${styles.description}`}>{service.body}</p>
          </div>
        </MarketingCopyReveal>
        <div className={styles.composition} data-service-artwork>
          <img className={styles.screen} src={service.image.src} width={service.image.width} height={service.image.height} alt={service.image.alt} loading="lazy" decoding="async"/>
        </div>
      </div>
    </section>)}
  </div>;
}
