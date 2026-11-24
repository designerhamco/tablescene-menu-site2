"use client";
import { useState } from "react";
import { updateMenuPopupSettingsAction } from "@/app/mypage/menus/actions";
import { MAX_MENU_POPUP_IMAGES, type MenuPopupSettings } from "@/lib/menu-popup";
import ImageUploadField from "./ImageUploadField";
import { ContentPanel } from "@/app/components/ui/content-panel";
import { ArrowLeft, ArrowRight } from "@/app/components/ui/site-arrow";
import HelpTooltip from "@/components/ui/HelpTooltip";
import SwitchField from "./SwitchField";
import DirtySubmitButton from "./DirtySubmitButton";

export default function MenuPopupSettingsForm({ menuId, settings, disabled, basic = false }: { menuId: string; settings: MenuPopupSettings; disabled: boolean; basic?: boolean }) {
  const [enabled, setEnabled] = useState(settings.enabled);
  const [images, setImages] = useState(() => settings.images.map((image, index) => ({ ...image, key: `saved-${index}` })));
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploadPending, setUploadPending] = useState(false);
  const selectedIndex = images.findIndex((image) => image.key === selectedImage);

  function moveImage(index: number, direction: -1 | 1) {
    setImages((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  const payload = JSON.stringify(images.filter((image) => image.imageUrl).map(({ imageUrl, imagePath }) => ({ imageUrl, imagePath })));
  const addImage = () => {
    const key = crypto.randomUUID();
    setImages((current) => current.length >= MAX_MENU_POPUP_IMAGES ? current : [...current, { imageUrl: "", imagePath: null, key }]);
    if (basic) setSelectedImage(key);
  };
  const imageInput = (image: typeof images[number], index: number) => (
    <ImageUploadField key={image.key} label={`광고 이미지 ${index + 1}`} editorLayout={basic} hidePreview={basic} onUploadPendingChange={basic ? setUploadPending : undefined} menuId={menuId} target="menu-popup-image-draft" recordId={String(index)} currentUrl={image.imageUrl}
      uploadSuccessMessage="광고 이미지가 임시 업로드되었습니다. 저장을 눌러 반영하세요."
      onDraftImageChange={(draft) => setImages((current) => current.map((entry) => entry.key === image.key ? { ...entry, imageUrl: draft.imageUrl ?? "", imagePath: draft.imagePath } : entry))} />
  );

  if (basic) return (
    <form id="menu-popup-settings-form" action={updateMenuPopupSettingsAction}>
      <fieldset disabled={disabled} className="site-stack-group">
        <input type="hidden" name="menuId" value={menuId} />
        <input type="hidden" name="popup_images" value={payload} />
        <div className="site-content-heading-row">
          <div className="site-action-row">
            <h3 className="type-content-title">광고 이미지 등록</h3>
            <HelpTooltip label="광고 이미지 도움말">메뉴판을 처음 열 때 최대 3장의 이미지가 등록 순서대로 표시됩니다. 긴 이미지는 일부 잘릴 수 있으니 미리보기에서 확인해 주세요.</HelpTooltip>
          </div>
          <SwitchField name="popup_enabled" label="광고 사용" defaultChecked={enabled} onCheckedChange={setEnabled} compact disabled={disabled} />
        </div>
        <div className="site-action-row">
          <button type="button" className="site-button site-button-outline" disabled={uploadPending || images.length >= MAX_MENU_POPUP_IMAGES} onClick={addImage}>
            광고 이미지 추가 {images.length}/{MAX_MENU_POPUP_IMAGES}
          </button>
        </div>
        {selectedIndex >= 0 && imageInput(images[selectedIndex], selectedIndex)}
        <div className="site-basic-editor-cards">
          {images.map((image, index) => (
            <ContentPanel key={image.key} surface="muted" density="compact">
              <div className="site-editor-ad-thumbnail">
                {image.imageUrl ? (
                  // The upload field validates and stores this menu's image URL.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={image.imageUrl} alt={`광고 이미지 ${index + 1}`} />
                ) : <p className="type-body-sm site-copy-muted">이미지 등록 대기</p>}
              </div>
              <p className="type-caption site-copy-muted">노출 순서 {index + 1}/{images.length}</p>
              <div className="site-action-row">
                <button type="button" className="site-button site-button-outline site-button-icon" disabled={uploadPending || index === 0} onClick={() => moveImage(index, -1)} aria-label={`광고 이미지 ${index + 1} 앞으로`}><ArrowLeft aria-hidden /></button>
                <button type="button" className="site-button site-button-outline site-button-icon" disabled={uploadPending || index === images.length - 1} onClick={() => moveImage(index, 1)} aria-label={`광고 이미지 ${index + 1} 뒤로`}><ArrowRight aria-hidden /></button>
                <button type="button" className="site-button site-button-outline" disabled={uploadPending} aria-pressed={image.key === selectedImage} onClick={() => setSelectedImage(image.key)}>수정</button>
                <button type="button" className="site-button site-button-outline-danger" disabled={uploadPending} onClick={() => setImages((current) => current.filter((entry) => entry.key !== image.key))}>제외</button>
              </div>
            </ContentPanel>
          ))}
        </div>
        {enabled && !images.some((image) => image.imageUrl) && <p className="type-body-sm">광고를 사용하려면 이미지를 한 장 이상 등록해 주세요.</p>}
        <div className="site-content-divider">
          <div className="site-action-row" data-distribution="center">
            <DirtySubmitButton formId="menu-popup-settings-form" className="site-button site-button-primary" disabled={uploadPending || (enabled && !images.some((image) => image.imageUrl))}>최종 저장</DirtySubmitButton>
          </div>
        </div>
      </fieldset>
    </form>
  );

  return <form id="menu-popup-settings-form" action={updateMenuPopupSettingsAction}>
    <fieldset disabled={disabled} className="space-y-5">
      <input type="hidden" name="menuId" value={menuId} />
      <input type="hidden" name="popup_images" value={payload} />
      <label className="flex items-center gap-2 text-copy font-medium"><input type="checkbox" name="popup_enabled" checked={enabled} onChange={e => setEnabled(e.target.checked)} className="h-4 w-4 accent-zinc-950" />광고 사용</label>
      <p className="text-copy leading-relaxed text-zinc-600">메뉴판을 열면 처음에 표시됩니다. 이미지는 최대 3개이며 광고창 너비에 맞춰 표시됩니다. 화면 높이를 넘는 긴 이미지는 일부 잘릴 수 있으므로 미리보기에서 확인해주세요.</p>
      {images.map((image, index) => <div key={image.key} className="space-y-2">
        {imageInput(image, index)}
        <button type="button" className="site-button site-button-secondary" onClick={() => setImages(current => current.filter(entry => entry.key !== image.key))}>이미지 {index + 1} 제외</button>
      </div>)}
      {images.length < MAX_MENU_POPUP_IMAGES ? <button type="button" className="site-button site-button-secondary" onClick={addImage}>광고 이미지 추가 ({images.length}/3)</button> : null}
      <p className="text-support text-zinc-600">등록 순서대로 표시됩니다. 이미지는 저장 후 공개 메뉴판에 반영됩니다.</p>
      <div className="flex justify-center"><DirtySubmitButton formId="menu-popup-settings-form" className="site-button site-button-primary">광고 저장</DirtySubmitButton></div>
    </fieldset>
  </form>;
}
