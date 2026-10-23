import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Bell, ImageIcon, LayoutPanelTop, Megaphone, PanelsTopLeft, ShoppingBag, Tags, Timer } from "lucide-react";

import { DETAIL_FEATURES, getDetailFeaturePresentation, getDetailFeatureSlides } from "@/lib/template-detail-features";
import type { PublicTemplateDetail } from "@/lib/template-details";
import TemplateFeatureAccordion from "./TemplateFeatureAccordion";
import styles from "./template-detail.module.css";

const icons = [PanelsTopLeft, ImageIcon, Tags, Timer, LayoutPanelTop, Megaphone, Bell, ShoppingBag];

export default function TemplateDetailStory({ template }: { template: PublicTemplateDetail }) {
  const { info, album, supported } = getDetailFeaturePresentation(template);
  return <div className={styles.story} data-template-story="">
    <section className={styles.overview} aria-labelledby="template-overview-title">
      <div className={styles.heroImage}>
        <Image src={info.image} alt={`${template.name} 메뉴판 전체 구성`} width={1200} height={900} loading="eager" sizes="(min-width: 1600px) 1000px, (min-width: 768px) 63vw, 100vw" />
      </div>
      <div className={styles.overviewCopy}>
        <h2 id="template-overview-title" className="type-section-title">메뉴판 하나에, 매일 필요한 기능을 담았어요</h2>
        <p className={`type-body ${styles.description}`}>메뉴 소개부터 손님의 요청까지. 디자인별로 사용할 수 있는 기능을 확인해보세요.</p>
      </div>
      <ul className={styles.featureGrid} aria-label="메뉴판 핵심 기능 8가지">
        {DETAIL_FEATURES.map((feature, index) => {
          const Icon = icons[index];
          return <li key={feature.id}><a href={`#feature-${feature.id}`} className={`site-card-surface site-card-interactive ${styles.featureCard}`} data-feature-card={feature.id}>
            <Icon size={24} strokeWidth={1.5} aria-hidden="true" />
            <h3 className="type-content-title">{feature.label}</h3>
            <p className="type-body-sm">{feature.summary}</p>
          </a></li>;
        })}
      </ul>
      <div className={styles.guideAction}>
        <Link href="/guides?plan=basic" target="_blank" rel="noopener noreferrer" className="site-button site-button-primary" aria-label="사용 방법 (새 창)">사용 방법 <ArrowUpRight size={16} aria-hidden="true" /></Link>
      </div>
    </section>
    {DETAIL_FEATURES.map(feature => <section key={feature.id} id={`feature-${feature.id}`} className={styles.storySection} aria-labelledby={`feature-${feature.id}-title`} data-feature-section={feature.id}>
      <header className={styles.sectionCopy}>
        <h2 id={`feature-${feature.id}-title`} className="type-section-title">{feature.id === "prices" && info.multiPage ? "같은 상품의 여러 구성도, 가격 옵션으로" : feature.title}</h2>
        <p className={`type-body ${styles.description}`}>{feature.id === "prices" && info.multiPage ? "잔과 보틀, 작은 사이즈와 큰 사이즈까지 상품별로 안내하세요." : feature.description}</p>
      </header>
      <TemplateFeatureAccordion feature={feature.id} label={feature.label} slides={getDetailFeatureSlides(feature, { album, multiPage: info.multiPage })} />
      {!supported[feature.id] && <p className={`type-body-sm ${styles.featureNote}`}>{info.display ? feature.id === "call" || feature.id === "order" ? "디스플레이에서는 호출·주문을 제공하지 않습니다. 베이직·다이닝의 공통 기능 안내입니다." : "베이직·다이닝의 공통 기능 안내입니다. 디스플레이의 구성은 실제 미리보기에서 확인해보세요." : feature.id === "prices" && album && !info.multiPage ? "베이직 앨범형에서는 가격 옵션 열을 제공하지 않습니다. 베이직 리스트형의 기능 안내입니다." : "선택한 디자인에서는 이 기능을 제공하지 않습니다. 베이직 메뉴판의 공통 기능 안내입니다."}</p>}
      {(feature.id === "call" || feature.id === "order") && supported[feature.id] ? <p className={`type-caption ${styles.featureNote}`}>이용 가능한 매장에서 테이블 설정 후 사용할 수 있습니다.</p> : null}
    </section>)}
  </div>;
}
