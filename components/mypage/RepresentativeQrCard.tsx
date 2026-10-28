import QrAddressActions from "@/components/mypage/QrAddressActions";
import type { MenuQrDownloadData } from "@/lib/menu-qr-downloads";

export default function RepresentativeQrCard({ data }: { data: MenuQrDownloadData }) {
  return (
    <section className="site-section p-5 sm:p-6">
      <h3 className="type-subsection-title">대표 메뉴 QR</h3>
      <p className="type-body-sm mt-3 max-w-3xl break-keep text-zinc-500">
        매장 입구·포스터·SNS에서 사용하는 대표 QR입니다. 테이블 정보 없이 메뉴판을 공유합니다.
      </p>
      <QrAddressActions
        copyKey="representative"
        feedbackLabel="대표 메뉴"
        fileName={`arti-menu-${data.menuSite.slug}-qr.png`}
        path={`/menu/${encodeURIComponent(data.menuSite.slug)}?mode=customer`}
        publicBaseUrl={data.publicBaseUrl}
        disabled={!data.canDownloadRepresentativeQr}
        disabledReason={data.representativeQrDisabledReason}
      />
    </section>
  );
}
