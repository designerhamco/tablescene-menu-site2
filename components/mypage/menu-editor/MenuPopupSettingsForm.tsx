"use client";
import { useState } from "react";
import { updateMenuPopupSettingsAction } from "@/app/mypage/menus/actions";
import { MAX_MENU_POPUP_IMAGES, type MenuPopupSettings } from "@/lib/menu-popup";
import ImageUploadField from "./ImageUploadField";
import DirtySubmitButton from "./DirtySubmitButton";

export default function MenuPopupSettingsForm({ menuId, settings, disabled }: { menuId: string; settings: MenuPopupSettings; disabled: boolean }) {
  const [enabled, setEnabled] = useState(settings.enabled);
  const [images, setImages] = useState(() => settings.images.map((image, index) => ({ ...image, key: `saved-${index}` })));
  return <form id="menu-popup-settings-form" action={updateMenuPopupSettingsAction}>
    <fieldset disabled={disabled} className="space-y-5">
      <input type="hidden" name="menuId" value={menuId} />
      <input type="hidden" name="popup_images" value={JSON.stringify(images.filter(image => image.imageUrl).map(({ imageUrl, imagePath }) => ({ imageUrl, imagePath })))} />
      <label className="flex items-center gap-2 text-copy font-medium"><input type="checkbox" name="popup_enabled" checked={enabled} onChange={e => setEnabled(e.target.checked)} className="h-4 w-4 accent-zinc-950" />광고 사용</label>
      <p className="text-copy leading-relaxed text-zinc-600">메뉴판을 열면 처음에 표시됩니다. 이미지는 최대 3개이며 광고창 너비에 맞춰 표시됩니다. 화면 높이를 넘는 긴 이미지는 일부 잘릴 수 있으므로 미리보기에서 확인해주세요.</p>
      {images.map((image, index) => <div key={image.key} className="space-y-2">
        <ImageUploadField label={`광고 이미지 ${index + 1}`} menuId={menuId} target="menu-popup-image-draft" recordId={String(index)} currentUrl={image.imageUrl}
          uploadSuccessMessage="광고 이미지가 임시 업로드되었습니다. 저장을 눌러 반영하세요."
          onDraftImageChange={draft => setImages(current => current.map(entry => entry.key === image.key ? { ...entry, imageUrl: draft.imageUrl ?? "", imagePath: draft.imagePath } : entry))} />
        <button type="button" className="site-button site-button-secondary" onClick={() => setImages(current => current.filter(entry => entry.key !== image.key))}>이미지 {index + 1} 제외</button>
      </div>)}
      {images.length < MAX_MENU_POPUP_IMAGES ? <button type="button" className="site-button site-button-secondary" onClick={() => setImages(current => [...current, { imageUrl: "", imagePath: null, key: crypto.randomUUID() }])}>광고 이미지 추가 ({images.length}/3)</button> : null}
      <p className="text-support text-zinc-600">등록 순서대로 표시됩니다. 이미지는 저장 후 공개 메뉴판에 반영됩니다.</p>
      <div className="flex justify-center"><DirtySubmitButton formId="menu-popup-settings-form" className="site-button site-button-primary">광고 저장</DirtySubmitButton></div>
    </fieldset>
  </form>;
}
