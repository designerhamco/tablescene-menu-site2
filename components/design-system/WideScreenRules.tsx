import { getSiteWideTypeScale, SITE_WIDE_TYPE_POLICY } from "@/lib/site-typography";
import { getMenuPreviewPresentation, MENU_PREVIEW_PRESENTATION } from "@/lib/menu-preview-fit";
import { getMenuPreviewFrame } from "@/lib/menu-preview-devices";
import styles from "./SiteComponentGallery.module.css";

export default function WideScreenRules({ id }: { id: string }) {
  const { startWidth, endWidth, maxScale } = SITE_WIDE_TYPE_POLICY;
  const rows = [startWidth, 1920, 2560, endWidth];
  const size = (base: number, width: number) => Number((base * getSiteWideTypeScale(width)).toFixed(2));
  const previewRows = (["pc", "tablet", "mobile"] as const).map(device => ({
    device, frame: getMenuPreviewFrame(device, "landscape"),
    wide: getMenuPreviewPresentation(MENU_PREVIEW_PRESENTATION.compactBreakpoint, device),
    compact: getMenuPreviewPresentation(MENU_PREVIEW_PRESENTATION.compactBreakpoint - 1, device),
  }));
  const presentation = (policy: ReturnType<typeof getMenuPreviewPresentation>) => `가로 ${policy.widthRatio * 100}% · 세로 ${policy.heightRatio * 100}% / 최대 ${policy.maxScale}배`;
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
      <h3 className="type-content-title" id={`${id}-mockups`}>미리보기 목업 크기 기준</h3>
      <p className="type-body-sm mt-2 text-zinc-600">미리보기를 여는 브라우저 너비와 상단에서 선택한 기기를 나눠 적용합니다. 아래 비율은 도구·보기 옵션을 제외한 가용 공간 기준입니다. 가로·세로 한도에 모두 들어가도록 비율을 유지해 중앙 정렬합니다.</p>
      <div className={`${styles.usageTable} mt-4`}><table aria-label="미리보기 목업 크기 기준">
        <thead><tr><th>선택한 기기</th><th>브라우저 {MENU_PREVIEW_PRESENTATION.compactBreakpoint}px 이상</th><th>브라우저 {MENU_PREVIEW_PRESENTATION.compactBreakpoint}px 미만</th><th>내부 기기 해상도</th></tr></thead>
        <tbody>{previewRows.map(({device,frame,wide,compact}) => <tr key={device}>
          <th scope="row">{frame.label}</th><td>{presentation(wide)}</td><td>{presentation(compact)}</td><td>{frame.width}×{frame.height}px</td>
        </tr>)}</tbody>
      </table></div>
      <p className="type-body-sm mt-3 text-zinc-600">모바일에서 볼 때도 태블릿은 가용 가로·세로의 80% 안에서 구분합니다. 태블릿 세로 전환은 다이닝에서만 제공하며 내부 820×1180px을 사용합니다. 베이직은 가로를 유지합니다. 내부 메뉴의 글자·배치·기기 해상도는 유지하며 목업의 바깥 표시 크기만 조정합니다. 상단 버튼은 기본 높이 36px·문구 14px, 모바일 터치 높이는 44px입니다.</p>
      <p className="type-body-sm mt-3 text-zinc-600">크기·여백·폰트 조정만으로 기존 기능이나 버튼을 이동·숨김·제거·재분류하지 않습니다. 위치 변경은 사용자 요청이 있을 때만 합니다. 주문·호출·묶음형·채움형은 상단에 유지합니다.</p>
      <p className="type-body-sm mt-3 text-zinc-600">두 미리보기의 ‘실제 화면 보기’는 목업·기기 강제 지정 없이 현재 화면으로 열고, 같은 클릭으로 전체화면을 요청합니다. 미지원·권한 거절 시 실제 화면과 이용 가이드를 제공합니다. 새 탭 로딩 후 자동 전체화면을 보장하지 않습니다.</p>
      <p className="type-footnote mt-2 text-zinc-600">일반 콘텐츠는 공통 최대 폭과 간격 상한을 사용합니다. 로그인은 과도한 세로 공백을 제한합니다. 글자·여백·목업을 같은 배율로 일괄 확대하지 않습니다.</p>
      <a className="site-button site-button-outline mt-4" href="/templates/cafe_real_matcha_a/preview?device=tablet" target="_blank" rel="noopener noreferrer">실제 미리보기 확인</a>
    </div>
  </section>;
}
