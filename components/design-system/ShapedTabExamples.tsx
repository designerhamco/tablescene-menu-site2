import { PanelsTopLeft, Rows3 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import HintBubble from "@/components/ui/HintBubble";
import styles from "./SiteComponentGallery.module.css";

function ExampleContent({ standard = false }: { standard?: boolean }) {
  return <div className={styles.shapedContent}>
    <div className={styles.shapedRow}><span className={styles.shapedIcon}>{standard ? <Rows3 aria-hidden="true" size={22} /> : <PanelsTopLeft aria-hidden="true" size={22} />}</span><div><h3 className="type-item-title">{standard ? "우리 매장에 맞게 직접 꾸미기" : "완성된 디자인으로 시작하기"}</h3><p className="type-body-sm mt-1 text-zinc-600">{standard ? "레이아웃을 고르고 색상과 서체를 설정해 보세요." : "스타일을 고르고 매장의 메뉴와 사진을 담아보세요."}</p></div></div>
    <p className="type-body-sm text-zinc-600">선택한 항목의 내용이 같은 영역 안에서 자연스럽게 이어집니다.</p>
  </div>;
}

export default function ShapedTabExamples() {
  return <section className={styles.section} id="shaped-tabs" aria-labelledby="shaped-tabs-title">
    <div className={styles.heading}><h2 className="type-section-title" id="shaped-tabs-title">영역 안에서 전환하는 탭</h2><p className="type-body text-zinc-600">하나의 작업·목록 영역 안에서 내용을 바꿀 때 사용하는 공식 영역형 탭입니다. 상위 서비스 탐색과 실제 페이지의 기존 탭은 각자의 역할과 디자인을 유지합니다.</p></div>
    <div><HintBubble>처음이라면 여기부터</HintBubble><p className="type-body-sm mt-4 text-zinc-600">상시 안내 말풍선은 공통 브랜드 색과 작은 안내 글자를 사용합니다. 추가 조작 없이 읽을 수 있으며 설명할 버튼과 연결합니다.</p></div>
    <div className={styles.shapedExample}>
      <div className={styles.heading}><h3 className="type-content-title">영역형 탭</h3><p className="type-body-sm text-zinc-600">사각형 버튼을 하나의 줄로 연결하고 바깥 네 모서리만 8px로 둥글립니다. 선택은 검정 바탕과 흰 글자, 비선택은 흰 바탕과 중성 회색 글자로 구분합니다.</p></div>
      <Tabs purpose="section" defaultValue="designer"><TabsList size="sm" aria-label="영역형 디자인 탭 예시"><TabsTrigger value="designer">디자인 템플릿</TabsTrigger><TabsTrigger value="standard">기본 템플릿</TabsTrigger><TabsTrigger value="unavailable" disabled>준비 중</TabsTrigger></TabsList><TabsContent value="designer"><ExampleContent /></TabsContent><TabsContent value="standard"><ExampleContent standard /></TabsContent></Tabs>
    </div>
    <p className="type-body-sm text-zinc-600">영역형은 독립 콘텐츠를 전환하는 역할에 사용합니다. 일반 md는 높이52px·상하12px·좌우24px, 밀집 sm은 높이44px로 여유를 확보합니다. 버튼 경계는 한 줄로 공유하며 콘텐츠까지 이어지는 긴 기준선은 넣지 않습니다. 업종 필터에는 작은 필터 버튼을 사용하며, Tab과 방향키·Home·End로 조작할 수 있습니다.</p>
  </section>;
}
