"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { CategoryFilter } from "@/app/components/ui/category-filter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import styles from "./SiteComponentGallery.module.css";
import SupportNavigation from "@/components/layout/SupportNavigation";

const sizes = [
  ["대", "영역 56px / 주요 48px · 18·16px", "공개 페이지의 넓은 주요 전환"],
  ["중", "영역 52px / 주요 44px · 16px", "마이페이지·편집기의 일반 분류"],
  ["소", "영역 44px / 기타 40px · 14px", "영역 안의 세부 전환·필터"],
] as const;
const options = [
  ["all", "전체 상태"], ["draft", "작성 중"], ["published", "공개 중"],
  ["long", "담당자가 검토 중인 메뉴판 전체 상태"],
] as const;

export default function SelectionControlExamples() {
  const [industry, setIndustry] = useState("all");
  const [topic, setTopic] = useState("all");
  const [nativeValue, setNativeValue] = useState("all");
  const [customValue, setCustomValue] = useState("all");
  return <>
    <section className={styles.section} aria-labelledby="selection-hierarchy-title">
      <div className={styles.heading}><h2 className="type-section-title" id="selection-hierarchy-title">탭 역할과 포함 관계</h2>
        <p className="type-body text-zinc-600">먼저 무엇을 바꾸는지 판단합니다. 주요 화면, 독립 콘텐츠 영역, 목록 주제, 필터, 상태값을 구분하고 실제로 포함된 내용에 따라 위계를 구성합니다. 영역형을 특정 단계에 고정하지 않습니다.</p></div>
      <div className={styles.usageTable}><table aria-label="탭 역할 적용 기준"><thead><tr><th>역할</th><th>표현</th><th>공통 구현</th><th>대표 사용처</th></tr></thead><tbody>
        <tr><td>주요 화면 전환</td><td>텍스트 탭 · 선택 문구 너비의 검정 밑줄</td><td>Tabs purpose=&quot;page&quot; / NavigationTabs purpose=&quot;page&quot;</td><td>서비스별 목록, 가이드 플랜, 편집 설정 화면</td></tr>
        <tr><td>독립 콘텐츠 영역 전환</td><td>흰 콘텐츠에 연결된 상단 8px 영역 탭</td><td>Tabs purpose=&quot;section&quot; / NavigationTabs purpose=&quot;section&quot;</td><td>디자인/기본 템플릿, 결제내역/AI 사용내역, 미리보기 기능/디자인</td></tr>
        <tr><td>목록 분류</td><td>밑줄형 · 별도 콘텐츠 박스 없음</td><td>CategoryFilter / Tabs purpose=&quot;category&quot;</td><td>고객센터 주제, 전체/읽지 않은 알림</td></tr>
        <tr><td>목록 조건 선택</td><td>작은 필터 버튼 · 아이콘 선택</td><td>site-filter / ChoiceTile</td><td>템플릿 업종, 화면 구성, 본문 바로가기</td></tr>
        <tr><td>현재 화면의 상태·보기 값 변경</td><td>회색 레일 안의 둥근 세그먼트 · 흰 선택 면</td><td>Tabs purpose=&quot;state&quot; / NavigationTabs purpose=&quot;state&quot;</td><td>이용 중/보관 중/종료됨, 언어, 이미지/목록 보기</td></tr>
      </tbody></table></div>
      <div className={styles.hierarchyMap}>
        <section className={styles.hierarchyLevel} aria-label="템플릿 페이지 포함 관계 예시">
          <div className={styles.heading}><h3 className="type-content-title">디자인 템플릿 구조</h3><p className="type-body-sm text-zinc-600">주요 화면 전환 → 독립 콘텐츠 영역 전환 → 영역 안의 업종 필터 → 결과</p></div>
          <Tabs purpose="page" defaultValue="basic"><TabsList size="lg" aria-label="템플릿 구조 주요 화면"><TabsTrigger value="basic">베이직</TabsTrigger><TabsTrigger value="dining">다이닝</TabsTrigger><TabsTrigger value="display" disabled>준비 중</TabsTrigger></TabsList>
            {["basic", "dining"].map(service => <TabsContent key={service} value={service} className="pt-4">
              <Tabs purpose="section" defaultValue="designer"><TabsList size="sm" aria-label="템플릿 구조 영역 선택"><TabsTrigger value="designer">디자인 템플릿</TabsTrigger><TabsTrigger value="standard">기본 템플릿</TabsTrigger></TabsList>
                {["designer", "standard"].map(kind => <TabsContent key={kind} value={kind}>
                  <div className="site-filter-group" role="group" aria-label="템플릿 구조 업종 필터">{[["all", "전체"], ["cafe", "카페"], ["dining", "레스토랑"]].map(([value, label]) => <button key={value} type="button" className="site-filter" aria-pressed={industry === value} onClick={() => setIndustry(value)}>{label}</button>)}</div>
                  <p className="type-body-sm mt-5" role="status">{service === "basic" ? "베이직" : "다이닝"} · {kind === "designer" ? "디자인 템플릿" : "기본 템플릿"} · {industry === "all" ? "전체 업종" : industry === "cafe" ? "카페" : "레스토랑"} 결과</p>
                </TabsContent>)}
              </Tabs>
            </TabsContent>)}
          </Tabs>
        </section>
        <section className={styles.hierarchyLevel} aria-label="고객센터 페이지 포함 관계 예시">
          <div className={styles.heading}><h3 className="type-content-title">고객센터 구조</h3><p className="type-body-sm text-zinc-600">헤더 하위 메뉴 → 자주 묻는 질문 / 공지사항 / 이용가이드의 독립 페이지</p></div>
          <div className="site-filter-group"><SupportNavigation pathname="/faq" /></div>
          <CategoryFilter label="고객센터 구조 주제 분류" value={topic} onValueChange={setTopic} options={[{value:"all",label:"전체"},{value:"usage",label:"이용 환경"},{value:"menu",label:"메뉴판 생성·관리"}]} />
          <p className="type-body-sm mt-5" role="status">FAQ · {topic === "all" ? "전체" : topic === "usage" ? "이용 환경" : "메뉴판 생성·관리"} 목록</p>
        </section>
      </div>
      <div className="min-w-0"><h3 className="type-content-title mb-2">상태값 변경</h3><p className="type-body-sm mb-4 text-zinc-600">최상위 탭은 선택한 문구만 두껍게 표시하고 검정 밑줄을 사용합니다. 비선택 문구는 더 가벼운 굵기와 중성 회색으로 구분합니다. 상태 세그먼트는 회색 레일 안에 묶이고 흰 선택 면을 사용해 역할을 구별합니다. URL에 상태가 기록되더라도 현재 화면의 값만 바뀌면 상태 전환입니다.</p>
        <Tabs purpose="state" defaultValue="active"><TabsList size="md" aria-label="상태값 변경 예시"><TabsTrigger value="active">이용 중</TabsTrigger><TabsTrigger value="holding">보관 중</TabsTrigger><TabsTrigger value="ended">종료됨</TabsTrigger></TabsList><TabsContent value="active" className="type-caption">이용 중인 메뉴판</TabsContent><TabsContent value="holding" className="type-caption">보관 중인 메뉴판</TabsContent><TabsContent value="ended" className="type-caption">종료된 메뉴판</TabsContent></Tabs>
      </div>
      <div className={styles.usageTable}><table aria-label="탭 크기 기준"><thead><tr><th>밀도</th><th>높이 / 글자</th><th>적용</th></tr></thead><tbody>{sizes.map(([size, metrics, use]) => <tr key={size}><td>{size}</td><td>{metrics}</td><td>{use}</td></tr>)}</tbody></table></div>
      <p className="type-body-sm text-zinc-600">모양은 역할, 크기는 화면 밀도로 고릅니다. 영역 콘텐츠는 화이트 배경이며 둘레 테두리를 두지 않습니다. 실제 탭 패널은 방향키·Home·End로 이동하고, 주제 필터·링크는 본래 버튼·링크 키보드 동작을 유지합니다.</p>
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
