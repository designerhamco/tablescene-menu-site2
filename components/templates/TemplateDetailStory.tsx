import Image from "next/image";
import { ArrowUpRight, Bell, ImageIcon, Images, LayoutPanelTop, Megaphone, PanelsTopLeft, ShoppingBag, Tags, Timer } from "lucide-react";

import { DETAIL_FEATURES, getDetailFeaturePresentation } from "@/lib/template-detail-features";
import type { PublicTemplateDetail } from "@/lib/template-details";
import TemplateFeatureDemo from "./TemplateFeatureDemo";
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
        <p className={`type-body ${styles.description}`}>사진으로 메뉴를 소개하고, 가격과 혜택을 안내하고, 손님의 요청까지 받아보세요. 필요한 기능을 골라 우리 매장에 맞게 사용할 수 있습니다.</p>
      </div>
      <table className={styles.featureTable}>
        <caption className="sr-only">메뉴판 핵심 기능 8가지와 지원 안내</caption>
        <thead><tr><th scope="col">핵심 기능</th><th scope="col">이렇게 활용하세요</th></tr></thead>
        <tbody>{DETAIL_FEATURES.map((feature, index) => {
          const Icon = icons[index];
          return <tr key={feature.id}>
            <th scope="row"><a href={`#feature-${feature.id}`}><Icon size={18} strokeWidth={1.6} aria-hidden="true" /><span>{feature.label}</span></a></th>
            <td><p>{feature.summary}{feature.id === "images" && album ? " 앨범형은 1:1·4:5·5:4 비율도 고를 수 있어요." : ""}</p>{!supported[feature.id] && <span className={styles.supportNote}>{info.display ? "베이직·다이닝의 공통 기능 예시" : feature.id === "prices" && album && !info.multiPage ? "베이직 앨범형은 가격 옵션 열 제외" : "이 디자인에서는 제공하지 않는 공통 기능입니다"}</span>}</td>
          </tr>;
        })}</tbody>
      </table>
      <div className={styles.guideAction}>
        {/* 가이드 공개 후 새 창의 베이직 탭으로 연결한다. */}
        <button type="button" disabled className="site-button site-button-primary" aria-describedby="template-guide-note">사용 방법 <ArrowUpRight size={18} aria-hidden="true" /></button>
        <p id="template-guide-note" className="type-caption">사용 가이드를 준비하고 있어요.</p>
      </div>
    </section>
    {DETAIL_FEATURES.map((feature, index) => <section key={feature.id} id={`feature-${feature.id}`} className={styles.storySection} aria-labelledby={`feature-${feature.id}-title`} data-feature-section={feature.id}>
      <TemplateFeatureDemo feature={feature.id} previewHref={supported[feature.id] ? info.previewHref : "/templates/cafe_real_matcha_a/preview"} image={supported[feature.id] ? info.image : "/template-previews/cafe_real_matcha_a.jpg"} name={supported[feature.id] ? template.name : "REAL MATCHA"} steps={feature.id === "prices" && info.multiPage ? ["기본 가격", "가격 옵션 추가", "사이즈 옵션 추가", "옵션 이름 입력"] : undefined} />
      <div className={styles.sectionCopy}>
        <p className={`type-caption ${styles.sectionNumber}`}>{String(index + 1).padStart(2, "0")}<span>{feature.label}</span></p>
        <h2 id={`feature-${feature.id}-title`} className="type-section-title">{feature.title}</h2>
        <p className={`type-body ${styles.description}`}>{feature.id === "prices" && info.multiPage ? "잔과 보틀, 작은 사이즈와 큰 사이즈처럼 같은 상품의 여러 구성을 가격 옵션으로 안내하세요. 상품마다 옵션 이름과 가격을 직접 입력해 손님이 원하는 구성을 고를 수 있도록 도와줍니다." : feature.description}{feature.id === "images" && album ? " 앨범형은 사진 비율도 1:1, 4:5, 5:4 중에서 선택할 수 있습니다." : ""}</p>
        {!supported[feature.id] && <p className={`type-body-sm ${styles.featureNote}`}>{info.display ? feature.id === "call" || feature.id === "order" ? "디스플레이에서는 호출·주문을 제공하지 않습니다. 위 화면은 베이직 메뉴판의 기능 예시입니다." : "위 화면은 베이직 메뉴판의 공통 기능 예시입니다. 디스플레이의 이미지·동영상과 가격 구성은 실제 미리보기에서 확인해보세요." : feature.id === "prices" && album && !info.multiPage ? "베이직 앨범형에서는 가격 옵션 열을 제공하지 않습니다. 위 화면은 베이직 리스트형의 기능 예시입니다." : "선택한 디자인에서는 이 기능을 제공하지 않습니다. 위 화면은 베이직 메뉴판의 공통 기능 예시입니다."}</p>}
        {feature.id === "call" || feature.id === "order" ? <p className={`type-caption ${styles.featureNote}`}>이용 가능한 매장에서 테이블 설정 후 사용할 수 있습니다. 위 화면은 실제 요청이 전송되지 않는 체험 예시입니다.</p> : null}
        {feature.id === "prices" && info.multiPage ? <p className={`type-body-sm ${styles.featureNote}`}>다이닝은 상품별 가격 옵션으로 안내합니다. 예시 화면의 옵션 표시는 선택한 디자인에 맞춰 달라집니다.</p> : null}
      </div>
    </section>)}
    <p className={`type-caption ${styles.storyNote}`}><Images size={16} aria-hidden="true" />기능 화면은 사용 흐름을 보여주는 예시입니다. 실제 구성은 입력한 콘텐츠와 설정에 따라 달라집니다.</p>
  </div>;
}
