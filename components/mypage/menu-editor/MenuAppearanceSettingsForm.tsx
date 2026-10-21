"use client";
import { useState } from "react";
import { ALBUM_IMAGE_RATIOS, CHIP_SHAPES, CHIP_SHAPE_LABELS, IMAGE_RADIUS_KEYS, IMAGE_RADIUS_LABELS, type MenuAppearance } from "@/lib/menu-appearance";
import ImageRadiusSelect from "@/components/menu/ImageRadiusSelect";
export default function MenuAppearanceSettingsForm({ initial, basic, formId }: { initial: MenuAppearance; basic: boolean; formId: string }) {
  const [value,setValue] = useState(initial);
  const inputClass = "h-10 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900";
  return <section className="site-section space-y-5 p-5" aria-label="이미지와 텍스트칩 모양">
    <input type="hidden" name="menu_appearance_present" value="1" form={formId}/>
    <div><h3 className="type-content-title text-zinc-950">이미지와 텍스트칩 모양</h3><p className="mt-2 text-sm leading-relaxed text-zinc-500">템플릿 기본값을 유지하거나 원하는 둥글기 단계를 선택하세요. 기존에 저장한 모양은 다른 단계를 선택할 때까지 유지됩니다.</p></div>
      <div className="grid grid-cols-2 gap-3">{IMAGE_RADIUS_KEYS.map(key=>{const radius=value.imageRadii[key],label=key==='cover'&&!basic?'커버 이미지':IMAGE_RADIUS_LABELS[key];return <fieldset key={key} className="min-w-0 space-y-2 rounded-xl border border-zinc-200 p-3">
        <legend className="px-1 text-sm font-semibold">{label} 라운드</legend>
        <input type="hidden" form={formId} name={`image_radius_${key}`} value={radius??""}/>
        <ImageRadiusSelect label={label} radius={radius} className={`${inputClass} w-full min-w-0`} onChange={next=>setValue(v=>({...v,imageRadii:{...v.imageRadii,[key]:next}}))}/>
      </fieldset>;})}</div>
      <label className="flex flex-wrap items-center gap-3 text-sm font-semibold">텍스트칩 모양<select form={formId} name="chip_shape" className={inputClass} value={value.chipShape} onChange={e=>setValue(v=>({...v,chipShape:e.target.value as MenuAppearance['chipShape']}))}>{CHIP_SHAPES.map(shape=><option key={shape} value={shape}>{CHIP_SHAPE_LABELS[shape]}</option>)}</select></label>
    <label className="flex flex-wrap items-center gap-3 text-sm font-semibold">앨범형 상품 이미지 비율<select form={formId} name="album_image_ratio" className={inputClass} value={value.albumImageRatio} onChange={e=>setValue(v=>({...v,albumImageRatio:e.target.value as MenuAppearance['albumImageRatio']}))}>{ALBUM_IMAGE_RATIOS.map(ratio=><option key={ratio} value={ratio}>{ratio}{ratio==='1:1'?' · 기본':''}</option>)}</select></label>
    <p className="text-xs leading-relaxed text-zinc-500">상품 이미지 비율은 앨범형에만 적용되며 PC·태블릿·모바일에서 동일합니다. 대표 이미지와 코스 카테고리의 이미지 표시 규칙은 유지됩니다.</p>
  </section>;
}
