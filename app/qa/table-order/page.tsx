import OfficialSiteNavbar from "@/components/layout/OfficialSiteNavbar";
import TableOrderLab from "./TableOrderLab";
export const metadata = {
  title: "스크롤 메뉴·후불 주문 테스트 | 아티메뉴",
  robots: { index: false, follow: false },
};
export default function Page() {
  return (
    <>
      <OfficialSiteNavbar />
      <main className="site-container site-page-spacing">
        <h1 className="type-page-title">메뉴·후불 주문 테스트</h1>
        <p className="site-body mt-5 max-w-3xl text-zinc-500">
          리얼맛차 원본을 보존한 스크롤 테스트 버전입니다. 아래 주문과 상태
          변경은 이 화면 안에서만 체험하며 실제 매장·결제·운영 데이터에 저장하지
          않습니다.
        </p>
        <TableOrderLab />
      </main>
    </>
  );
}
