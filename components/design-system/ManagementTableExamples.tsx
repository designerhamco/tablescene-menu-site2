"use client";

import { useState } from "react";
import { EditIcon } from "@/app/components/ui/edit-icon";
import { Button } from "@/app/components/ui/button";
import { Switch } from "@/app/components/ui/switch";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";
import InfoTooltip from "@/components/ui/InfoTooltip";
import ActionFeedbackToast from "@/components/ui/ActionFeedbackToast";
import { SITE_TABLE_COLUMNS, SITE_TABLE_RULES } from "@/lib/site-table";
import styles from "./SiteComponentGallery.module.css";

export default function ManagementTableExamples() {
  const [active, setActive] = useState(true);
  const [feedback, setFeedback] = useState<{ message: string } | null>(null);
  const exampleAction = () => setFeedback({ message: "동작 확인용 예시입니다. 실제 매장 데이터는 변경하지 않습니다." });
  return <section id="management-tables" className={styles.section}>
    <div className={styles.heading}><h2 className="type-section-title">관리 표</h2><p className="type-body site-copy-muted">항목을 비교하고 같은 행에서 작업할 때 사용합니다. 표도 공통 여백·서체·색·버튼과 스위치 규칙을 따릅니다. 주문과 호출은 별도 열에서 태블릿·모바일 스위치로 조작합니다. 관리 열에는 보관·삭제만 두며 연결하기는 공통 팝업을 엽니다. 아래 조작은 예시 화면에서만 반영됩니다.</p></div>
    <div className="site-management-scope site-stack-content">
      <ActionFeedbackToast message={feedback?.message} tone="success" eventKey={feedback} />
      <div className="site-stack-block">
        <h3 className="type-subsection-title">셀·행·주변 간격</h3>
        <Table variant="management" label="관리 표의 공통 치수">
          <TableHeader><TableRow><TableHead>역할</TableHead><TableHead>기준</TableHead><TableHead>공통 토큰</TableHead></TableRow></TableHeader>
          <TableBody>{SITE_TABLE_RULES.map(rule => <TableRow key={rule.label}><TableCell>{rule.label}</TableCell><TableCell>{rule.detail}</TableCell><TableCell><code>{rule.token}</code></TableCell></TableRow>)}</TableBody>
        </Table>
      </div>
      <div className="site-stack-block">
        <h3 className="type-subsection-title">조작이 있는 표</h3>
        <p className="type-body-sm site-copy-muted">헤더와 본문의 열 시작선을 맞춥니다. 이름은 줄바꿈하고, 버튼 묶음은 8px 간격을 유지합니다. 행 전체는 클릭 영역으로 만들지 않습니다. 좁은 화면에서는 포커스 가능한 표 영역 안에서만 좌우로 이동합니다. 오른쪽에 숨겨진 내용이 남으면 실제 표면색으로 페이드하고 끝까지 이동하면 사라집니다.</p>
        <Table variant="management" label="조작이 있는 관리 표 예시" columns={["compact", "text", "detail", "control", "actions"]}>
          <TableCaption className="sr-only">태블릿 주문 허용·중지·읽기 전용·저장 중 상태와 긴 이름을 보여주는 예시입니다.</TableCaption>
          <TableHeader><TableRow><TableHead>종류</TableHead><TableHead>이름</TableHead><TableHead>기기 연결 여부</TableHead><TableHead>태블릿 주문</TableHead><TableHead>관리</TableHead></TableRow></TableHeader>
          <TableBody>{["테이블 1", "긴 이름도 생략하지 않고 여러 줄로 표시하는 테이블", "키오스크 1"].map((name, index) => <TableRow key={name}>
            <TableCell nowrap>{index === 2 ? "키오스크" : "테이블"}</TableCell>
            <TableCell primary><Button variant="link" size="compact" aria-label={`${name} 수정 예시`} onClick={exampleAction} disabled={index > 0}><span className="type-item-title min-w-0 break-words">{name}</span><EditIcon /></Button></TableCell>
            <TableCell><div className="site-action-row"><InfoTooltip label={`${name} 연결 안내 예시`}><p>{index === 2 ? "기기 정보 예시: [태블릿] iPadOS · iPad · Safari. 실제 운영 화면에서는 조회한 OS·모델·브라우저 정보를 표시합니다." : "손님 휴대폰·QR 주문은 기기를 연결하지 않아도 됩니다. 테이블에 비치한 태블릿을 사용할 때 연결해 주세요."}</p></InfoTooltip><span className="type-label">{index === 2 ? "기기 연결됨" : "미사용"}</span><Button variant="outline" size="compact" onClick={exampleAction} disabled={index > 0}>{index === 2 ? "연결 관리" : "연결하기"}</Button></div></TableCell>
            <TableCell nowrap><div className="site-action-row" data-wrap="nowrap"><label className="type-label" htmlFor={`table-example-${index}`}>태블릿</label><Switch id={`table-example-${index}`} checked={index === 0 ? active : index === 2} onCheckedChange={index === 0 ? setActive : undefined} disabled={index === 1} loading={index === 2} aria-label={`${name} 태블릿 주문 허용 예시`} /></div></TableCell>
            <TableCell nowrap><div className="site-action-row" data-wrap="nowrap"><Button variant="outline" size="compact" disabled={index > 0} onClick={exampleAction}>보관</Button><Button variant="outline-danger" size="compact" disabled={index > 0} onClick={exampleAction}>삭제</Button></div></TableCell>
          </TableRow>)}</TableBody>
        </Table>
        <p className="type-footnote site-copy-muted">두 번째 행은 읽기 전용, 세 번째 행은 저장 대기 예시입니다. 이름 옆 편집 연필은 공통16px입니다. 텍스트 버튼·Switch는 표준 높이를 유지하며, 도움말·연필 도구는 그림 자체가 클릭 영역입니다. 표면은 회색 헤더와 흰 본문, 가로 구분선만 사용합니다.</p>
      </div>
      <div className="site-stack-block">
        <h3 className="type-subsection-title">숫자 비교와 열 너비</h3>
        <Table variant="management" label="숫자 끝 정렬 예시"><TableHeader><TableRow><TableHead>항목</TableHead><TableHead align="end">수량</TableHead><TableHead align="end">예시 금액</TableHead></TableRow></TableHeader><TableBody><TableRow><TableCell>예시 A</TableCell><TableCell align="end">2</TableCell><TableCell align="end">12,000원</TableCell></TableRow><TableRow><TableCell>예시 B</TableCell><TableCell align="end">12</TableCell><TableCell align="end">120,000원</TableCell></TableRow></TableBody></Table>
        <p className="type-body-sm site-copy-muted">일반 표는 내용에 맞춰 너비를 정합니다. 조작이 있는 표는 공통 열 역할을 선택하며, 선택한 열의 최소 너비 합계 안에서만 가로 스크롤합니다. 페이지에서 퍼센트나 수치형 셀 여백을 덮어쓰지 않습니다.</p>
        <Table variant="management" label="공통 표 열 역할"><TableHeader><TableRow><TableHead>역할</TableHead><TableHead>최소 너비</TableHead><TableHead>용도</TableHead></TableRow></TableHeader><TableBody>{Object.entries(SITE_TABLE_COLUMNS).map(([key, column]) => <TableRow key={key}><TableCell><code>{key}</code> · {column.label}</TableCell><TableCell>{column.rem}rem</TableCell><TableCell>{column.usage}</TableCell></TableRow>)}</TableBody></Table>
      </div>
    </div>
  </section>;
}
