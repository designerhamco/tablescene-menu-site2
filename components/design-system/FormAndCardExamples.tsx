"use client";

import { useId, useState } from "react";
import { Check } from "@/app/components/ui/site-icon";
import { Button } from "@/app/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/app/components/ui/dialog";
import { Input } from "@/app/components/ui/input";
import { SearchField } from "@/app/components/ui/search-field";
import { Textarea } from "@/app/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import styles from "./SiteComponentGallery.module.css";

export default function FormAndCardExamples() {
  const id = useId();
  const [plan, setPlan] = useState("basic");
  const [query, setQuery] = useState("");
  return <>
    <section className={styles.section} id="form-controls">
      <div className={styles.heading}>
        <h2 className="type-section-title">용도로 구분하는 입력 요소</h2>
        <p className="type-body text-zinc-600">작은 목록 필터, 계정 입력, 신청 입력, 큰 질문 검색창을 구분합니다. 입력 글자는 기본14px·터치16px이며 값은 보통 굵기로 표시합니다.</p>
      </div>
      <div className={styles.fieldGrid}>
        <div className={styles.fieldExample}><label className="type-label" htmlFor={`${id}-filter`}>목록 필터 · 32px</label><SearchField id={`${id}-filter`} label="매장명 검색" fieldSize="sm" placeholder="매장명 검색" /><span className="type-footnote text-zinc-600">필터와 편집 도구 안의 짧은 입력</span></div>
        <label className={styles.fieldExample} htmlFor={`${id}-email`}><span className="type-label">로그인·계정 · 40px</span><Input id={`${id}-email`} fieldSize="md" type="email" placeholder="이메일을 입력해 주세요" autoComplete="off" /><span className="type-footnote text-zinc-600">이메일·비밀번호 등 일반 입력</span></label>
        <label className={styles.fieldExample} htmlFor={`${id}-store`}><span className="type-label">신청 정보 · 44px</span><Input id={`${id}-store`} fieldSize="lg" placeholder="상호명을 입력해 주세요" /><span className="type-footnote text-zinc-600">작성할 정보가 많은 신청 화면</span></label>
        <div className={styles.fieldExample}><label className="type-label" htmlFor={`${id}-select`}>셀렉트 · 입력창과 같은 크기</label><Select defaultValue="all"><SelectTrigger id={`${id}-select`} size="lg"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">전체 상태</SelectItem><SelectItem value="active">공개 중</SelectItem><SelectItem value="draft">작성 중</SelectItem></SelectContent></Select><span className="type-footnote text-zinc-600">같은 폼에서는 input과 동일한 규격</span></div>
      </div>
      <form className={styles.fieldExample} onSubmit={event => event.preventDefault()}><label className="type-label" htmlFor={`${id}-question`}>질문 검색 · 48px</label><SearchField id={`${id}-question`} label="질문 검색" fieldSize="search" submitLabel="질문 검색 실행" value={query} onValueChange={setQuery} placeholder="어떤 점이 궁금하신가요?" /></form>
      <label className={styles.fieldExample} htmlFor={`${id}-message`}><span className="type-label">긴 문의 · 여러 줄 입력</span><Textarea id={`${id}-message`} fieldSize="lg" rows={4} placeholder="문의 내용을 자세히 적어 주세요." /></label>
      <div className={styles.fieldGrid}>
        <label className={styles.fieldExample} htmlFor={`${id}-readonly`}><span className="type-label">읽기 전용</span><Input id={`${id}-readonly`} value="입력 내용을 확인하는 항목" readOnly /></label>
        <label className={styles.fieldExample} htmlFor={`${id}-disabled`}><span className="type-label">비활성</span><Input id={`${id}-disabled`} placeholder="사용할 수 없는 항목" disabled /></label>
        <label className={styles.fieldExample} htmlFor={`${id}-invalid`}><span className="type-label">오류 안내</span><Input id={`${id}-invalid`} aria-invalid="true" aria-describedby={`${id}-error`} defaultValue="잘못된 이메일" /><span id={`${id}-error`} className="type-footnote text-red-700">이메일 주소를 다시 확인해 주세요.</span></label>
      </div>
      <p className="type-body-sm text-zinc-600">마우스를 올리면 경계가 또렷해지고, 입력 중에는 파란 포커스가 표시됩니다. 오류는 문구와 경계로 함께 안내합니다.</p>
    </section>
    <section className={styles.section}>
      <div className={styles.heading}><h2 id="card-patterns" className="type-section-title">관리 정보와 선택에 사용하는 카드</h2><p className="type-body text-zinc-600">독립된 계정·구독 정보와 실제 선택 항목에 필요할 때 사용합니다. 일반·상세 페이지의 설명과 알림 본문은 배경 없이 구성합니다.</p></div>
      <div className={styles.fieldGrid}>
        {[{key:"basic",name:"베이직 템플릿",price:"4,900원",description:"한 화면에 담는 매장 메뉴"},{key:"dining",name:"다이닝 템플릿",price:"6,900원",description:"커버와 여러 페이지로 전하는 메뉴"}].map(item=><button className="site-choice site-plan-card" key={item.key} type="button" aria-pressed={plan===item.key} onClick={()=>setPlan(item.key)}><span className={styles.planHeading}><span className="type-card-title">{item.name}</span>{plan===item.key?<span className="site-chip"><Check size={14} aria-hidden="true" />선택됨</span>:null}</span><span className="type-card-body text-zinc-600">{item.description}</span><span className="site-plan-price">{item.price}<span className="type-body-sm font-normal text-zinc-600"> / 월</span></span><span className="type-card-detail text-zinc-600">얼리버드 요금 · 부가세 포함</span></button>)}
      </div>
      <div className={styles.fieldGrid}>
        <article className="site-card p-5"><h3 className="type-card-title">계정 정보 카드</h3><p className="type-card-body mt-3 text-zinc-600">마이페이지의 프로필·구독 정보 등 독립된 정보 묶음에 사용합니다.</p></article>
        <article className="site-card site-card-muted p-5"><h3 className="type-card-title">관리 설정 카드</h3><p className="type-card-body mt-3 text-zinc-600">운영관리 안의 별도 설정 묶음에 필요한 경우만 선택합니다. 보조 설명이라는 이유로 추가하지 않습니다.</p></article>
      </div>
    </section>
    <section className={styles.section} id="small-copy">
      <div className={styles.heading}><h2 className="type-section-title">작은 안내와 팝업 글자</h2><p className="type-body text-zinc-600">페이지 본문과 구분해 작은 안내는 13px, 팝업 본문은 14px, 팝업 제목은 18px로 사용합니다.</p></div>
      <p className="type-footnote text-zinc-600">입력한 정보는 문의 답변에 사용됩니다. 자세한 내용은 개인정보 처리방침을 확인해 주세요.</p>
      <Dialog><DialogTrigger asChild><Button variant="outline">팝업 글자 확인</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>안내를 확인해 주세요</DialogTitle><DialogDescription>팝업 본문은 페이지 본문보다 작은 공통 읽기 크기를 사용합니다.</DialogDescription></DialogHeader><p className="type-body">설명과 선택에 필요한 내용을 간결하게 표시합니다.</p><p className="type-footnote text-zinc-600">작은 안내는 13px·보통 굵기로 통일합니다.</p></DialogContent></Dialog>
      <Dialog><DialogTrigger asChild><Button variant="outline">긴 확인창 스크롤</Button></DialogTrigger><DialogContent scrollable><DialogHeader reserveCloseButton><DialogTitle>전체 내용을 확인해 주세요</DialogTitle><DialogDescription>짧은 화면에서도 제목과 확인 내용을 스크롤해 읽을 수 있습니다.</DialogDescription></DialogHeader><div className="site-stack-block">{Array.from({ length: 8 }, (_, index) => <p key={index} className="type-body">{index + 1}. 중요한 내용은 공통 본문 크기로 유지합니다. 긴 안내와 선택 항목은 창 안에서 스크롤하며 확인합니다.</p>)}</div></DialogContent></Dialog>

    </section>
  </>;
}
