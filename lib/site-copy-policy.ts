import type { ReactNode } from "react";

/** Page descriptions are an explicit exception; ordinary titles need no tutorial. */
export type SiteDescriptionPurpose = "requested" | "state" | "essential" | "content";
export type SiteIntroDescriptionProps =
  | { description?: never; descriptionPurpose?: never }
  | { description: ReactNode; descriptionPurpose: SiteDescriptionPurpose };

export const SITE_COPY_RULES = [
  { role: "기본", rule: "제목·탭·라벨·버튼으로 이해되는 화면에는 별도 사용 설명을 추가하지 않습니다." },
  { role: "추가 도움말", rule: "UI만으로 알기 어려운 조건은 가까운 공통 InfoTooltip에서 클릭·호버·키보드로 확인합니다." },
  { role: "보존", rule: "직접 요청한 안내, 박스·테이블·카드 안 설명, 상태·오류·빈 목록·실제 데이터 정보는 유지합니다." },
  { role: "주의사항", rule: "삭제·결제·환불·보안·저장 결과처럼 판단에 필요한 정보는 숨기거나 삭제하지 않습니다." },
  { role: "팝업", rule: "대상·현재 상태·결정에 필요한 조건을 우선하고 제목을 반복하는 소개는 생략합니다." },
  { role: "페이지 소개 예외", rule: "설명이 꼭 필요하면 descriptionPurpose에 requested / state / essential / content 사유를 명시합니다." },
] as const;
