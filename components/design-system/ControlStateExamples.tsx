"use client";

import { useState } from "react";
import { BookOpen, Plus, Sparkles, Square, Trash2 } from "@/app/components/ui/site-icon";
import { Button, ButtonGroupDivider } from "@/app/components/ui/button";
import { ContentPanel } from "@/app/components/ui/content-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import IconControlExamples from "./IconControlExamples";
import styles from "./SiteComponentGallery.module.css";

const states = [
  ["default", "기본"], ["hover", "Hover"], ["pressed", "누르는 중"], ["focus", "키보드 포커스"], ["disabled", "비활성"],
] as const;
const actions = [
  ["default", "저장"], ["outline", "미리보기"], ["secondary", "초기화"],
  ["ghost", "아이콘 도구"], ["destructive", "삭제"], ["outline-danger", "삭제 요청"], ["ai", "AI 상담"], ["link", "자세히"], ["danger-ghost", "제거 아이콘"], ["kakao", "카카오 로그인"],
] as const;

/** State previews share selectors with the actual pseudo states; they have no private palette. */
export default function ControlStateExamples() {
  const [clicks, setClicks] = useState(0);
  const [previewDevice, setPreviewDevice] = useState("태블릿");
  return <section className={styles.section} aria-labelledby="control-states-title">
    <div className={styles.heading}><h2 className="type-section-title" id="control-states-title">버튼·탭 공통 기준과 상태</h2>
      <p className="type-body text-zinc-600">텍스트 밀집 도구 32px, 일반 실행 40px, 헤더 44px, 로그인·결제 같은 주요 완료 행동 48px을 사용합니다. 본문 버튼은 8px 모서리와 14px·600 글자를 공유합니다.</p>
    </div>
    <p className="type-body-sm site-copy-muted">아이콘의 표현과 클릭 영역은 분리합니다. 불필요한 장식은 생략하고 버튼 식별에 필요한 형태·중앙 정렬·포커스는 유지합니다.</p><div className={styles.buttonRow}>
      <Button onClick={() => setClicks(n => n + 1)}><Plus />동작 확인</Button>
      <Button variant="outline" size="compact">밀집 도구 32px</Button><Button size="lg">주요 완료 48px</Button>
      <Button variant="outline"><BookOpen />사용가이드</Button><Button variant="ai"><Sparkles />AI 상담</Button>
      <div className="site-action-row" data-wrap="nowrap"><ButtonGroupDivider /><Button size="icon" variant="ghost" aria-label="추가 도구"><Plus /></Button></div>
    </div>
    <IconControlExamples />
    <div id="button-shape-groups" className="site-stack-block" role="group" aria-labelledby="button-shape-groups-title">
      <div className="site-stack-title"><h3 id="button-shape-groups-title" className="type-content-title">버튼 모양별 묶음</h3><p className="type-body-sm site-copy-muted">한 작업 행에서 사각형 텍스트 버튼과 아이콘 도구가 이어지면, 모양이 바뀌는 경계에만 옅은 회색 세로선 한 개를 둡니다. 같은 모양끼리는 선 없이 공통 8px 간격으로 묶습니다.</p></div>
      <div className="site-action-row" role="group" aria-label="텍스트 버튼과 아이콘 도구 묶음 예시">
        <Button variant="outline" onClick={() => setClicks(n => n + 1)}>바로 배치</Button>
        <div className="site-action-row" data-wrap="nowrap"><ButtonGroupDivider /><Button size="icon" iconAppearance="framed" variant="outline" aria-label="묶음 예시 사각형 도구"><Square aria-hidden="true" /></Button><Button size="icon" iconAppearance="framed" variant="outline" disabled aria-label="묶음 예시 삭제"><Trash2 aria-hidden="true" /></Button></div>
      </div>
      <p className="type-footnote site-copy-muted">구분선은 1px·높이 24px이며 버튼 중앙에 맞춥니다. 선은 뒤쪽 버튼 묶음과 함께 유지하고, 비활성 여부·색상 차이만으로는 선을 추가하지 않습니다. 탭·입력 필드·서로 떨어진 작업 영역에는 이 규칙을 일괄 적용하지 않습니다.</p>
    </div>
    <div className="site-stack-group" role="group" aria-label="흰 배경의 보조 버튼 예시">
      <div className="site-stack-title"><h3 className="type-content-title">흰 배경의 보조 행동</h3><p className="type-body-sm site-copy-muted">취소·변경 취소·로그아웃처럼 독립된 텍스트 행동은 회색 테두리로 구분합니다. 투명 버튼은 아이콘 도구, link는 본문·목록 안의 보조 이동에 사용합니다.</p></div>
      <div className="site-action-row"><Button variant="outline">취소</Button><Button variant="outline">변경 취소</Button><Button variant="outline">로그아웃</Button><Button variant="outline" disabled>변경 취소 · 비활성</Button><Button variant="outline-danger">삭제 요청</Button><div className="site-action-row" data-wrap="nowrap"><ButtonGroupDivider /><Button variant="ghost" size="icon" aria-label="보조 버튼 예시 추가 도구"><Plus aria-hidden="true" /></Button></div></div>
    </div>
    <div id="button-surface-boundaries" className="site-stack-group" role="group" aria-labelledby="button-surface-boundaries-title">
      <div className="site-stack-title"><h3 className="type-content-title" id="button-surface-boundaries-title">배경과 버튼의 경계</h3><p className="type-body-sm site-copy-muted">테두리는 흰색 버튼의 경계가 불분명할 때 사용합니다. 회색 secondary와 비활성 버튼은 채움과 흐린 문구로 구분하고, hover·클릭 반응을 보이지 않습니다.</p></div>
      <ContentPanel surface="muted" density="compact" aria-label="회색 배경의 비활성 이동 예시">
        <div className="site-field-stack"><label className="type-label" htmlFor="button-boundary-room">다른 룸으로 이동</label><fieldset disabled className="site-form-row" data-alignment="center"><legend className="sr-only">비활성 룸 이동 예시</legend><div className="site-field-stack"><select id="button-boundary-room" className="site-field w-full" defaultValue=""><option value="">이동할 다른 룸이 없습니다</option></select></div><Button variant="outline">이동</Button></fieldset></div>
        <div className="site-action-row"><Button variant="outline">사용 가능한 이동 예시</Button><Button variant="secondary">초기화 예시</Button><Button variant="secondary" disabled>초기화 · 비활성</Button></div>
        <p className="type-footnote site-copy-muted">회색 패널에는 장식 테두리를 더하지 않습니다. 버튼의 기능적 경계와 패널의 장식 경계를 구분합니다. 투명 아이콘 도구·본문 링크는 기존 역할을 유지합니다.</p>
      </ContentPanel>
      <ContentPanel aria-label="흰 배경의 실행 버튼 비교"><div className="site-action-row"><Button variant="secondary">보조 실행</Button><Button variant="outline" disabled>이동 · 비활성</Button><Button disabled>저장 · 비활성</Button></div></ContentPanel>
    </div>
    <p className="type-body-sm text-zinc-600" role="status">동작 확인 {clicks}회 · Tab으로 포커스하고 Enter·Space로 실행해 보세요.</p>
    <div className={styles.usageTable}><table aria-label="버튼 상태 기준"><thead><tr><th scope="col">역할</th>{states.map(([key,label]) => <th scope="col" key={key}>{label}</th>)}</tr></thead>
      <tbody>{actions.map(([variant,label]) => <tr key={variant}><th scope="row">{label}</th>{states.map(([state,stateLabel]) => <td key={state}>
        <Button variant={variant} size={variant === "ghost" || variant === "danger-ghost" ? "icon" : undefined} disabled={state === "disabled"} data-ui-state={state === "default" || state === "disabled" ? undefined : state} aria-label={`${label} ${stateLabel} 예시`}>{variant === "ghost" ? <Plus aria-hidden="true" /> : variant === "danger-ghost" ? <Trash2 aria-hidden="true" /> : label}</Button>
      </td>)}</tr>)}</tbody></table></div>
    <p className="type-body-sm text-zinc-600">상태 표는 실제 공통 스타일을 고정해 비교합니다. 비활성 실행 버튼은 옅은 회색 표면·흐린 문구·무테를 사용하며 hover·클릭 색상으로 바뀌지 않습니다. 고객지원 퀵 버튼은 56px의 둥근 정사각형이며 무배경 아이콘 도구와 구분합니다.</p>
    <div className={styles.ruleGrid}>{([
      ["underline", "목록 주제 분류", "밑줄 탭 · 4px 선택선"],
      ["area", "독립 콘텐츠 영역 전환", "흰 콘텐츠 면 · 상단 연결 탭"],
    ] as const).map(([variant,title,description]) => <div key={variant} className="min-w-0">
      <h3 className="type-content-title mb-2">{title}</h3><p className="type-caption mb-4 text-zinc-600">{description}</p>
      <Tabs variant={variant} defaultValue="first"><TabsList aria-label={`${title} 동작 예시`}>
        <TabsTrigger value="first">첫 번째</TabsTrigger><TabsTrigger value="second">두 번째</TabsTrigger><TabsTrigger value="unavailable" disabled>준비 중</TabsTrigger>
      </TabsList><TabsContent value="first" className="type-body-sm">첫 번째 내용</TabsContent><TabsContent value="second" className="type-body-sm">두 번째 내용</TabsContent></Tabs>
    </div>)}</div>
    <p className="type-body-sm text-zinc-600">아래 표는 위계 선택표가 아니라 각 공통 변형의 상태 회귀 비교표입니다. 실제 화면에서는 주요 화면·독립 영역·목록 주제·상태값의 역할로 형태를 정합니다.</p>
    <div className={styles.usageTable}><table aria-label="탭 상태 기준"><thead><tr><th scope="col">종류</th>{states.map(([key,label]) => <th scope="col" key={key}>{label}</th>)}</tr></thead>
      <tbody>{(["page", "underline", "area", "outline", "document"] as const).map(variant => <tr key={variant}><th scope="row">{{page:"페이지 전환",underline:"밑줄",area:"영역형",outline:"상태값 전환",document:"문서형"}[variant]}</th>{states.map(([state,stateLabel]) => <td key={state}><Tabs variant={variant} defaultValue="selected"><TabsList aria-label={`${variant} ${stateLabel} 예시`}>
        <TabsTrigger value="selected" data-ui-state={state === "default" || state === "disabled" ? undefined : state} disabled={state === "disabled"}>선택</TabsTrigger>
      </TabsList><TabsContent value="selected" className="sr-only" tabIndex={-1}>상태 예시</TabsContent></Tabs></td>)}</tr>)}</tbody></table></div>
    <div className={styles.inverseToolbar} role="group" aria-label="미리보기 도구 스타일 예시">{["태블릿","PC","모바일"].map(label => <button key={label} type="button" className="site-preview-control" aria-pressed={previewDevice === label} onClick={() => setPreviewDevice(label)}>{label}</button>)}<button type="button" className="site-preview-control" disabled>준비 중</button></div>
    <div className="site-filter-group" role="group" aria-label="하위 필터 예시"><button type="button" className="site-filter" aria-pressed>전체</button><button type="button" className="site-filter" aria-pressed={false}>카페</button><button type="button" className="site-filter" disabled>준비 중</button></div>
  </section>;
}
