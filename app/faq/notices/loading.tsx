import SitePage from "@/components/layout/SitePage";
import { LoadingState } from "@/app/components/ui/loading-state";

export default function NoticesLoading() {
  return <SitePage title="공지사항" description="아티메뉴의 서비스 소식과 업데이트를 확인하세요."><LoadingState label="공지사항을 불러오는 중입니다." /></SitePage>;
}
