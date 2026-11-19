import { getSiteWideTypeScale, SITE_WIDE_TYPE_POLICY, SITE_MARKETING_TITLE_POLICY, SITE_HOME_HERO_TITLE_POLICY } from "@/lib/site-typography";
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
  const presentation = (policy: ReturnType<typeof getMenuPreviewPresentation>) => `가로 ${policy.widthRatio * 100}% · 세로 ${policy.heightRatio * 100}% / ${Number.isFinite(policy.maxScale) ? `최대 ${policy.maxScale}배` : "가용 공간에 맞춤"}`;
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
    <div className="site-stack-copy">
      <h3 className="type-content-title">메인·베이직·다이닝·디스플레이의 제목·본문 여백</h3>
      <div className={styles.usageTable}><table aria-label="메인·서비스 소개 제목 기준"><thead><tr><th>범위</th><th>모바일</th><th>태블릿</th><th>PC</th><th>굵기 / 줄높이</th></tr></thead><tbody><tr><td>서비스 첫 제목·주요 섹션·기능 스토리 제목</td><td>{SITE_MARKETING_TITLE_POLICY.mobile}px</td><td>{SITE_MARKETING_TITLE_POLICY.tablet}px</td><td>{SITE_MARKETING_TITLE_POLICY.desktop}px</td><td>{SITE_MARKETING_TITLE_POLICY.weight} / {SITE_MARKETING_TITLE_POLICY.lineHeight}</td></tr><tr><td>메인 첫 히어로만</td><td>{SITE_HOME_HERO_TITLE_POLICY.mobile}px</td><td>{SITE_HOME_HERO_TITLE_POLICY.tablet}px</td><td>{SITE_HOME_HERO_TITLE_POLICY.desktop}px</td><td>{SITE_HOME_HERO_TITLE_POLICY.weight} / {SITE_HOME_HERO_TITLE_POLICY.lineHeight}</td></tr></tbody></table></div>
      <p className="type-body-sm site-copy-muted">메인 본문의 제목·설명·버튼과 콘텐츠 그리드는 헤더·푸터와 같은 최대1600px 중앙 컨테이너를 사용합니다. 배경 사진·배경색·시연 카메라는 화면 전체를 유지하며, 좁은 화면은 기존 공통 gutter를 사용합니다. 베이직·다이닝·디스플레이 소개는 메인 안의 서비스 프레임으로 통합되어 같은 콘텐츠 경계를 따릅니다. 제목 크기는 기존 와이드 글자 보정을 함께 받고 카드·본문·시연 화면은 각 역할을 유지합니다.</p>
    </div>
    <div className="site-collection mt-5">
      <h3 className="type-content-title" id={`${id}-mockups`}>미리보기 목업 크기 기준</h3>
      <p className="type-body-sm mt-2 text-zinc-600">미리보기를 여는 브라우저 너비와 상단에서 선택한 기기를 나눠 적용합니다. 옵션 창과 상단 도구는 고정 레이어이며 화면 영역을 밀지 않습니다. 태블릿·모바일 목업은 페이지 전체의 중앙에서 대칭 여백 안을 채우며 최대1.25배를 넘지 않습니다.</p>
      <div className={`${styles.usageTable} mt-4`}><table aria-label="미리보기 목업 크기 기준">
        <thead><tr><th>선택한 기기</th><th>브라우저 {MENU_PREVIEW_PRESENTATION.compactBreakpoint}px 이상</th><th>브라우저 {MENU_PREVIEW_PRESENTATION.compactBreakpoint}px 미만</th><th>내부 기기 해상도</th></tr></thead>
        <tbody>{previewRows.map(({device,frame,wide,compact}) => <tr key={device}>
          <th scope="row">{frame.label}</th><td>{device === "pc" ? "테두리 없이 화면 전체 · 실제 뷰포트" : presentation(wide)}</td><td>{device === "pc" ? "1440×900 PC 구성 축소 · 테두리 없음" : presentation(compact)}</td><td>{device === "pc" ? "현재 뷰포트 / 모바일1440×900" : `${frame.width}×${frame.height}px`}</td>
        </tr>)}</tbody>
      </table></div>
      <p className="type-body-sm mt-3 text-zinc-600">PC는 목업 테두리·라운드·그림자를 없애고 현재 화면을 채웁니다. 모바일에서 PC를 선택하면 PC 구성을 축소해 전체를 보여줍니다. 태블릿·모바일 목업은 페이지 정중앙에 놓고, 와이드에서는 원본의1.25배로 제한합니다. 태블릿 세로 전환은 다이닝에서만 제공합니다. 보기 옵션·상단 도구를 열고 닫아도 목업 위치와 크기는 그대로입니다.</p>
      <p className="type-body-sm mt-3 text-zinc-600">크기·여백·폰트 조정만으로 기존 기능이나 버튼을 이동·숨김·제거·재분류하지 않습니다. 위치 변경은 사용자 요청이 있을 때만 합니다. 주문·호출·묶음형·채움형은 상단에 유지합니다.</p>
      <p className="type-body-sm mt-3 text-zinc-600">모바일 미리보기 첫 진입에는 PC에서 더 편하게 볼 수 있다는 안내를 탭 세션당 한 번 표시하고, 닫으면 모바일로 계속 볼 수 있습니다. 실제 화면보기와 QR 메뉴판에는 이 진입 안내를 표시하지 않습니다. ‘실제 화면 보기’는 모든 기기 모드에서 표시하며, 새 탭은 접속한 브라우저의 실제 화면 크기를 따릅니다. 모바일은 메뉴판만 표시하며 전체화면·안내 버튼과 안내창을 생략합니다. PC 안내는 확대·축소와 전체화면을 구분하고, 태블릿은 자동 안내와 PC용 확대·축소·ESC 설명을 생략합니다. PC·태블릿의 전체화면 버튼은 브라우저가 지원할 때만 표시하며, 미지원 설명은 ‘화면 보기 안내’를 열었을 때만 제공합니다. 전체화면에서는 안내와 도구를 숨기고 기존 안내 재열기 기능을 유지합니다. 모바일 확대·축소 제한은 추가하지 않습니다.</p>
      <p className="type-footnote mt-2 text-zinc-600">일반 콘텐츠는 공통 최대 폭과 간격 상한을 사용합니다. 로그인은 과도한 세로 공백을 제한합니다. 글자·여백·목업을 같은 배율로 일괄 확대하지 않습니다.</p>
      <a className="site-button site-button-outline mt-4" href="/templates/cafe_real_matcha_a/preview?device=tablet" target="_blank" rel="noopener noreferrer">실제 미리보기 확인</a>
    </div>
  </section>;
}
