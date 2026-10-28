"use client";

import { useState } from "react";
import { BookOpen, Plus, Sparkles } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import styles from "./SiteComponentGallery.module.css";

const states = [
  ["default", "기본"], ["hover", "Hover"], ["pressed", "누르는 중"], ["focus", "키보드 포커스"], ["disabled", "비활성"],
] as const;
const actions = [
  ["default", "저장"], ["outline", "미리보기"], ["secondary", "초기화"],
  ["ghost", "도구"], ["destructive", "삭제"], ["outline-danger", "삭제 요청"], ["ai", "AI 상담"], ["link", "자세히"], ["danger-ghost", "제거 도구"], ["kakao", "카카오 로그인"],
] as const;

/** State previews share selectors with the actual pseudo states; they have no private palette. */
export default function ControlStateExamples() {
  const [clicks, setClicks] = useState(0);
  const [previewDevice, setPreviewDevice] = useState("태블릿");
  return <section className={styles.section} aria-labelledby="control-states-title">
    <div className={styles.heading}><h2 className="type-section-title" id="control-states-title">버튼·탭 공통 기준과 상태</h2>
      <p className="type-body text-zinc-600">밀집 도구 32px, 일반 실행 40px, 헤더 44px, 로그인·결제 같은 주요 완료 행동 48px을 사용합니다. 본문 버튼은 8px 모서리와 15px·600 글자를 공유합니다.</p>
    </div>
    <div className={styles.buttonRow}>
      <Button onClick={() => setClicks(n => n + 1)}><Plus />동작 확인</Button>
      <Button variant="outline" size="compact">밀집 도구 32px</Button><Button size="lg">주요 완료 48px</Button>
      <Button variant="outline"><BookOpen />사용가이드</Button><Button variant="ai"><Sparkles />AI 상담</Button>
      <Button size="icon" variant="ghost" aria-label="추가 도구"><Plus /></Button>
    </div>
    <p className="type-body-sm text-zinc-600" role="status">동작 확인 {clicks}회 · Tab으로 포커스하고 Enter·Space로 실행해 보세요.</p>
    <div className={styles.usageTable}><table aria-label="버튼 상태 기준"><thead><tr><th scope="col">역할</th>{states.map(([key,label]) => <th scope="col" key={key}>{label}</th>)}</tr></thead>
      <tbody>{actions.map(([variant,label]) => <tr key={variant}><th scope="row">{label}</th>{states.map(([state,stateLabel]) => <td key={state}>
        <Button variant={variant} disabled={state === "disabled"} data-ui-state={state === "default" || state === "disabled" ? undefined : state} aria-label={`${label} ${stateLabel} 예시`}>{label}</Button>
      </td>)}</tr>)}</tbody></table></div>
    <p className="type-body-sm text-zinc-600">상태 표는 실제 공통 스타일을 고정해 비교합니다. 비활성 버튼은 무테의 가장 옅은 회색 표면과 흐린 문구를 사용하며 hover·클릭 색상으로 바뀌지 않습니다. 고객지원 퀵 버튼은 56px의 둥근 정사각형이며 원형 도구와 구분합니다.</p>
    <div className={styles.ruleGrid}>{([
      ["underline", "2 · 주요 분류", "밑줄 탭 · 4px 선택선"],
      ["area", "4 · 영역 내부 기본", "흰 콘텐츠 면 · 상단 연결 탭"],
    ] as const).map(([variant,title,description]) => <div key={variant} className="min-w-0">
      <h3 className="type-content-title mb-2">{title}</h3><p className="type-caption mb-4 text-zinc-600">{description}</p>
      <Tabs variant={variant} defaultValue="first"><TabsList aria-label={`${title} 동작 예시`}>
        <TabsTrigger value="first">첫 번째</TabsTrigger><TabsTrigger value="second">두 번째</TabsTrigger><TabsTrigger value="unavailable" disabled>준비 중</TabsTrigger>
      </TabsList><TabsContent value="first" className="type-body-sm">첫 번째 내용</TabsContent><TabsContent value="second" className="type-body-sm">두 번째 내용</TabsContent></Tabs>
    </div>)}</div>
    <p className="type-body-sm text-zinc-600">아래 표는 위계 선택표가 아니라 각 공통 변형의 상태 회귀 비교표입니다. 실제 화면에서는 위의 탭 위계 순서로 먼저 형태를 정합니다.</p>
    <div className={styles.usageTable}><table aria-label="탭 상태 기준"><thead><tr><th scope="col">종류</th>{states.map(([key,label]) => <th scope="col" key={key}>{label}</th>)}</tr></thead>
      <tbody>{(["underline", "area", "outline", "segmented"] as const).map(variant => <tr key={variant}><th scope="row">{{underline:"밑줄",area:"영역형",outline:"보기 전환",segmented:"세그먼트"}[variant]}</th>{states.map(([state,stateLabel]) => <td key={state}><Tabs variant={variant} defaultValue="selected"><TabsList aria-label={`${variant} ${stateLabel} 예시`}>
        <TabsTrigger value="selected" data-ui-state={state === "default" || state === "disabled" ? undefined : state} disabled={state === "disabled"}>선택</TabsTrigger>
      </TabsList><TabsContent value="selected" className="sr-only" tabIndex={-1}>상태 예시</TabsContent></Tabs></td>)}</tr>)}</tbody></table></div>
    <div className={styles.inverseToolbar} role="group" aria-label="미리보기 도구 스타일 예시">{["태블릿","PC","모바일"].map(label => <button key={label} type="button" className="site-preview-control" aria-pressed={previewDevice === label} onClick={() => setPreviewDevice(label)}>{label}</button>)}<button type="button" className="site-preview-control" disabled>준비 중</button></div>
    <div className="site-filter-group" role="group" aria-label="하위 필터 예시"><button type="button" className="site-filter" aria-pressed>전체</button><button type="button" className="site-filter" aria-pressed={false}>카페</button><button type="button" className="site-filter" disabled>준비 중</button></div>
  </section>;
}
