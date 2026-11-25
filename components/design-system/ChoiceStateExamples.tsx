"use client";

import { useState } from "react";
import { Button } from "@/app/components/ui/button";
import { ChoiceControl } from "@/app/components/ui/choice-tile";
import { ContentPanel } from "@/app/components/ui/content-panel";

export default function ChoiceStateExamples() {
  const [layout, setLayout] = useState("grouped");
  const [price, setPrice] = useState("number");
  return <ContentPanel surface="muted" aria-label="실행과 설정 선택 비교">
    <h3 className="type-content-title">실행 버튼·설정 선택·입력창</h3>
    <div className="site-field-stack"><span className="type-label">PC/태블릿 배치 방식</span>
      <ChoiceControl aria-pressed={layout === "grouped"} onClick={() => setLayout("grouped")}><span className="site-stack-copy"><strong className="type-label">묶음형 자동 배치</strong><span className="type-body-sm">카테고리 묶음을 유지하면서 화면에 균형 있게 배치합니다.</span></span></ChoiceControl>
      <ChoiceControl aria-pressed={layout === "fill"} onClick={() => setLayout("fill")}><span className="site-stack-copy"><strong className="type-label">채움형 배치</strong><span className="type-body-sm">등록한 순서대로 메뉴를 이어서 배치합니다.</span></span></ChoiceControl>
    </div>
    <div className="site-field-stack"><span className="type-label">가격 입력 방식</span><div className="site-action-row">
      <ChoiceControl aria-pressed={price === "number"} onClick={() => setPrice("number")}>숫자 가격</ChoiceControl>
      <ChoiceControl aria-pressed={price === "text"} onClick={() => setPrice("text")}>직접 표시 문구</ChoiceControl>
    </div></div>
    <label className="site-field-stack"><span className="type-label">입력창 예시</span><input className="site-field" defaultValue="5800" /></label>
    <div className="site-action-row"><Button type="button">저장 예시</Button><Button type="button" variant="secondary">보조 실행 예시</Button><Button type="button" disabled>저장 · 비활성</Button></div>
  </ContentPanel>;
}
