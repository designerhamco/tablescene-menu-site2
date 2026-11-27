"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { CategoryFilter } from "@/app/components/ui/category-filter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import CatalogServiceButtons from "@/components/templates/CatalogServiceButtons";
import { SERVICE_CATEGORY_LABELS } from "@/lib/service-categories";
import type { CatalogService } from "@/lib/catalog-designs";
import styles from "./SiteComponentGallery.module.css";
import SupportNavigation from "@/components/layout/SupportNavigation";

const sizes = [
  ["대", "44px", "40px", "48px"],
  ["중", "44px", "36px", "44px"],
  ["소", "32px", "32px", "40px"],
] as const;
const options = [
  ["all", "전체 상태"], ["draft", "작성 중"], ["published", "공개 중"],
  ["long", "담당자가 검토 중인 메뉴판 전체 상태"],
] as const;

export default function SelectionControlExamples() {
  const [kind, setKind] = useState("designer");
  const [service, setService] = useState<CatalogService>("basic");
  const [industry, setIndustry] = useState("all");
  const [topic, setTopic] = useState("all");
  const [nativeValue, setNativeValue] = useState("all");
  const [customValue, setCustomValue] = useState("all");
  return <>
    <section className={styles.section} aria-labelledby="selection-hierarchy-title">
      <div className={styles.heading}><h2 className="type-section-title" id="selection-hierarchy-title">탭 역할과 포함 관계</h2>
        <p className="type-body text-zinc-600">화면을 전환할 때는 밑줄을 기본으로 씁니다. 선택한 대상과 작업 패널이 한 영역을 이룰 때는 콘텐츠 연결형 탭을 씁니다.</p></div>
      <div className={styles.usageTable}><table aria-label="탭 역할 적용 기준"><thead><tr><th>역할</th><th>표현</th><th>공통 구현</th><th>대표 사용처</th></tr></thead><tbody>
        <tr><td>화면 전환</td><td>글자 너비의 검정 밑줄</td><td>Tabs / NavigationTabs · page</td><td>주문 관리, 결제·AI 내역, 편집 설정</td></tr>
        <tr><td>목록의 주제 분류</td><td>같은 3px 밑줄 · 보조 크기</td><td>CategoryFilter / Tabs · category</td><td>고객센터 주제, 전체·읽지 않은 알림</td></tr>
        <tr><td>작업 영역 전환</td><td>흰 선택 탭을 아래 작업 영역에 연결</td><td>Tabs · section + document</td><td>테이블·키오스크 관리의 룸</td></tr>
        <tr><td>상태 필터</td><td>회색 레일 · 선택한 값에 검정 채움</td><td>NavigationTabs · state</td><td>내 메뉴판의 이용 중·만료·보관·종료됨</td></tr>
      </tbody></table></div>
      <div className={styles.hierarchyMap}>
        <section className={styles.hierarchyLevel} aria-label="템플릿 페이지 포함 관계 예시">
          <div className={styles.heading}><h3 className="type-content-title">디자인 템플릿의 기존 규격</h3><p className="type-body-sm text-zinc-600">템플릿 종류 전환 → 메뉴판 유형 → 업종 필터 → 결과</p></div>
          <Tabs purpose="section" value={service === "display" ? "designer" : kind} onValueChange={setKind}>
            {service !== "display" ? <TabsList size="md" distribution="equal" aria-label="템플릿 구조 영역 선택">
              <TabsTrigger value="designer">디자인 템플릿</TabsTrigger><TabsTrigger value="standard">기본 템플릿</TabsTrigger>
            </TabsList> : null}
            {["designer", "standard"].map(kind => <TabsContent key={kind} value={kind}>
              <div className="site-stack-block">
                <CatalogServiceButtons value={service} onValueChange={setService} />
                <div className="site-filter-group" role="group" aria-label="템플릿 구조 업종 필터">
                  {[["all", "전체"], ["cafe", "카페"], ["dining", "레스토랑"]].map(([value, label]) => <button key={value} type="button" className="site-filter" aria-pressed={industry === value} onClick={() => setIndustry(value)}>{label}</button>)}
                </div>
              </div>
              <p className="type-body-sm mt-5" role="status">{SERVICE_CATEGORY_LABELS[service]} · {kind === "designer" ? "디자인 템플릿" : "기본 템플릿"} · {industry === "all" ? "전체 업종" : industry === "cafe" ? "카페" : "레스토랑"} 결과</p>
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
      <div className={styles.usageTable}><table aria-label="탭 크기 기준"><thead><tr><th>크기</th><th>밑줄 탭 PC</th><th>밑줄 탭 모바일·태블릿</th><th>콘텐츠 연결형</th></tr></thead><tbody>{sizes.map(([size, desktop, narrow, document]) => <tr key={size}><td>{size}</td><td>{desktop}</td><td>{narrow}</td><td>{document}</td></tr>)}</tbody></table></div>
      <p className="type-body-sm text-zinc-600">표는 최소 높이입니다. PC 주요 화면 탭은 중·대 18px, 소 16px입니다. 내 메뉴판 상태 필터는 PC에서 항목 40px·레일 48px, 모바일·태블릿에서 항목 36px·레일 44px입니다. 탭 패널은 방향키·Home·End로 이동하고, 필터와 링크는 각자의 키보드 동작을 유지합니다.</p>
    </section>
    <section className={styles.section} aria-labelledby="select-contract-title">
      <div className={styles.heading}><h2 className="type-section-title" id="select-contract-title">셀렉트박스</h2><p className="type-body text-zinc-600">일반 셀렉트의 최소 높이는 44px이고 선택값은 기본 16px입니다. Remix Line 꺾쇠는 16px, 오른쪽 여백은 12px입니다. 문구 오른쪽은 모바일 40px, 태블릿·PC 36px을 확보합니다.</p></div>
      <div className={styles.ruleGrid}>
        <label className="type-label grid min-w-0 content-start gap-2">기본 셀렉트<select className="site-field w-full min-w-0" value={nativeValue} onChange={event => setNativeValue(event.target.value)}>{options.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <div className="grid min-w-0 content-start gap-2"><label className="type-label" htmlFor="custom-select-demo">아이콘·목록 셀렉트</label><Select value={customValue} onValueChange={setCustomValue}><SelectTrigger id="custom-select-demo"><SelectValue /></SelectTrigger><SelectContent>{options.map(([value,label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}<SelectItem value="unavailable" disabled>준비 중</SelectItem></SelectContent></Select></div>
        <label className="type-label grid min-w-0 content-start gap-2">비활성 셀렉트<select className="site-field w-full" defaultValue="all" disabled><option value="all">전체 상태</option></select></label>
      </div>
      <p className="type-body-sm text-zinc-600">기본 셀렉트는 기기의 목록·키보드 동작을 유지합니다. 아이콘·목록 셀렉트는 열릴 때 화살표가 돌아가며, Escape로 닫으면 선택 버튼으로 포커스가 돌아옵니다.</p>
    </section>
  </>;
}
