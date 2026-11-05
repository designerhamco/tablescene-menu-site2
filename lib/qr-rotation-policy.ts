export function canRotateTableQr(menuStatus: string, pointStatus: string) {
  return (
    ["draft", "published"].includes(menuStatus) &&
    ["active", "disabled"].includes(pointStatus) &&
    (menuStatus === "draft" || pointStatus === "disabled")
  );
}
export const QR_ROTATION_BLOCKED_MESSAGE =
  "이용 중인 손님이 없는지 확인한 뒤 메뉴판을 비공개로 바꾸거나, 해당 테이블·키오스크를 일시정지해 주세요.";
