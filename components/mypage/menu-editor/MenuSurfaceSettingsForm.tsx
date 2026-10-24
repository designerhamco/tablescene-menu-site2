"use client";
import { useState } from "react";
import PreviewColorPicker from "@/components/menu/PreviewColorPicker";
import { hasFixedHeaderAlignment, menuSurfaceDefaults, menuSurfaceSupport, readMenuSurfaceSettings, REPRESENTATIVE_ALIGNMENTS, type MenuSurfaceSettings } from "@/lib/menu-design-surfaces";

export default function MenuSurfaceSettingsForm({ pageSettings, settings, templateKey, formId, disabled = false }: { pageSettings: unknown; settings: unknown; templateKey: string; formId: string; disabled?: boolean }) {
  const [value, setValue] = useState(() => readMenuSurfaceSettings(pageSettings));
  const alignmentFixed = hasFixedHeaderAlignment(templateKey, settings);
  const defaults = menuSurfaceDefaults(templateKey, settings), support = menuSurfaceSupport(templateKey);
  const color = (key: Exclude<keyof MenuSurfaceSettings, "representativeAlignment">, label: string, fallback: string | null) => <div className="min-w-0" key={key}>
    <input type="hidden" form={formId} name={`surface_${key}`} value={value[key] ?? ""} />
    <PreviewColorPicker label={label} value={value[key]} defaultColor={fallback} disabled={disabled} onChange={next => setValue(current => ({ ...current, [key]: next }))} />
  </div>;
  return <section className="site-section site-editor-subpanel space-y-5 p-5" aria-label="배경과 대표영역 설정">
    <input type="hidden" form={formId} name="menu_surfaces_present" value="1" />
    <input type="hidden" form={formId} name="background_color" value={value.pageBackground ?? defaults.pageBackground} />
    <div><h3 className="type-content-title text-zinc-950">배경과 대표영역</h3><p className="mt-2 text-sm leading-relaxed text-zinc-500">색상 옆 되돌리기를 누르면 템플릿 기본값으로 돌아갑니다. 변경 후 저장하면 미리보기와 공개 메뉴판에 함께 적용됩니다.</p></div>
    <div className="grid grid-cols-2 gap-x-4 gap-y-5">
      {color("pageBackground", support.dining ? "본문 페이지 배경색" : "페이지 배경색", defaults.pageBackground)}
      {support.basic ? color("auxiliaryBackground", "보조 배경색", defaults.auxiliaryBackground) : color("coverBackground", "커버 배경색", defaults.coverBackground)}
      {support.sidebar ? color("sidebarBackground", "좌측 메뉴열 배경색", defaults.sidebarBackground) : null}
      {support.dining ? <input type="hidden" form={formId} name="surface_coverDescriptionColor" value={value.coverDescriptionColor ?? ""} /> : null}
    </div>
    {support.basic ? <>
      {alignmentFixed ? <input type="hidden" form={formId} name="representative_alignment" value={value.representativeAlignment ?? "template"} /> : null}
      <label className="block space-y-2 text-sm font-semibold">가게명·가게 설명 정렬<select form={formId} name="representative_alignment" value={alignmentFixed ? "template" : value.representativeAlignment ?? "template"} disabled={disabled || alignmentFixed} className="site-field block h-10 w-full border-zinc-200 px-3 text-zinc-900 disabled:cursor-not-allowed disabled:text-zinc-400" onChange={event => setValue(current => ({ ...current, representativeAlignment: event.target.value === "template" ? undefined : event.target.value as MenuSurfaceSettings["representativeAlignment"] }))}>
        <option value="template">템플릿 기본값</option>{REPRESENTATIVE_ALIGNMENTS.map(align => <option key={align} value={align}>{{ left: "왼쪽 정렬", center: "가운데 정렬", right: "오른쪽 정렬" }[align]}</option>)}
      </select></label>
      {alignmentFixed ? <p className="text-xs leading-relaxed text-zinc-500">PC·태블릿의 상단행은 가게명 중앙·가게 설명 왼쪽 정렬로 고정됩니다. 저장된 모바일 정렬은 유지됩니다.</p> : null}
      <p className="text-xs leading-relaxed text-zinc-500">보조 배경색은 대표영역에 적용됩니다. 페이지와 색상이 다르면 패널 안쪽 여백과 열 사이 간격을 함께 조정합니다. {alignmentFixed ? "" : "가게명과 가게 설명의 정렬은 모든 기기에 적용됩니다. "}대표 상품 정보는 항상 왼쪽 정렬을 유지합니다.</p>
    </> : <p className="text-xs leading-relaxed text-zinc-500">커버 이미지의 배경 불투명도는 커버 설정을 따릅니다.{support.sidebar ? " 좌측 메뉴열 색상은 모바일의 페이지 탭에도 적용됩니다." : ""}</p>}
  </section>;
}
