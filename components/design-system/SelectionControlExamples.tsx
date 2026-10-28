"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import styles from "./SiteComponentGallery.module.css";

const sizes = [
  ["대", "48px / 16px", "공개 페이지의 넓은 주요 전환"],
  ["중", "44px / 15px", "마이페이지·편집기의 일반 분류"],
  ["소", "40px / 14px", "영역 안의 세부 전환·필터"],
] as const;
const options = [
  ["all", "전체 상태"], ["draft", "작성 중"], ["published", "공개 중"],
  ["long", "담당자가 검토 중인 메뉴판 전체 상태"],
] as const;

export default function SelectionControlExamples() {
  const [nativeValue, setNativeValue] = useState("all");
  const [customValue, setCustomValue] = useState("all");
  return <>
    <section className={styles.section} aria-labelledby="selection-hierarchy-title">
      <div className={styles.heading}><h2 className="type-section-title" id="selection-hierarchy-title">탭 위계</h2>
        <p className="type-body text-zinc-600">위에서 아래로 범위가 좁아집니다. 한 화면에서 같은 위계의 모양을 섞거나, 상위보다 하위 탭을 더 크게 만들지 않습니다.</p></div>
      <ol className={styles.hierarchyMap} aria-label="상위에서 하위로 이어지는 탭 위계">
        <li className={styles.hierarchyLevel} data-level="1">
          <div className={styles.hierarchyDescription}><span className={styles.hierarchyIndex}>1 · 최상위</span><h3 className="type-content-title">페이지의 큰 보기 전환</h3><p className="type-body-sm text-zinc-600">두세 개의 주요 화면 중 하나를 고릅니다. 한 페이지에 한 번만 사용합니다.</p></div>
          <Tabs hierarchy="primary" defaultValue="first"><TabsList size="lg" aria-label="최상위 보기 전환 예시"><TabsTrigger value="first">선택 1</TabsTrigger><TabsTrigger value="second">선택 2</TabsTrigger><TabsTrigger value="unavailable" disabled>준비 중</TabsTrigger></TabsList><TabsContent value="first" className="type-caption">첫 번째 주요 화면</TabsContent><TabsContent value="second" className="type-caption">두 번째 주요 화면</TabsContent></Tabs>
        </li>
        <li className={styles.hierarchyLevel} data-level="2">
          <div className={styles.hierarchyDescription}><span className={styles.hierarchyIndex}>2 · 주요 분류</span><h3 className="type-content-title">페이지 안 콘텐츠 묶음</h3><p className="type-body-sm text-zinc-600">서비스·상태·언어처럼 페이지의 주요 내용을 나눕니다.</p></div>
          <Tabs hierarchy="secondary" defaultValue="first"><TabsList size="md" aria-label="주요 콘텐츠 분류 예시"><TabsTrigger value="first">첫 번째</TabsTrigger><TabsTrigger value="second">두 번째</TabsTrigger><TabsTrigger value="unavailable" disabled>준비 중</TabsTrigger></TabsList><TabsContent value="first" className="type-caption">첫 번째 콘텐츠 묶음</TabsContent><TabsContent value="second" className="type-caption">두 번째 콘텐츠 묶음</TabsContent></Tabs>
        </li>
        <li className={styles.hierarchyLevel} data-level="3">
          <div className={styles.hierarchyDescription}><span className={styles.hierarchyIndex}>3 · 보조 분류</span><h3 className="type-content-title">현재 목록의 조건·본문 이동</h3><p className="type-body-sm text-zinc-600">패널을 바꾸지 않는 필터와 바로가기는 탭처럼 키우지 않습니다.</p></div>
          <div className="site-filter-group" role="group" aria-label="보조 필터 예시"><button type="button" className="site-filter" aria-pressed>전체</button><button type="button" className="site-filter" aria-pressed={false}>카페</button><button type="button" className="site-filter" disabled>준비 중</button></div>
        </li>
        <li className={styles.hierarchyLevel} data-level="4">
          <div className={styles.hierarchyDescription}><span className={styles.hierarchyIndex}>4 · 영역 내부</span><h3 className="type-content-title">한 기능 영역의 상세 내용</h3><p className="type-body-sm text-zinc-600">설정·도구 안의 내용만 바꿉니다. 회색 면에서는 외곽선을 추가하지 않습니다.</p></div>
          <Tabs hierarchy="embedded" defaultValue="first"><TabsList size="sm" aria-label="영역 내부 세부 전환 예시"><TabsTrigger value="first">첫 번째</TabsTrigger><TabsTrigger value="second">두 번째</TabsTrigger><TabsTrigger value="unavailable" disabled>준비 중</TabsTrigger></TabsList><TabsContent value="first" className="type-caption">첫 번째 세부 내용</TabsContent><TabsContent value="second" className="type-caption">두 번째 세부 내용</TabsContent></Tabs>
        </li>
      </ol>
      <div className={styles.usageTable}><table aria-label="탭 위계 적용 기준"><thead><tr><th>위계</th><th>공통 구현</th><th>대표 사용처</th><th>사용 제한</th></tr></thead><tbody>
        <tr><td>1 · 최상위</td><td>primary / outline 세그먼트</td><td>베이직·다이닝·디스플레이, 고객센터 공지사항·FAQ처럼 페이지 전체 보기 전환</td><td>한 페이지에 한 번, 2–3개 항목</td></tr>
        <tr><td>2 · 주요 분류</td><td>secondary / underline</td><td>마이페이지·가이드·언어·상태 분류</td><td>상위 세그먼트보다 크게 사용하지 않음</td></tr>
        <tr><td>3 · 보조 분류</td><td>site-filter / 본문 링크</td><td>업종·주제·상태 조건·본문 바로가기</td><td>실제 패널 전환에는 사용하지 않음</td></tr>
        <tr><td>4 · 영역 내부</td><td>embedded / area</td><td>템플릿 종류, 미리보기 옵션, 번역 항목, 설정 묶음</td><td>회색 면은 무테. 파일형·사선 윤곽을 새로 만들지 않음</td></tr>
      </tbody></table></div>
      <div className={styles.usageTable}><table aria-label="탭 크기 기준"><thead><tr><th>밀도</th><th>높이 / 글자</th><th>적용</th></tr></thead><tbody>{sizes.map(([size, metrics, use]) => <tr key={size}><td>{size}</td><td>{metrics}</td><td>{use}</td></tr>)}</tbody></table></div>
      <p className="type-body-sm text-zinc-600">모양은 위계로 먼저 결정하고, 크기는 화면 밀도로 고릅니다. 공개 페이지는 대, 마이페이지·편집기는 중, 영역 안의 세부 전환은 소가 기본입니다. 방향키·Home·End로 이동하며 준비 중 항목은 건너뜁니다.</p>
    </section>
    <section className={styles.section} aria-labelledby="select-contract-title">
      <div className={styles.heading}><h2 className="type-section-title" id="select-contract-title">셀렉트박스</h2><p className="type-body text-zinc-600">화살표는 20px·선 굵기 2.25, 오른쪽 여백은 16px입니다. 문구가 화살표에 겹치지 않도록 48px 공간을 확보합니다.</p></div>
      <div className={styles.ruleGrid}>
        <label className="type-label grid min-w-0 content-start gap-2">기본 셀렉트<select className="site-field w-full min-w-0" value={nativeValue} onChange={event => setNativeValue(event.target.value)}>{options.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <div className="grid min-w-0 content-start gap-2"><label className="type-label" htmlFor="custom-select-demo">아이콘·목록 셀렉트</label><Select value={customValue} onValueChange={setCustomValue}><SelectTrigger id="custom-select-demo"><SelectValue /></SelectTrigger><SelectContent>{options.map(([value,label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}<SelectItem value="unavailable" disabled>준비 중</SelectItem></SelectContent></Select></div>
        <label className="type-label grid min-w-0 content-start gap-2">비활성 셀렉트<select className="site-field w-full" defaultValue="all" disabled><option value="all">전체 상태</option></select></label>
      </div>
      <p className="type-body-sm text-zinc-600">기본 셀렉트는 기기의 목록·키보드 동작을 유지합니다. 아이콘·목록 셀렉트는 열릴 때 화살표가 돌아가며, Escape로 닫으면 선택 버튼으로 포커스가 돌아옵니다.</p>
    </section>
  </>;
}
