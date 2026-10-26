import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Check, ChevronRight } from "lucide-react";

import Footer from "@/app/components/layout/Footer";
import OfficialSiteNavbar from "@/components/layout/OfficialSiteNavbar";
import TemplateDetailGallery, { TemplateDetailActions } from "@/components/templates/TemplateDetailGallery";
import TemplateDetailStory from "@/components/templates/TemplateDetailStory";
import TemplateDetailSidebar from "@/components/templates/TemplateDetailSidebar";
import styles from "@/components/templates/template-detail.module.css";
import { isDisplayCheckoutQaEnabled } from "@/lib/display-checkout-qa";
import { formatProductPrice } from "@/lib/public-product-details";
import { getPublicTemplateDetail, getTemplateDetailInfo } from "@/lib/template-details";

type Props = { params: Promise<{ templateKey: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const template = getPublicTemplateDetail((await params).templateKey);
  if (!template) notFound();
  return { title: `${template.name} 디자인 템플릿 | ArtiMenu`, description: template.description };
}

export default async function TemplateDetailPage({ params }: Props) {
  const template = getPublicTemplateDetail((await params).templateKey);
  if (!template) notFound();
  const info = getTemplateDetailInfo(template);
  const checkoutEnabled = !info.display || isDisplayCheckoutQaEnabled();
  const standard = template.categoryLabel === "기본 디자인";
  const included = ["디자인 커스터마이징", "다국어 메뉴", "할인·타임세일", info.display ? "이미지·동영상" : info.multiPage ? "커버·메뉴 페이지" : "이미지·텍스트 위젯"];

  return <>
    <OfficialSiteNavbar showQuickMenu={false} />
    <main className={styles.page}>
      <div className="site-container">
        <nav className={styles.breadcrumb} aria-label="현재 위치"><Link href={info.listHref}><ArrowLeft size={16} aria-hidden="true" />디자인 템플릿</Link><ChevronRight size={13} aria-hidden="true" /><span aria-current="page">{template.name}</span></nav>
        <div className={styles.layout}>
          <TemplateDetailSidebar
            heading={<>
              <div className={styles.sidebarHeading}><span className={`type-caption ${styles.serviceLabel}`}>{info.serviceLabel} <span> / </span> {template.categoryLabel}</span><TemplateDetailActions designId={template.key} name={template.name} /></div>
              <h1 className="type-page-title">{template.name}</h1>
              <p className={`type-page-description ${styles.templateDescription}`}>{template.description}</p>
            </>}
            gallery={<TemplateDetailGallery image={info.image} name={template.name} />}
            actions={<>
              <Link href={info.previewHref} target="_blank" rel="noopener noreferrer" className="site-button site-button-outline">미리보기 <ArrowUpRight size={17} aria-hidden="true" /></Link>
              {checkoutEnabled ? <Link href={info.startHref} className="site-button site-button-primary">이 디자인으로 시작 <ArrowUpRight size={17} aria-hidden="true" /></Link> : <button type="button" disabled className="site-button site-button-primary">디스플레이 신청 준비 중</button>}
            </>}
            note={<p className={`type-caption ${styles.billingNote}`}>{info.display ? "디스플레이는 현재 출시 준비 중입니다." : "첫 구독은 계정당 최초 1회 30일 무료체험. 결제수단 등록 후 시작하며, 체험 종료 후 매월 자동결제됩니다."}</p>}
          >
            <ul className={styles.included}>{included.map(label => <li key={label}><Check size={15} aria-hidden="true" /><span>{label}</span></li>)}</ul>
            <div className={styles.purchase}>
              <div className={styles.priceHeader}><span className="type-label">{info.formatLabel}</span><span className="type-caption">메뉴판 1개 · 월 구독</span></div>
              <div className={styles.price}><span className="type-body-sm">얼리버드</span><strong>{formatProductPrice(info.pricing.earlyBirdMonthly)}<span> / 월</span></strong><del className="type-caption">{formatProductPrice(info.pricing.regularMonthly)}</del></div>
              {!info.display && <p className="type-caption mt-3 text-zinc-600">{standard ? "같은 서비스의 기본 디자인끼리 교체할 수 있습니다." : "같은 서비스의 기본 디자인과 디자인 템플릿을 자유롭게 교체할 수 있습니다."}</p>}
            </div>
          </TemplateDetailSidebar>
          <TemplateDetailStory template={template} />
        </div>
      </div>
    </main>
    <Footer />
  </>;
}
