import Link from "next/link";
import { ArrowUpRight } from "@/app/components/ui/site-arrow";
import { ContentPanel } from "@/app/components/ui/content-panel";
import ResetTabActionButton from "./ResetTabActionButton";

export default function BasicDesignWorkspace({ menuId, saved, disabled, canPreview, pendingDesign, pendingReset = false }: {
  menuId: string;
  saved: boolean;
  disabled: boolean;
  canPreview: boolean;
  pendingDesign?: string;
  pendingReset?: boolean;
}) {
  const query = new URLSearchParams({ editDesign: "1" });
  if (pendingReset) query.set("designReset", "1");
  if (pendingDesign) {
    query.set("designPreview", pendingDesign);
    query.set("designReturnDraft", pendingDesign);
  }
  return (
    <section className="site-stack-block">
      <ContentPanel surface="muted" data-basic-design-launch>
        <div className="site-stack-copy" data-basic-design-launch-actions>
          {pendingReset || pendingDesign ? <p className="type-body-sm" role="status">{pendingReset ? "템플릿 샘플 디자인을 임시 반영했어요." : "디자인 변경사항을 임시 반영했어요."} 최종 저장을 누르면 적용됩니다.</p> : saved && <p className="type-body-sm" role="status">디자인 저장 완료</p>}
          {!disabled && canPreview ? (
            <Link href={`/mypage/menus/${menuId}/preview?${query}`} className="site-button site-button-outline">
              디자인 설정 <ArrowUpRight aria-hidden />
            </Link>
          ) : (
            <button type="button" className="site-button site-button-outline" disabled>디자인 설정</button>
          )}
        </div>
      </ContentPanel>
      <div className="site-action-row" data-distribution="end">
        <ResetTabActionButton menuId={menuId} kind="design" disabled={disabled || (pendingReset && !pendingDesign)}
          draftHref={`/mypage/menus/${encodeURIComponent(menuId)}/edit?tab=design&designReset=1`} />
      </div>
    </section>
  );
}
