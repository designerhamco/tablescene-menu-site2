"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import styles from "./SiteComponentGallery.module.css";

const sizes = [
  ["lg", "대 · 페이지의 주요 분류", "탭 56px / 18px · 세그먼트 56px / 18px"],
  ["md", "중 · 섹션 안의 분류", "탭 48px / 16px · 세그먼트 48px / 15–16px"],
  ["sm", "소 · 도구 안의 세부 선택", "탭 40px / 15px · 세그먼트 40px / 15px"],
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
      <div className={styles.heading}><h2 className="type-section-title" id="selection-hierarchy-title">탭·세그먼트의 역할과 크기</h2>
        <p className="type-body text-zinc-600">모양은 용도로, 크기는 정보의 단계로 선택합니다. 주요 분류 아래에 같은 크기의 분류를 반복하지 않습니다.</p></div>
      <div className={styles.usageTable}><table aria-label="선택 요소 사용 기준"><thead><tr><th>용도</th><th>형태</th><th>사용 예</th></tr></thead><tbody>
        <tr><td>다른 콘텐츠 묶음으로 전환</td><td>밑줄 탭</td><td>베이직·다이닝, 가이드 서비스 분류</td></tr>
        <tr><td>경계가 있는 목록과 직접 연결</td><td>연결형 탭</td><td>디자인 / 기본 템플릿, 공지사항 / FAQ</td></tr>
        <tr><td>같은 콘텐츠의 보기·설정 방식 변경</td><td>세그먼트</td><td>이미지 / 목록 보기, 기능 / 디자인 옵션</td></tr>
        <tr><td>현재 목록의 조건·본문 바로가기</td><td>작은 필터·링크</td><td>업종, 고객센터 주제, 가이드 본문 바로가기</td></tr>
      </tbody></table></div>
      {sizes.map(([size, title, description]) => <div key={size} className="min-w-0">
        <h3 className="type-content-title">{title}</h3><p className="type-caption mt-2 mb-4 text-zinc-600">{description} · 글자에 맞는 폭 · 밑줄 4px</p>
        <div className={`${styles.ruleGrid} ${styles.selectionVariants}`}>{(["underline", "contained", "outline"] as const).map(variant => <Tabs key={variant} variant={variant} defaultValue="first" className="min-w-0">
          <TabsList size={size} aria-label={`${title} ${variant} 예시`}><TabsTrigger value="first">선택 1</TabsTrigger><TabsTrigger value="second">선택 2</TabsTrigger><TabsTrigger value="unavailable" disabled>준비 중</TabsTrigger></TabsList>
          <TabsContent value="first" className="type-caption">첫 번째 내용</TabsContent><TabsContent value="second" className="type-caption">두 번째 내용</TabsContent>
        </Tabs>)}</div>
      </div>)}
      <p className="type-body-sm text-zinc-600">세그먼트 높이는 바탕을 포함한 값입니다. 마이페이지·편집기의 섹션은 중, 그 안의 세부 분류는 소를 사용합니다. 방향키·Home·End로 이동하며 준비 중 항목은 건너뜁니다. 일반 보기 전환에는 밝은 테두리형을 사용합니다.</p>
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
