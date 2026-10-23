import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Bell, Check, Globe2, ImageIcon, LayoutGrid, Monitor, Palette, QrCode, ShoppingBag, Smartphone, Tag } from "lucide-react";
import type { ReactNode } from "react";

import { getTemplateDetailInfo } from "@/lib/template-details";
import type { PublicTemplateDetail } from "@/lib/template-details";
import styles from "./template-detail.module.css";

function StorySection({ number, title, description, children }: { number: string; title: string; description: string; children: ReactNode }) {
  return <section className={styles.storySection}>
    {children}
    <div className={styles.sectionCopy}>
      <span className={`type-caption ${styles.sectionNumber}`}>{number}</span>
      <h2 className="type-section-title">{title}</h2>
      <p className={`type-body ${styles.description}`}>{description}</p>
    </div>
  </section>;
}

export default function TemplateDetailStory({ template }: { template: PublicTemplateDetail }) {
  const info = getTemplateDetailInfo(template);
  const summary = [
    { icon: Palette, title: "브랜드에 맞는 디자인", text: "로고, 글꼴, 색상을 바꿔 우리 매장의 분위기를 담으세요." },
    { icon: LayoutGrid, title: "간편한 메뉴 관리", text: "메뉴명과 가격, 사진부터 품절 표시까지 직접 관리하세요." },
    { icon: Globe2, title: "다국어 메뉴 안내", text: "한국어·영어·중국어·일본어로 메뉴를 안내하세요." },
    { icon: Tag, title: "할인과 타임세일", text: "할인 가격과 운영 시간을 설정해 프로모션을 알리세요." },
  ];

  return <div className={styles.story}>
    <section className={styles.overview} aria-labelledby="template-overview-title">
      <div className={styles.heroImage}>
        <Image src={info.image} alt={`${template.name} 메뉴판 전체 구성`} width={1200} height={900} loading="eager" sizes="(min-width: 1600px) 1000px, (min-width: 768px) 63vw, 100vw" />
      </div>
      <div className={styles.overviewCopy}>
        <p className={`type-caption ${styles.eyebrow}`}>DESIGN & FUNCTION</p>
        <h2 id="template-overview-title" className="type-section-title">좋은 디자인에, 매일 쓰는 기능까지</h2>
        <p className={`type-body ${styles.description}`}>처음 만드는 메뉴판도 어렵지 않게. 완성된 디자인에 매장 정보를 채우고, 필요한 순간 직접 바꾸세요.</p>
      </div>
      <ol className={styles.featureSummary}>
        {summary.map(({ icon: Icon, title, text }, index) => <li key={title}>
          <div className={styles.featureTop}><span className="type-caption">0{index + 1}</span><Icon size={20} strokeWidth={1.6} aria-hidden="true" /></div>
          <h3 className="type-content-title">{title}</h3>
          <p className="type-body-sm">{text}</p>
        </li>)}
      </ol>
    </section>

    <StorySection number="01 / CUSTOMIZE" title="우리 매장의 취향을 담은 메뉴판" description="템플릿의 완성도는 그대로, 로고와 글꼴·색상은 매장에 맞게. 메뉴판의 분위기를 직접 완성할 수 있습니다.">
      <div className={`${styles.visual} ${styles.designVisual}`} role="img" aria-label="실제 템플릿 디자인과 글꼴 및 색상 편집 예시">
        <div className={styles.designScreenshot}><Image src={info.image} alt="" width={1200} height={900} sizes="(min-width: 768px) 50vw, 85vw" /></div>
        <div className={styles.designTools}>
          <div className={styles.mockHeading}><Palette size={18} /><span>디자인 설정</span></div>
          <span className={styles.mockLabel}>매장 이름</span><strong className={styles.sampleBrand}>{template.name}</strong>
          <div className={styles.toolRow}><span>글꼴</span><span>Pretendard <Check size={13} /></span></div>
          <span className={styles.mockLabel}>브랜드 컬러</span>
          <div className={styles.swatches}>{["#263a2f", "#713f36", "#ed702d", "#233d7d", "#15181e"].map(color => <span key={color} style={{ background: color }} />)}</div>
        </div>
        <span className={styles.visualCaption}>디자인 편집 예시</span>
      </div>
    </StorySection>

    <StorySection number="02 / MENU MANAGEMENT" title="메뉴와 가격, 바뀌는 순간 간편하게" description="새 메뉴를 추가하고, 가격과 설명을 수정하고, 품절 상태까지 관리하세요. 종이 메뉴판을 다시 만들 필요 없이 같은 주소에서 최신 메뉴를 안내할 수 있습니다.">
      <div className={`${styles.visual} ${styles.editorVisual}`} role="img" aria-label="메뉴명과 가격, 설명, 품절 상태를 관리하는 편집 화면 예시">
        <div className={styles.editorMock}>
          <div className={styles.mockHeading}><LayoutGrid size={18} /><span>메뉴 관리</span><span className={styles.saved}><Check size={13} /> 저장 완료</span></div>
          <div className={styles.editorFields}><span className={styles.mockLabel}>메뉴 이름</span><div className={styles.mockInput}>시그니처 라떼</div><span className={styles.mockLabel}>가격</span><div className={styles.mockInput}>5,800 <span>원</span></div><span className={styles.mockLabel}>메뉴 설명</span><div className={styles.mockInput}>부드러운 우유와 진한 에스프레소</div></div>
          <div className={styles.menuRow}><span>시그니처 라떼</span><strong>5,800</strong></div>
          <div className={styles.menuRow}><span>클래식 디저트 <span className={styles.soldOut}>품절</span></span><strong>6,500</strong></div>
        </div>
        <span className={styles.visualCaption}>메뉴 편집 예시</span>
      </div>
    </StorySection>

    <StorySection number="03 / SHARE & LANGUAGE" title={info.display ? "큰 화면에서도 선명하게" : "QR로 열고, 익숙한 언어로 읽고"} description={info.display ? "TV와 모니터에 메뉴판을 띄워 매장의 메뉴를 한눈에 보여주세요. 이미지와 동영상으로 신메뉴와 프로모션도 함께 소개할 수 있습니다." : "손님은 QR을 스캔하거나 링크를 열어 메뉴를 확인합니다. 한국어·영어·중국어·일본어 메뉴를 준비해 외국인 손님에게도 편하게 안내하세요."}>
      <div className={`${styles.visual} ${styles.deviceVisual}`}>
        <div className={styles.deviceLabels}><span><Globe2 size={16} /> {info.display ? "매장 디스플레이" : "하나의 링크, 다양한 손님"}</span><span className="type-caption">{info.display ? "DISPLAY" : "QR MENU"}</span></div>
        <div className={styles.deviceComposition}>
          <div className={styles.screenMock}><Image src={info.image} alt={`${template.name} ${info.display ? "디스플레이" : "태블릿"} 화면 예시`} width={1200} height={900} sizes="(min-width: 768px) 45vw, 75vw" /></div>
          <div className={styles.qrCard}>{info.display ? <Monitor size={36} strokeWidth={1.2} aria-hidden="true" /> : <QrCode size={40} strokeWidth={1.2} aria-hidden="true" />}<strong>{info.display ? "매장의 큰 화면으로" : "메뉴를 만나보세요"}</strong><span>{info.display ? "TV · 모니터" : "QR · 링크 공유"}</span></div>
        </div>
        <div className={styles.languages} aria-label="지원 언어"><span>한국어</span><span>English</span><span>中文</span><span>日本語</span></div>
      </div>
    </StorySection>

    <StorySection number="04 / MORE POSSIBILITIES" title={info.multiPage ? "코스부터 단품까지, 페이지로 정돈" : info.display ? "이미지와 영상으로 더 생생한 소개" : "할인도 소식도, 메뉴판 안에 함께"} description={info.multiPage ? "커버와 메뉴 페이지를 나눠 매장의 흐름에 맞게 구성하세요. 코스 메뉴와 단품 메뉴, 음료 리스트를 각각의 페이지로 안내할 수 있습니다." : info.display ? "메뉴 화면과 프로모션 화면을 함께 구성하세요. 신메뉴 사진과 홍보 영상을 활용해 매장의 소식을 전달할 수 있습니다." : "할인 가격과 타임세일을 설정하고, 이미지·텍스트 위젯으로 매장 소식도 더하세요. 필요한 안내를 메뉴와 같은 공간에서 전할 수 있습니다."}>
      <div className={`${styles.visual} ${styles.extraVisual}`} role="img" aria-label={info.multiPage ? "커버, 코스와 단품 메뉴 페이지 구성 예시" : info.display ? "이미지와 동영상 프로모션 구성 예시" : "할인 가격과 매장 소식 위젯 구성 예시"}>
        {info.multiPage ? <div className={styles.pageStack}>{["The Menu", "Signature Course", "À La Carte"].map((label, i) => <div key={label}><span>0{i + 1}</span><strong>{label}</strong><div className={styles.mockLines} /><div className={styles.mockLines} /></div>)}</div> : <div className={styles.promotionMock}>
          <div className={styles.promoHeader}>{info.display ? <ImageIcon size={20} /> : <Tag size={20} />}<span>{info.display ? "PROMOTION" : "TIME SALE"}</span></div>
          <strong>{info.display ? "새로운 메뉴를 만나는 시간" : "오후의 작은 즐거움"}</strong><p>{info.display ? "사진과 영상으로 전하는 매장 이야기" : "평일 오후 2시부터 5시까지"}</p>
          <div className={styles.promoPrice}>{info.display ? "IMAGE + VIDEO" : <><del>6,500</del><span>5,500<span>원</span></span></>}</div>
          <div className={styles.widgetMock}><span>{info.display ? "매장 프로모션" : "매장 소식"}</span><span>{info.display ? "신메뉴를 소개합니다" : "오늘의 추천 메뉴를 확인하세요"}<ArrowRight size={16} /></span></div>
        </div>}
        <span className={styles.visualCaption}>기능 활용 예시</span>
      </div>
    </StorySection>

    {info.features.smartCall && info.features.order ? <StorySection number="05 / TABLE SERVICE" title="테이블에서 바로, 호출과 후불 주문" description="테이블 QR로 메뉴판을 연 손님이 필요한 요청과 주문을 보낼 수 있습니다. 호출·후불 주문은 이용 가능한 매장에 한해 제공되며, 이용 가능 여부 확인과 매장 설정이 필요합니다.">
      <div className={`${styles.visual} ${styles.callVisual}`} role="img" aria-label="테이블 QR에서 직원 호출과 후불 주문을 이용하는 화면 예시">
        <div className={styles.callMock}>
          <div className={styles.mockHeading}><Bell size={18} /><span>직원 호출</span><span className={styles.saved}>Table 1</span></div>
          <strong className="type-content-title">무엇을 도와드릴까요?</strong>
          <div className={styles.callOptions}>{["직원 호출", "물 요청", "냅킨 요청", "식기 요청"].map((label, index) => <span key={label} data-selected={index === 0}>{label}</span>)}</div>
          <div className={styles.callAction}>요청 보내기</div>
        </div>
        <div className={styles.orderMock}>
          <div className={styles.mockHeading}><ShoppingBag size={18} /><span>주문 내역</span></div>
          <div className={styles.menuRow}><span>시그니처 메뉴 <small>1개</small></span><strong>5,800원</strong></div>
          <div className={styles.callAction}>후불로 주문하기</div>
          <p>결제는 매장에서 진행합니다.</p>
        </div>
        <span className={styles.visualCaption}>호출·주문 화면 예시 · 이용 매장에 한해 제공</span>
      </div>
    </StorySection> : null}

    <section className={styles.usage} aria-labelledby="template-usage-title">
      <h2 id="template-usage-title" className="type-section-title">시작은 간단하게</h2>
      <ol>{[
        ["디자인 선택", "미리보기에서 매장에 어울리는 구성을 확인하세요."],
        ["매장 정보 입력", "메뉴와 가격을 채우고 브랜드 디자인을 설정하세요."],
        [info.display ? "화면에 표시" : "메뉴판 공유", info.display ? "매장의 TV나 모니터에 메뉴판을 열어 주세요." : "완성한 메뉴판 링크와 QR을 손님에게 공유하세요."],
      ].map(([title, text], index) => <li key={title}><span className={styles.stepNumber}>0{index + 1}</span><div><h3 className="type-content-title">{title}</h3><p className="type-body-sm">{text}</p></div></li>)}</ol>
      <div className={styles.usageNote}><Smartphone size={18} aria-hidden="true" /><p className="type-body-sm">이미지는 기능을 설명하기 위한 예시입니다. 실제 메뉴판은 입력한 콘텐츠와 기기에 따라 달라집니다.</p></div>
      <Link href={info.previewHref} target="_blank" rel="noopener noreferrer" className="site-button site-button-outline">실제 메뉴판 미리보기 <ArrowRight size={16} aria-hidden="true" /></Link>
    </section>
  </div>;
}
