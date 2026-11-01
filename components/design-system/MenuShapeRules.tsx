import { MENU_SHAPE_PRESETS, TEMPLATE_SHAPE_DEFAULTS } from "@/lib/menu-appearance";
import styles from "./SiteComponentGallery.module.css";

export default function MenuShapeRules() {
  return <section className={styles.section} id="menu-shapes">
    <div className={styles.heading}>
      <h2 className="type-section-title">메뉴판 이미지·텍스트칩 모양</h2>
      <p className="type-body text-zinc-600">템플릿 미리보기·구매 후 초기 메뉴판·편집기·초기화는 같은 기본값을 사용합니다. PC·태블릿·모바일에서 코너 값은 동일합니다.</p>
    </div>
    <div className={styles.usageTable}><table aria-label="메뉴판 공통 모양 프리셋"><thead><tr><th>모양</th><th>이미지</th><th>텍스트칩</th></tr></thead><tbody>
      {Object.entries(MENU_SHAPE_PRESETS).map(([key, value]) => <tr key={key}><td>{value.label}</td><td>{value.imageRadius}px</td><td>{value.chipShape === "pill" ? "알약형" : `${value.chipRadius}px`}</td></tr>)}
    </tbody></table></div>
    <div className={styles.usageTable}><table aria-label="템플릿 기본 모양"><thead><tr><th>템플릿</th><th>기본 모양</th><th>이미지 / 칩</th></tr></thead><tbody>
      {TEMPLATE_SHAPE_DEFAULTS.map(template => { const value = MENU_SHAPE_PRESETS[template.preset]; return <tr key={template.key}><td>{template.label}</td><td>{value.label}</td><td>{value.imageRadius}px / {value.chipRadius}px</td></tr>; })}
      <tr><td>기본 디자인 전체 10종</td><td>각진 모양</td><td>0px / 0px</td></tr>
    </tbody></table></div>
    <p className="type-body-sm text-zinc-600">대표·상품·위젯·광고 이미지에 같은 프리셋을 적용합니다. 화면을 덮는 다이닝 표지와 디스플레이 홍보 이미지는 각진 형태, 로고는 원본 형태를 유지합니다. 반고흐 칩은 낙서 윤곽과 질감 없는 일반 각진 칩입니다. 고객이 저장한 개별 값은 우선하며 기존 데이터를 덮어쓰지 않습니다. 새 템플릿도 공통 등록표에 기본 모양을 등록합니다.</p>
  </section>;
}
