import { ContentPanel } from "@/app/components/ui/content-panel";
import { Switch } from "@/app/components/ui/switch";
export default function OrderReadyNotificationSettings() {
  return (
    <ContentPanel surface="muted" aria-label="알림톡 설정 준비">
      <div className="site-content-heading-row">
        <h3 className="type-content-title">조리완료 알림톡</h3>
        <span className="type-body-sm site-copy-muted">연동 준비 중</span>
      </div>
      <p className="type-body-sm site-copy-muted">
        개인 기기로 주문할 때 입력한 번호로 조리 완료를 안내할 예정입니다.
        현재는 카카오 연결 및 실제 발송을 제공하지 않습니다.
      </p>
      <label className="site-action-row type-label site-copy-muted">
        <Switch disabled />
        알림톡 사용 · 준비 중
      </label>
      <div className="site-stack-copy">
        <p className="type-label">메시지 미리보기</p>
        <p className="type-body-sm">
          주문하신 메뉴가 준비되었습니다. 픽업대에서 받아 주세요.
        </p>
      </div>
    </ContentPanel>
  );
}
