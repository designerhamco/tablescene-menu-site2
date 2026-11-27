import SiteBreadcrumb from "@/components/layout/SiteBreadcrumb";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/app/components/ui/button";
import { Check } from "@/app/components/ui/site-icon";
import { ArrowUpRight } from "@/app/components/ui/site-arrow";

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
  const included = info.display
    ? ["매장 TV·모니터용 메뉴보드", "화면별 메뉴 페이지 구성", "이미지·동영상 콘텐츠"]
    : [info.multiPage ? "커버와 여러 페이지 메뉴 구성" : "대표 상품과 메뉴를 한 화면에", "매장에 맞춘 글꼴과 색상 설정", "할인·광고와 지원 디자인의 위젯"];

  return <>
    <OfficialSiteNavbar showSupportLauncher={false} />
    <main className={styles.page}>
      <div className="site-container">
        <div className="site-stack-title">
          <SiteBreadcrumb items={[{ label: "디자인 템플릿", href: info.listHref }, { label: template.name }]} />
          <div className={styles.layout}>
            <TemplateDetailSidebar
              heading={<>
                <div className={styles.sidebarHeading}><span className={`type-caption ${styles.serviceLabel}`}>{info.serviceLabel} <span> / </span> {template.categoryLabel}</span><TemplateDetailActions designId={template.key} name={template.name} /></div>
                <h1 className="type-page-title">{template.name}</h1>
                <p className={`type-body ${styles.templateDescription}`}>{template.description}</p>
              </>}
              gallery={<TemplateDetailGallery images={info.images} name={template.name} />}
              actions={<>
                <Link href={info.previewHref} target="_blank" rel="noopener noreferrer" className="site-button site-button-outline">미리보기 <ArrowUpRight size={17} aria-hidden="true" /></Link>
                {info.selectable ? (checkoutEnabled ? <Button asChild size="lg"><Link href={info.startHref}>이 디자인으로 시작 <ArrowUpRight size={17} aria-hidden="true" /></Link></Button> : <Button type="button" size="lg" disabled>디스플레이 신청 준비 중</Button>) : null}
              </>}
              note={info.selectable ? <p className={`type-body-sm ${styles.billingNote}`}>{info.display ? "디스플레이는 현재 출시 준비 중입니다." : "첫 구독은 계정당 최초 1회 30일 무료체험. 결제수단 등록 후 시작하며, 체험 종료 후 매월 자동결제됩니다."}</p> : null}
            >
              <ul className={`${styles.included} type-body-sm`} aria-label="상품 설명">{included.map(label => <li key={label}><Check size={15} aria-hidden="true" /><span>{label}</span></li>)}</ul>
              {info.selectable ? <div className={styles.purchase}>
                <div className={styles.priceHeader}><span className="type-plan-title">{info.formatLabel}</span><span className="type-caption">메뉴판 1개 · 월 구독</span></div>
                <div className={styles.price}><span className="type-body-sm">얼리버드</span><strong>{formatProductPrice(info.pricing.earlyBirdMonthly)}<span> / 월</span></strong><del className="type-caption">{formatProductPrice(info.pricing.regularMonthly)}</del></div>
                {!info.display && <p className="type-body-sm mt-3 text-zinc-600">같은 서비스의 모든 지원 템플릿으로 추가 요금 없이 교체할 수 있습니다.</p>}
              </div> : null}
            </TemplateDetailSidebar>
            <TemplateDetailStory template={template} />
          </div>
        </div>
      </div>
    </main>
    <Footer />
  </>;
}
