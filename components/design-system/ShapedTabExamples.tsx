"use client";

import { useState } from "react";
import { PanelsTopLeft, Rows3 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger, type TabsSize } from "@/app/components/ui/tabs";
import styles from "./SiteComponentGallery.module.css";

function ExampleContent({ standard = false }: { standard?: boolean }) {
  return <div className={styles.shapedContent}>
    <div className={styles.shapedRow}><span className={styles.shapedIcon}>{standard ? <Rows3 aria-hidden="true" size={22} /> : <PanelsTopLeft aria-hidden="true" size={22} />}</span><div><h3 className="type-item-title">{standard ? "우리 매장에 맞게 직접 꾸미기" : "완성된 디자인으로 시작하기"}</h3><p className="type-body-sm mt-1 text-zinc-600">{standard ? "레이아웃을 고르고 색상과 서체를 설정해 보세요." : "스타일을 고르고 매장의 메뉴와 사진을 담아보세요."}</p></div></div>
    <p className="type-body-sm text-zinc-600">선택한 탭과 이 콘텐츠 영역이 하나의 묶음으로 이어집니다.</p>
  </div>;
}

export default function ShapedTabExamples() {
  const [size, setSize] = useState<TabsSize>("md");
  return <section className={styles.section} id="shaped-tabs" aria-labelledby="shaped-tabs-title">
    <div className={styles.heading}><h2 className="type-section-title" id="shaped-tabs-title">형태로 연결하는 탭</h2><p className="type-body text-zinc-600">아래 영역과 연결되는 탭의 윤곽을 비교하는 추가 시안입니다. 상위 서비스 탐색·알림창은 기존 밑줄형을 유지하며, 실제 디자인/기본 템플릿 영역은 왼쪽에 모인 연결형을 사용합니다.</p></div>
    <div className="site-filter-group" role="group" aria-label="탭 예시 크기">{([["lg", "대 · 56px"], ["md", "중 · 48px"], ["sm", "소 · 40px"]] as const).map(([value, label]) => <button key={value} type="button" className="site-filter" aria-pressed={size === value} onClick={() => setSize(value)}>{label}</button>)}</div>
    <div className={styles.shapedGrid}>
      <div className={styles.shapedExample}>
        <div className={styles.heading}><h3 className="type-content-title">파일형 탭</h3><p className="type-body-sm text-zinc-600">사선 옆면과 둥근 모서리를 비교하는 추가 시안입니다. 상위 탐색에 기본 적용하지 않습니다.</p></div>
        <Tabs variant="folder" defaultValue="designer"><TabsList size={size} aria-label="파일형 디자인 탭 예시"><TabsTrigger value="designer">디자인 템플릿</TabsTrigger><TabsTrigger value="standard">기본 템플릿</TabsTrigger><TabsTrigger value="unavailable" disabled>준비 중</TabsTrigger></TabsList><TabsContent value="designer"><ExampleContent /></TabsContent><TabsContent value="standard"><ExampleContent standard /></TabsContent></Tabs>
      </div>
      <div className={styles.shapedExample}>
        <div className={styles.heading}><h3 className="type-content-title">라운드 연결형 탭</h3><p className="type-body-sm text-zinc-600">흰 선택면과 오목한 연결 곡선으로 알림·요약 목록을 부드럽게 묶습니다.</p></div>
        <Tabs variant="flow" defaultValue="designer"><TabsList size={size} aria-label="라운드 연결형 디자인 탭 예시"><TabsTrigger value="designer">디자인 템플릿</TabsTrigger><TabsTrigger value="standard">기본 템플릿</TabsTrigger><TabsTrigger value="unavailable" disabled>준비 중</TabsTrigger></TabsList><TabsContent value="designer"><ExampleContent /></TabsContent><TabsContent value="standard"><ExampleContent standard /></TabsContent></Tabs>
      </div>
    </div>
    <p className="type-body-sm text-zinc-600">크기는 단계에 따라 대·중·소를 고릅니다. 형태를 추가해도 기존 탐색·알림의 디자인을 바꾸지 않습니다. 업종 필터에는 작은 필터 버튼을, 같은 콘텐츠의 보기 변경에는 세그먼트를 사용합니다. Tab과 방향키·Home·End로 조작할 수 있고 준비 중 항목은 건너뜁니다.</p>
  </section>;
}
