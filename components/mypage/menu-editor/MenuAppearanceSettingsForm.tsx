"use client";
import { useState } from "react";
import { ALBUM_IMAGE_RATIOS, CHIP_SHAPES, CHIP_SHAPE_LABELS, IMAGE_RADIUS_KEYS, IMAGE_RADIUS_LABELS, MAX_IMAGE_RADIUS, type MenuAppearance } from "@/lib/menu-appearance";
export default function MenuAppearanceSettingsForm({ initial, basic, formId }: { initial: MenuAppearance; basic: boolean; formId: string }) {
  const [value,setValue] = useState(initial);
  const inputClass = "h-10 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900";
  return <section className="site-section space-y-5 p-5" aria-label="이미지와 텍스트칩 모양">
    <input type="hidden" name="menu_appearance_present" value="1" form={formId}/>
    <div><h3 className="type-content-title text-zinc-950">이미지와 텍스트칩 모양</h3><p className="mt-2 text-sm leading-relaxed text-zinc-500">템플릿 기본값을 유지하거나 원하는 모양으로 조절할 수 있습니다. 이미지 라운드는 0~32px 범위에서 입력하세요.</p></div>
    {basic ? <>
      <div className="grid gap-4 md:grid-cols-2">{IMAGE_RADIUS_KEYS.map(key=>{const radius=value.imageRadii[key];return <fieldset key={key} className="space-y-2 rounded-xl border border-zinc-200 p-4">
        <legend className="px-1 text-sm font-semibold">{IMAGE_RADIUS_LABELS[key]} 라운드</legend>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={radius==null} onChange={e=>setValue(v=>({...v,imageRadii:{...v.imageRadii,[key]:e.target.checked?undefined:0}}))}/>템플릿 기본값</label>
        <input type="hidden" form={formId} name={`image_radius_${key}`} value={radius??""}/>
        {radius!=null ? <div className="flex items-center gap-3"><input type="range" min={0} max={MAX_IMAGE_RADIUS} step={1} aria-label={`${IMAGE_RADIUS_LABELS[key]} 라운드 슬라이더`} value={radius} onChange={e=>setValue(v=>({...v,imageRadii:{...v.imageRadii,[key]:Number(e.target.value)}}))} className="min-w-0 flex-1 accent-zinc-950"/>
          <input type="number" min={0} max={MAX_IMAGE_RADIUS} step={1} required aria-label={`${IMAGE_RADIUS_LABELS[key]} 라운드 값`} className={`${inputClass} w-20`} value={radius} onChange={e=>{const n=e.currentTarget.valueAsNumber;if(Number.isFinite(n))setValue(v=>({...v,imageRadii:{...v.imageRadii,[key]:Math.max(0,Math.min(MAX_IMAGE_RADIUS,Math.round(n)))}}));}}/><span className="text-sm text-zinc-500">px</span></div>:<p className="text-xs text-zinc-500">현재 템플릿의 반응형 라운드를 그대로 사용합니다.</p>}
      </fieldset>;})}</div>
      <label className="flex flex-wrap items-center gap-3 text-sm font-semibold">텍스트칩 모양<select form={formId} name="chip_shape" className={inputClass} value={value.chipShape} onChange={e=>setValue(v=>({...v,chipShape:e.target.value as MenuAppearance['chipShape']}))}>{CHIP_SHAPES.map(shape=><option key={shape} value={shape}>{CHIP_SHAPE_LABELS[shape]}</option>)}</select></label>
    </> : <input type="hidden" form={formId} name="chip_shape" value={value.chipShape}/>}
    <label className="flex flex-wrap items-center gap-3 text-sm font-semibold">앨범형 상품 이미지 비율<select form={formId} name="album_image_ratio" className={inputClass} value={value.albumImageRatio} onChange={e=>setValue(v=>({...v,albumImageRatio:e.target.value as MenuAppearance['albumImageRatio']}))}>{ALBUM_IMAGE_RATIOS.map(ratio=><option key={ratio} value={ratio}>{ratio}{ratio==='1:1'?' · 기본':''}</option>)}</select></label>
    <p className="text-xs leading-relaxed text-zinc-500">상품 이미지 비율은 앨범형에만 적용되며 PC·태블릿·모바일에서 동일합니다. 대표 이미지와 코스 카테고리의 이미지 표시 규칙은 유지됩니다.</p>
  </section>;
}
