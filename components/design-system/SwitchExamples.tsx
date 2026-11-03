"use client";

import { useId, useState } from "react";
import { Switch } from "@/app/components/ui/switch";
import SwitchField from "@/components/mypage/menu-editor/SwitchField";
import styles from "./SiteComponentGallery.module.css";

function SwitchExample({ surface, label, initialChecked, disabled = false, loading = false }: {
  surface: "light" | "dark";
  label: string;
  initialChecked: boolean;
  disabled?: boolean;
  loading?: boolean;
}) {
  const id = useId();
  const [checked, setChecked] = useState(initialChecked);
  return <label htmlFor={id} className={styles.switchRow}>
    <span className="type-label">{label}</span>
    <span className={styles.switchValue}>
      <span className="type-label" aria-hidden="true">{checked ? "ON" : "OFF"}</span>
      <Switch id={id} surface={surface} checked={checked} onCheckedChange={setChecked} disabled={disabled} loading={loading} aria-label={label} />
    </span>
  </label>;
}

export default function SwitchExamples() {
  return <section className={styles.section} aria-labelledby="switch-contract-title">
    <div className={styles.heading}>
      <h2 id="switch-contract-title" className="type-section-title">ON/OFF 스위치</h2>
      <p className="type-body text-zinc-600">흰색·밝은 회색은 같은 밝은 배경용 스타일, 어두운 배경은 반전 스타일을 사용합니다. 색상과 손잡이 위치로 상태를 구분하며, 비활성 상태도 윤곽을 유지합니다.</p>
    </div>
    <div className={styles.switchGrid}>
      {([
        ["white", "흰색 배경", "light"],
        ["muted", "회색 배경", "light"],
        ["dark", "어두운 배경", "dark"],
      ] as const).map(([background, title, surface]) => <article key={background} data-switch-example={background} className={styles.switchSurface} aria-label={title}>
        <h3 className="type-content-title">{title}</h3>
        <SwitchExample surface={surface} label={`${title} 사용 설정 1`} initialChecked={false} />
        <SwitchExample surface={surface} label={`${title} 사용 설정 2`} initialChecked />
        <SwitchExample surface={surface} label={`${title} 변경 불가 1`} initialChecked={false} disabled />
        <SwitchExample surface={surface} label={`${title} 변경 불가 2`} initialChecked disabled />
        <SwitchExample surface={surface} label={`${title} 저장 중 OFF`} initialChecked={false} loading />
        <SwitchExample surface={surface} label={`${title} 저장 중 ON`} initialChecked loading />
        <p className="type-body-sm">‘변경 불가’는 현재 상태를 보여주며 조작할 수 없습니다.</p>
      </article>)}
    </div>
    <p className="type-body-sm text-zinc-600">클릭·Space·Enter로 변경해 보세요. 손잡이 왼쪽은 OFF, 오른쪽은 ON이며 화면의 예시만 바뀝니다. Tab 포커스와 48×44px 조작 영역을 공통으로 제공합니다.</p>
    <div className={styles.heading}>
      <h3 className="type-content-title">편집기에서도 같은 스위치 사용</h3>
      <p className="type-body-sm text-zinc-600">폼의 이름·체크값·연결된 폼과 켜기 제한을 유지합니다. 아래 예시는 저장되지 않습니다.</p>
    </div>
    <form id="switch-form-example" className="site-stack-block">
      <SwitchField name="switch_demo_visibility" label="예시 콘텐츠 표시" defaultChecked description="편집기의 체크값을 사용하는 예시입니다." />
      <SwitchField name="switch_demo_blocked" label="준비 후 사용 가능한 예시" canTurnOn={false} blockedMessage="필요한 준비를 먼저 완료해 주세요." />
    </form>
    <p className="type-footnote text-zinc-600">KRDS의 스위치 대비·상태 표현과 불투명한 비활성 색상 원칙을 참고했습니다. 비활성 요소는 WCAG 대비 의무의 예외지만, 아티메뉴는 비활성 스위치에도 3:1 이상의 식별 대비를 적용합니다.</p>
  </section>;
}
