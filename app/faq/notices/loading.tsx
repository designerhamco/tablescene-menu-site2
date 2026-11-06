import SitePage from "@/components/layout/SitePage";
import { LoadingState } from "@/app/components/ui/loading-state";

export default function NoticesLoading() {
  return <SitePage title="공지사항"><LoadingState label="공지사항을 불러오는 중입니다." /></SitePage>;
}
