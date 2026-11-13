"use client";

import { useId, useState } from "react";
import { Sparkles, UserRound } from "@/app/components/ui/site-icon";
import { ko } from "date-fns/locale";
import { format } from "date-fns";
import { DateField } from "@/app/components/ui/date-field";
import { ContentPanel } from "@/app/components/ui/content-panel";
import { FontSelect } from "@/app/components/ui/font-select";
import { KOREAN_FONT_OPTIONS, getKoreanFontOption, getAvailableEnglishFontsForTemplate, getEnglishFontOption } from "@/lib/font-options";
import { Input } from "@/app/components/ui/input";
import { FieldMessage } from "@/app/components/ui/field-message";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/app/components/ui/input-group";
import { PasswordField } from "@/app/components/ui/password-field";
import { FilterToolbar } from "@/app/components/ui/filter-toolbar";
import { SearchField } from "@/app/components/ui/search-field";
import { MultiSelect } from "@/app/components/ui/multi-select";
import { Accordion } from "@/app/components/ui/accordion";
import { Checkbox } from "@/app/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/app/components/ui/radio-group";
import { Button } from "@/app/components/ui/button";
import { Calendar } from "@/app/components/ui/calendar";
import styles from "./SiteComponentGallery.module.css";

export default function ComposedFieldExamples() {
  const id = useId();
  const [koreanFont, setKoreanFont] = useState("");
  const [englishFont, setEnglishFont] = useState("");
  const [query, setQuery] = useState("");
  const [checked, setChecked] = useState<boolean | "indeterminate">("indeterminate");
  const [filters, setFilters] = useState<string[]>(["cozy"]);
  const filterOptions = [{ key: "lively", label: "발랄한" }, { key: "cozy", label: "코지한" }, { key: "modern", label: "모던한" }];
  const [toolbarFilters, setToolbarFilters] = useState<Record<string, string[]>>({});
  const [radio, setRadio] = useState("email");
  const [date, setDate] = useState<Date | undefined>(() => new Date(2026, 10, 11));
  const items = ["메뉴판 편집", "테이블 관리", "디자인 템플릿"].filter(item => item.includes(query.trim()));
  return <section className={styles.section} id="composed-fields" aria-labelledby={`${id}-title`}>
    <div className="site-stack-title"><h2 className="type-section-title" id={`${id}-title`}>입력 구조·선택·날짜</h2><p className="type-body site-copy-muted">입력값과 아이콘·단위·보조 행동을 하나의 경계 안에 정렬합니다. 일반 필드와 캡슐형 검색은 각각의 모서리를 유지하며32·40·44·48px 입력 규격을 공유합니다.</p></div>
    <div className="site-detail-grid">
      <ContentPanel><div className="site-field-stack"><span className="type-label">한글 서체 미리보기</span><FontSelect label="한글 서체 미리보기" script="ko" options={KOREAN_FONT_OPTIONS} defaultOption={getKoreanFontOption("pretendard")!} value={koreanFont} onChange={setKoreanFont} /></div></ContentPanel>
      <ContentPanel><div className="site-field-stack"><span className="type-label">영문 서체 미리보기</span><FontSelect label="영문 서체 미리보기" script="en" options={getAvailableEnglishFontsForTemplate("cafe_design_a")} defaultOption={getEnglishFontOption("alata")!} value={englishFont} onChange={setEnglishFont} /></div></ContentPanel>
      <ContentPanel><div className="site-field-stack"><label className="type-label" htmlFor={`${id}-name`}>아이콘이 있는 입력</label><InputGroup><InputGroupAddon aria-hidden="true"><UserRound /></InputGroupAddon><InputGroupInput id={`${id}-name`} name="sampleName" placeholder="담당자명" /></InputGroup></div></ContentPanel>
      <ContentPanel><div className="site-field-stack"><label className="type-label" htmlFor={`${id}-amount`}>금액</label><InputGroup><InputGroupInput id={`${id}-amount`} name="sampleAmount" inputMode="decimal" defaultValue="10000" aria-describedby={`${id}-unit`} /><InputGroupAddon id={`${id}-unit`}>원</InputGroupAddon></InputGroup></div></ContentPanel>
      <ContentPanel><div className="site-field-stack"><label className="type-label" htmlFor={`${id}-password`}>비밀번호</label><PasswordField id={`${id}-password`} defaultValue="sample-password" autoComplete="off" /></div></ContentPanel>
      <ContentPanel><div className="site-field-stack"><label className="type-label" htmlFor={`${id}-search`}>검색</label><SearchField id={`${id}-search`} label="컴포넌트 예시 검색" value={query} onValueChange={setQuery} placeholder="메뉴판·테이블·템플릿" /><p className="type-caption site-copy-muted" role="status">{items.length ? `검색 결과 ${items.length}개` : "검색 결과가 없습니다."}</p></div></ContentPanel>
      <ContentPanel><div className="site-field-stack"><label className="type-label" htmlFor={`${id}-hero-search`}>대표 검색</label><SearchField id={`${id}-hero-search`} label="대표 검색 예시" fieldSize="search" submitLabel="대표 검색 실행" placeholder="예: 메뉴판 만들기, QR, 결제" value={query} onValueChange={setQuery} /></div></ContentPanel>
      <ContentPanel><div className="site-field-stack"><label className="type-label" htmlFor={`${id}-readonly`}>읽기 전용</label><Input id={`${id}-readonly`} value="선택하고 복사할 수 있는 값" readOnly /></div><div className="site-field-stack"><label className="type-label" htmlFor={`${id}-disabled`}>비활성</label><SearchField id={`${id}-disabled`} label="비활성 검색 예시" value="검색할 수 없는 상태" onValueChange={() => {}} disabled /></div></ContentPanel>
      <ContentPanel><div className="site-field-stack"><label className="type-label" htmlFor={`${id}-invalid`}>입력 오류</label><PasswordField id={`${id}-invalid`} defaultValue="short" aria-invalid="true" aria-describedby={`${id}-error`} /><FieldMessage id={`${id}-error`}>비밀번호는8자 이상 입력해 주세요.</FieldMessage></div></ContentPanel>
      <ContentPanel><form className="site-stack-block" onSubmit={event => event.preventDefault()}><div className="site-field-stack"><label className="type-label" htmlFor={`${id}-default-search`}>기본값이 있는 검색</label><SearchField id={`${id}-default-search`} label="기본값 검색" name="query" defaultValue="메뉴판" submitLabel="기본값 검색 실행" /></div><div className="site-action-row"><Button type="reset" variant="outline">초기값으로 되돌리기</Button></div></form></ContentPanel>
      <ContentPanel><h3 className="type-content-title">선택 상태</h3><label className="site-action-row type-label"><Checkbox checked={checked} onCheckedChange={value => setChecked(value === true)} />부분 선택·전체 선택</label><label className="site-action-row type-label"><Checkbox checked disabled />비활성 선택</label><RadioGroup value={radio} onValueChange={setRadio} aria-label="알림 채널 예시"><label className="site-action-row type-label"><RadioGroupItem value="email" />이메일</label><label className="site-action-row type-label"><RadioGroupItem value="message" />문자 메시지</label><label className="site-action-row type-label"><RadioGroupItem value="disabled" disabled />준비 중</label></RadioGroup></ContentPanel>
      <ContentPanel><h3 className="type-content-title">복수 선택 필터</h3><MultiSelect label="분위기" icon={<Sparkles aria-hidden="true" />} options={filterOptions} value={filters} onValueChange={setFilters} /><Accordion type="single" collapsible><MultiSelect presentation="accordion" label="접이식 분위기" icon={<Sparkles aria-hidden="true" />} options={filterOptions} value={filters} onValueChange={setFilters} /></Accordion></ContentPanel>
      <ContentPanel><h3 className="type-content-title">날짜 선택</h3><div className="site-field-stack"><label htmlFor={`${id}-date`} className="type-label">날짜</label><DateField id={`${id}-date`} label="날짜" value={date ? format(date, "yyyy-MM-dd") : ""} onValueChange={value => setDate(value ? new Date(`${value}T12:00:00`) : undefined)} /></div><Calendar mode="single" locale={ko} selected={date} onSelect={setDate} defaultMonth={new Date(2026, 10, 1)} /></ContentPanel>
    </div>
    <div className="site-stack-block"><h3 className="type-content-title">내용 기준 검색·필터 영역</h3><FilterToolbar surface="muted" search={<SearchField label="너비 예시 검색" placeholder="이름으로 검색" value={query} onValueChange={setQuery} />} filters={["업종", "분위기", "색상", "레이아웃"].map(label => <MultiSelect key={label} label={label} icon={<Sparkles aria-hidden="true" />} options={filterOptions} value={toolbarFilters[label] ?? []} onValueChange={value => setToolbarFilters(current => ({ ...current, [label]: value }))} />)} summary={<p className="type-caption" role="status">선택 {Object.values(toolbarFilters).reduce((sum, values) => sum + values.length, 0)}개</p>} /></div>
  </section>;
}
