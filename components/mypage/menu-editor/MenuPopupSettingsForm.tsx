"use client";
import { useState } from "react";
import { updateMenuPopupSettingsAction } from "@/app/mypage/menus/actions";
import { MAX_MENU_POPUP_IMAGES, type MenuPopupSettings } from "@/lib/menu-popup";
import ImageUploadField from "./ImageUploadField";
import { X } from "@/app/components/ui/site-icon";
import { ArrowUp, ArrowDown } from "@/app/components/ui/site-arrow";
import { getImageUploadPolicy } from "@/lib/image-upload-policy";
import HelpTooltip from "@/components/ui/HelpTooltip";
import SwitchField from "./SwitchField";
import MenuEditorActionBar from "./MenuEditorActionBar";
import MenuEditorSaveFeedback from "./MenuEditorSaveFeedback";
import DirtySubmitButton from "./DirtySubmitButton";

export default function MenuPopupSettingsForm({ menuId, settings, disabled, basic = false, finalSaveError }: { menuId: string; settings: MenuPopupSettings; disabled: boolean; basic?: boolean; finalSaveError?: string | null }) {
  const [enabled, setEnabled] = useState(settings.enabled);
  const [images, setImages] = useState(() => settings.images.map((image, index) => ({ ...image, key: `saved-${index}` })));
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploadPending, setUploadPending] = useState(false);
  const selectedIndex = images.findIndex((image) => image.key === selectedImage);
  const isFull = images.length >= MAX_MENU_POPUP_IMAGES;
  const missingImage = enabled && !images.some((image) => image.imageUrl);

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
        <div className="site-stack-copy">
          <div className="site-content-heading-row" data-layout="toolbar">
            <div className="site-action-row">
              <h3 className="type-label">광고 이미지 등록</h3>
              <HelpTooltip label="광고 이미지 도움말">메뉴판을 처음 열 때 등록 순서대로 표시됩니다. 긴 이미지는 일부 잘릴 수 있으니 미리보기에서 확인해 주세요. 본인이 촬영했거나 사용 권한이 있는 이미지만 등록할 수 있습니다.</HelpTooltip>
            </div>
            <SwitchField name="popup_enabled" label="사용 여부" defaultChecked={enabled} onCheckedChange={setEnabled} compact disabled={disabled} />
          </div>
          <p className="type-caption site-copy-muted">광고 이미지는 최대 {MAX_MENU_POPUP_IMAGES}개까지 등록할 수 있습니다.</p>
          <ImageUploadField
            key={selectedImage ?? "add"}
            uploadButtonLabel={selectedImage ? "이미지 교체" : "파일 선택"}
            label={selectedIndex < 0 ? "광고 이미지 파일" : `광고 이미지 ${selectedIndex + 1} 교체`}
            menuId={menuId}
            editorLayout
            hidePreview
            hideDelete
            barePicker
            target="menu-popup-image-draft"
            recordId={String(selectedIndex < 0 ? images.length : selectedIndex)}
            currentUrl={images[selectedIndex]?.imageUrl}
            disabled={disabled || (isFull && selectedIndex < 0)}
            onUploadPendingChange={setUploadPending}
            uploadSuccessMessage="광고 이미지를 등록했습니다. 광고 설정 저장을 눌러 반영해 주세요."
            onDraftImageChange={({ imageUrl, imagePath }) => {
              if (!imageUrl) return;
              const newImage = { key: crypto.randomUUID(), imageUrl, imagePath };
              setImages((current) => selectedImage
                ? current.map((image) => image.key === selectedImage ? { ...newImage, key: selectedImage } : image)
                : current.length < MAX_MENU_POPUP_IMAGES ? [...current, newImage] : current);
            }}
          />
          {selectedImage && <div className="site-action-row" data-distribution="end"><button type="button" className="site-button site-button-outline site-button-compact" disabled={uploadPending} onClick={() => setSelectedImage(null)}>이미지 추가로 돌아가기</button></div>}
        </div>
        {images.length > 0 && (
          <ol className="site-basic-editor-cards">
            {images.map((image, index) => (
              <li key={image.key} className="site-stack-copy">
                <div className="site-editor-ad-thumbnail">
                  <button type="button" className="site-editor-ad-select" disabled={uploadPending}
                    aria-label={`광고 이미지 ${index + 1} 교체`} aria-pressed={image.key === selectedImage} onClick={() => setSelectedImage(image.key)}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image.imageUrl} alt={`광고 이미지 ${index + 1}`} />
                  </button>
                  <button type="button" className="site-button site-button-outline site-button-icon" data-icon-size="compact" disabled={uploadPending}
                    aria-label={`광고 이미지 ${index + 1} 제외`} onClick={() => {
                      setImages((current) => current.filter((entry) => entry.key !== image.key));
                      if (image.key === selectedImage) setSelectedImage(null);
                    }}><X aria-hidden /></button>
                </div>
                <div className="site-action-row" data-distribution="between">
                  <span className="type-caption">노출 순서 {index + 1}/{images.length}</span>
                  <div className="site-action-row" data-wrap="nowrap">
                    <button type="button" className="site-button site-button-outline site-button-icon" data-icon-size="compact" disabled={uploadPending || index === 0} onClick={() => moveImage(index, -1)} aria-label={`광고 이미지 ${index + 1} 앞으로`}><ArrowUp aria-hidden /></button>
                    <button type="button" className="site-button site-button-outline site-button-icon" data-icon-size="compact" disabled={uploadPending || index === images.length - 1} onClick={() => moveImage(index, 1)} aria-label={`광고 이미지 ${index + 1} 뒤로`}><ArrowDown aria-hidden /></button>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
        <p className="type-caption site-copy-muted">{getImageUploadPolicy("menu-popup-image-draft").label} · 업로드된 이미지는 화면에 맞게 자동 최적화될 수 있습니다.</p>
        <MenuEditorActionBar>
          <DirtySubmitButton formId="menu-popup-settings-form" className="site-button site-button-primary" disabled={uploadPending || missingImage}>광고 설정 저장</DirtySubmitButton>
          <MenuEditorSaveFeedback error={finalSaveError} issues={missingImage ? [{ message: "광고를 사용하려면 이미지를 한 장 이상 등록해 주세요." }] : []} />
      </MenuEditorActionBar>

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
      <MenuEditorActionBar><DirtySubmitButton formId="menu-popup-settings-form" className="site-button site-button-primary">광고 설정 저장</DirtySubmitButton><MenuEditorSaveFeedback error={finalSaveError} /></MenuEditorActionBar>
    </fieldset>
  </form>;
}
