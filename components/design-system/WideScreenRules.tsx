import { getSiteWideTypeScale, SITE_WIDE_TYPE_POLICY } from "@/lib/site-typography";
import { MENU_PREVIEW_PRESENTATION } from "@/lib/menu-preview-fit";
import styles from "./SiteComponentGallery.module.css";

export default function WideScreenRules({ id }: { id: string }) {
  const { startWidth, endWidth, maxScale } = SITE_WIDE_TYPE_POLICY;
  const rows = [startWidth, 1920, 2560, endWidth];
  const size = (base: number, width: number) => Number((base * getSiteWideTypeScale(width)).toFixed(2));
  return <section className={styles.section} id={id} aria-labelledby={`${id}-title`}>
    <div className={styles.heading}>
      <h2 className="type-section-title" id={`${id}-title`}>와이드 화면 공통 규칙</h2>
      <p className="type-body text-zinc-600">모니터 제품 해상도가 아닌 브라우저 안의 실제 너비를 기준으로 합니다. {startWidth.toLocaleString("ko-KR")}px까지 기본 크기를 유지하고, 이후 같은 글자 역할을 함께 키워 최대 {(maxScale - 1) * 100}%로 제한합니다.</p>
    </div>
    <div className={styles.usageTable}><table aria-label="와이드 화면 글자 크기 기준">
      <thead><tr><th>브라우저 너비 · PC</th><th>공통 보정</th><th>페이지 제목</th><th>본문·페이지 설명</th></tr></thead>
      <tbody>{rows.map(width => <tr key={width}>
        <td>{width.toLocaleString("ko-KR")}px{width === startWidth ? " 이하" : width === endWidth ? " 이상" : ""}</td>
        <td>+{Number(((getSiteWideTypeScale(width) - 1) * 100).toFixed(1))}%</td><td>{size(36, width)}px</td><td>{size(16, width)}px</td>
      </tr>)}</tbody>
    </table></div>
    <p className="type-body-sm mt-4 text-zinc-600">새 페이지와 수정 화면은 공통 제목·본문 역할, 버튼 컴포넌트, 페이지·구역 간격을 사용하면 같은 보정을 자동으로 받습니다. 화면마다 별도 확대 배율을 넣지 않습니다. 표는 PC의 기본 rem 기준이며 모바일·태블릿은 각 기기의 기본 크기와 브라우저 글자 확대를 유지합니다.</p>
    <div className="site-collection mt-5">
      <h3 className="type-content-title">미리보기는 여백을 남기는 별도 기준</h3>
      <p className="type-body-sm mt-2 text-zinc-600">PC 목업은 가용 영역 가로의 {MENU_PREVIEW_PRESENTATION.desktop.widthRatio * 100}%·세로의 {MENU_PREVIEW_PRESENTATION.desktop.heightRatio * 100}% 안에서 최대 {MENU_PREVIEW_PRESENTATION.desktop.maxScale}배, 태블릿은 가로 {MENU_PREVIEW_PRESENTATION.tablet.widthRatio * 100}%·세로 {MENU_PREVIEW_PRESENTATION.tablet.heightRatio * 100}% 안에서 최대 {MENU_PREVIEW_PRESENTATION.tablet.maxScale}배로 표시합니다. 내부 메뉴 크기는 유지합니다. 상단은 버튼 높이 36px·문구 14px을 기본으로 사용하고, 주문·호출·배치 전환도 상단에 둡니다. 모바일은 터치 높이 44px을 유지합니다.</p>
      <p className="type-footnote mt-2 text-zinc-600">일반 콘텐츠는 공통 최대 폭과 간격 상한을 사용합니다. 로그인은 과도한 세로 공백을 제한합니다. 글자·여백·목업을 같은 배율로 일괄 확대하지 않습니다.</p>
      <a className="site-button site-button-outline mt-4" href="/templates/cafe_real_matcha_a/preview?device=tablet" target="_blank" rel="noopener noreferrer">실제 미리보기 확인</a>
    </div>
  </section>;
}
