import { PanelsTopLeft, Rows3 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
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
    <div className={styles.shapedExample}>
      <div className={styles.heading}><h3 className="type-content-title">영역형 탭</h3><p className="type-body-sm text-zinc-600">위쪽이 둥근 작은 탭을 콘텐츠 경계에 붙입니다. 선택 탭과 내용은 흰색으로 이어지고, 비선택 탭만 옅은 회색으로 구분합니다.</p></div>
      <Tabs hierarchy="embedded" defaultValue="designer"><TabsList size="sm" aria-label="영역형 디자인 탭 예시"><TabsTrigger value="designer">디자인 템플릿</TabsTrigger><TabsTrigger value="standard">기본 템플릿</TabsTrigger><TabsTrigger value="unavailable" disabled>준비 중</TabsTrigger></TabsList><TabsContent value="designer"><ExampleContent /></TabsContent><TabsContent value="standard"><ExampleContent standard /></TabsContent></Tabs>
    </div>
    <p className="type-body-sm text-zinc-600">영역형은 위계 4의 소 크기를 기본으로 사용합니다. 사선·산 모양을 만들지 않고 곧은 하단선과 흰 콘텐츠 면으로 연결합니다. 업종 필터에는 작은 필터 버튼을 사용하며, Tab과 방향키·Home·End로 조작할 수 있습니다.</p>
  </section>;
}
