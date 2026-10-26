"use client";

import { useId, useState } from "react";
import { Check, Search } from "lucide-react";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import styles from "./SiteComponentGallery.module.css";

export default function FormAndCardExamples() {
  const id = useId();
  const [plan, setPlan] = useState("basic");
  return <>
    <section className={styles.section} id="form-controls">
      <div className={styles.heading}>
        <h2 className="type-section-title">용도로 구분하는 입력 요소</h2>
        <p className="type-body text-zinc-600">작은 목록 필터, 계정 입력, 신청 입력, 큰 질문 검색창을 구분합니다. 글자는 16px 이상이며 입력값은 보통 굵기로 표시합니다.</p>
      </div>
      <div className={styles.fieldGrid}>
        <label className={styles.fieldExample} htmlFor={`${id}-filter`}><span className="type-label">목록 필터 · 40px</span><Input id={`${id}-filter`} fieldSize="sm" placeholder="매장명 검색" /><span className="type-body-sm text-zinc-600">필터와 편집 도구 안의 짧은 입력</span></label>
        <label className={styles.fieldExample} htmlFor={`${id}-email`}><span className="type-label">로그인·계정 · 44px</span><Input id={`${id}-email`} fieldSize="md" type="email" placeholder="이메일을 입력해 주세요" autoComplete="off" /><span className="type-body-sm text-zinc-600">이메일·비밀번호 등 일반 입력</span></label>
        <label className={styles.fieldExample} htmlFor={`${id}-store`}><span className="type-label">신청 정보 · 48px</span><Input id={`${id}-store`} fieldSize="lg" placeholder="상호명을 입력해 주세요" /><span className="type-body-sm text-zinc-600">작성할 정보가 많은 신청 화면</span></label>
        <div className={styles.fieldExample}><label className="type-label" htmlFor={`${id}-select`}>셀렉트 · 입력창과 같은 크기</label><Select defaultValue="all"><SelectTrigger id={`${id}-select`} size="lg"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">전체 상태</SelectItem><SelectItem value="active">공개 중</SelectItem><SelectItem value="draft">작성 중</SelectItem></SelectContent></Select><span className="type-body-sm text-zinc-600">같은 폼에서는 input과 동일한 규격</span></div>
      </div>
      <label className={styles.fieldExample} htmlFor={`${id}-question`}><span className="type-label">질문 검색 · 모바일 56px / PC 64px</span><div className={styles.searchExample}><Search aria-hidden="true" size={22} /><input id={`${id}-question`} className="site-field site-field-search" type="search" placeholder="어떤 점이 궁금하신가요?" /></div></label>
      <label className={styles.fieldExample} htmlFor={`${id}-message`}><span className="type-label">긴 문의 · 여러 줄 입력</span><Textarea id={`${id}-message`} fieldSize="lg" rows={4} placeholder="문의 내용을 자세히 적어 주세요." /></label>
      <div className={styles.fieldGrid}>
        <label className={styles.fieldExample} htmlFor={`${id}-readonly`}><span className="type-label">읽기 전용</span><Input id={`${id}-readonly`} value="입력 내용을 확인하는 항목" readOnly /></label>
        <label className={styles.fieldExample} htmlFor={`${id}-disabled`}><span className="type-label">비활성</span><Input id={`${id}-disabled`} placeholder="사용할 수 없는 항목" disabled /></label>
        <label className={styles.fieldExample} htmlFor={`${id}-invalid`}><span className="type-label">오류 안내</span><Input id={`${id}-invalid`} aria-invalid="true" aria-describedby={`${id}-error`} defaultValue="잘못된 이메일" /><span id={`${id}-error`} className="type-body-sm text-red-700">이메일 주소를 다시 확인해 주세요.</span></label>
      </div>
      <p className="type-body-sm text-zinc-600">마우스를 올리면 경계가 또렷해지고, 입력 중에는 파란 포커스가 표시됩니다. 오류는 문구와 경계로 함께 안내합니다.</p>
    </section>
    <section className={styles.section}>
      <div className={styles.heading}><h2 id="card-patterns" className="type-section-title">정보와 선택을 구분하는 카드</h2><p className="type-body text-zinc-600">흰 표면·옅은 회색 경계·12px 모서리를 기본으로 사용합니다. 제목과 요금에만 굵기를 주고, 선택은 또렷한 경계와 표시로 구분합니다.</p></div>
      <div className={styles.fieldGrid}>
        {[{key:"basic",name:"베이직 템플릿",price:"4,900원",description:"한 화면에 담는 매장 메뉴"},{key:"dining",name:"다이닝 템플릿",price:"6,900원",description:"커버와 여러 페이지로 전하는 메뉴"}].map(item=><button className="site-choice site-plan-card" key={item.key} type="button" aria-pressed={plan===item.key} onClick={()=>setPlan(item.key)}><span className={styles.planHeading}><span className="type-content-title">{item.name}</span>{plan===item.key?<span className="site-chip"><Check size={14} aria-hidden="true" />선택됨</span>:null}</span><span className="type-body-sm text-zinc-600">{item.description}</span><span className="site-plan-price">{item.price}<span className="type-body-sm font-normal text-zinc-600"> / 월</span></span><span className="type-body-sm text-zinc-600">얼리버드 요금 · 부가세 포함</span></button>)}
      </div>
      <div className={styles.fieldGrid}>
        <article className="site-card p-5"><h3 className="type-content-title">일반 정보 카드</h3><p className="type-body mt-3 text-zinc-600">계정 정보와 상세 내용은 흰 카드 안에서 제목·본문·설명을 구분합니다.</p></article>
        <article className="site-card site-card-muted p-5"><h3 className="type-content-title">보조 정보 카드</h3><p className="type-body mt-3 text-zinc-600">옅은 배경은 참고 정보와 하위 묶음에 사용합니다.</p></article>
      </div>
    </section>
  </>;
}
