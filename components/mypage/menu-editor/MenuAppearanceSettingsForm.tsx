"use client";
import { useState } from "react";
import { ALBUM_IMAGE_RATIOS, IMAGE_RADIUS_KEYS, unifiedAppearanceRadius, withUnifiedAppearanceRadius, type MenuAppearance } from "@/lib/menu-appearance";
import ImageRadiusSelect from "@/components/menu/ImageRadiusSelect";
export default function MenuAppearanceSettingsForm({ initial, basic, album = false, formId }: { initial: MenuAppearance; basic: boolean; album?: boolean; formId: string }) {
  const [value,setValue] = useState(initial);
  const inputClass = "site-field h-10 px-3";
  const radius = unifiedAppearanceRadius(value, basic);
  return <section className="site-section site-editor-subpanel space-y-5 p-5" aria-label="이미지와 텍스트칩 모양">
    <input type="hidden" name="menu_appearance_present" value="1" form={formId}/>
    {IMAGE_RADIUS_KEYS.map(key => <input key={key} type="hidden" form={formId} name={`image_radius_${key}`} value={value.imageRadii[key] ?? ""}/>)}
    <input type="hidden" form={formId} name="chip_shape" value={value.chipShape}/>
    <div><h3 className="type-content-title text-zinc-950">이미지와 텍스트칩 모양</h3><p className="mt-2 text-sm leading-relaxed text-zinc-500">라운드 하나로 이미지와 텍스트칩 모양을 함께 바꿉니다. 기존에 저장한 개별 설정은 다른 단계를 선택하기 전까지 유지됩니다.</p></div>
    {album ? <>
      <label className="flex flex-wrap items-center gap-3 text-sm font-semibold">앨범형 상품 이미지 비율<select form={formId} name="album_image_ratio" className={inputClass} value={value.albumImageRatio} onChange={e=>setValue(v=>({...v,albumImageRatio:e.target.value as MenuAppearance['albumImageRatio']}))}>{ALBUM_IMAGE_RATIOS.map(ratio=><option key={ratio} value={ratio}>{ratio}{ratio==='1:1'?' · 기본':''}</option>)}</select></label>
      <p className="text-xs leading-relaxed text-zinc-500">상품 이미지 비율은 앨범형에만 적용됩니다. 대표 이미지와 코스 카테고리의 이미지 표시 규칙은 유지됩니다.</p>
    </> : <input type="hidden" form={formId} name="album_image_ratio" value={value.albumImageRatio} />}
    <label className="block space-y-2 text-sm font-semibold">이미지 라운드<ImageRadiusSelect label="이미지·텍스트칩" radius={radius.radius} mixed={radius.mixed} className={`${inputClass} w-full`} onChange={next=>setValue(current=>withUnifiedAppearanceRadius(current,next,basic))}/></label>
    <p className="text-xs leading-relaxed text-zinc-500">광고·{basic ? "대표·" : ""}위젯·상품 이미지와 텍스트칩에 함께 적용됩니다. 로고는 원래 모양을 유지합니다.</p>
  </section>;
}
