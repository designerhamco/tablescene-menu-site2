import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import SitePage from "@/components/layout/SitePage";
import { ContentPanel } from "@/app/components/ui/content-panel";
import { Table,TableHeader,TableBody,TableRow,TableHead,TableCell } from "@/app/components/ui/table";
import AlimtalkRefundAdminActions from "@/components/mypage/AlimtalkRefundAdminActions";
import { AlimtalkRefundError, loadAlimtalkRefundQueue, loadAlimtalkRefundDetail } from "@/lib/server/alimtalk-refund-service";
import { ALIMTALK_REFUND_LABELS } from "@/lib/alimtalk-wallet";
import { formatKoreanDateTime } from "@/lib/korean-date-time";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:"알림톡 환불 관리 | 아티메뉴",robots:{index:false,follow:false}};
const won=(amount:number)=>`${amount.toLocaleString("ko-KR")}원`;
const pageNumber=(value?:string)=>value&&/^\d+$/.test(value)&&Number(value)>0&&Number(value)<=20000?Number(value):1;
const statusLabel=(state:string)=>ALIMTALK_REFUND_LABELS[state as keyof typeof ALIMTALK_REFUND_LABELS]??state;
export default async function AlimtalkRefundAdminPage({searchParams}:{searchParams:Promise<{request?:string;page?:string;paymentPage?:string}>}) {
  const query=await searchParams; let content:ReactNode;
  let queue:Awaited<ReturnType<typeof loadAlimtalkRefundQueue>>|undefined;
  let detail:Awaited<ReturnType<typeof loadAlimtalkRefundDetail>>|undefined;
  let errorMessage:string|undefined;
  const page=pageNumber(query.request?query.paymentPage:query.page);
  try {
    if(query.request)detail=await loadAlimtalkRefundDetail(query.request,page);
    else queue=await loadAlimtalkRefundQueue(page);
  }catch(error){errorMessage=error instanceof AlimtalkRefundError?error.message:"환불 신청을 불러오지 못했습니다. 입력 주소와 권한을 확인해 주세요.";}
    if(detail) {
      const r=detail.request;
      content=<div className="site-stack-group"><Link href="/admin/alimtalk-refunds" className="site-button site-button-link">환불 신청 목록으로</Link>
        <ContentPanel><div className="site-content-heading-row"><h2 className="type-section-title">{statusLabel(r.state)}</h2><span className="type-caption">{formatKoreanDateTime(r.created_at)}</span></div>
          <p className="type-caption site-copy-muted break-all">신청 {r.id} · 계정 {r.owner_id}</p>
          <dl className="site-field-grid"><div className="site-stack-copy"><dt className="type-label">환불 신청 금액 · 수수료 0원</dt><dd className="type-content-title">{won(r.amount)}</dd></div>
            <div className="site-stack-copy"><dt className="type-label">결제사 취소 확인 금액</dt><dd className="type-content-title">{won(r.refunded_amount)}</dd></div></dl>
          <p className="type-body-sm">‘환불 처리 시작’은 담당자와 처리 상태만 기록합니다. 원래 결제수단의 취소는 아래 결제별 금액을 확인해 포트원에서 처리하세요. 실제 취소가 조회되어야 환불 완료로 반영됩니다.</p>
          <AlimtalkRefundAdminActions id={r.id} state={r.state} paymentPage={page}/>
          <Table variant="management" label="알림톡 환불 대상 원 결제"><TableHeader><TableRow><TableHead>원 결제 ID</TableHead><TableHead align="end">이번 환불 금액</TableHead><TableHead align="end">확인된 환불액</TableHead></TableRow></TableHeader>
            <TableBody>{detail.payments.map(payment=><TableRow key={payment.payment_id}><TableCell><span className="type-caption break-all">{payment.payment_id}</span></TableCell><TableCell nowrap align="end">{won(payment.amount)}</TableCell><TableCell nowrap align="end">{won(payment.refunded_amount)}</TableCell></TableRow>)}</TableBody></Table>
          <nav className="site-action-row" aria-label="환불 대상 결제 페이지">{page>1&&<Link className="site-button site-button-outline" href={`/admin/alimtalk-refunds?request=${r.id}&paymentPage=${page-1}`}>이전</Link>}
            <span className="type-caption">{page} / {Math.max(1,Math.ceil(detail.total/50))}</span>{page*50<detail.total&&<Link className="site-button site-button-outline" href={`/admin/alimtalk-refunds?request=${r.id}&paymentPage=${page+1}`}>다음</Link>}</nav>
        </ContentPanel></div>;
    }else if(queue) {
      content=<div className="site-stack-group"><Link href="/admin" className="site-button site-button-link">운영자 관리자 페이지로</Link>
        {queue.rows.length===0?<p className="type-body-sm">알림톡 환불 신청이 없습니다.</p>:<Table variant="management" label="알림톡 환불 신청 목록"><TableHeader><TableRow><TableHead>신청일</TableHead><TableHead>메뉴판</TableHead><TableHead align="end">신청 금액</TableHead><TableHead>상태</TableHead><TableHead>처리</TableHead></TableRow></TableHeader>
          <TableBody>{queue.rows.map(r=><TableRow key={r.id}><TableCell nowrap><span className="type-caption">{formatKoreanDateTime(r.created_at)}</span></TableCell><TableCell>{r.menuName}</TableCell><TableCell nowrap align="end">{won(r.amount)}</TableCell><TableCell nowrap>{statusLabel(r.state)}</TableCell><TableCell><Link className="site-button site-button-outline" href={`/admin/alimtalk-refunds?request=${r.id}`}>열기</Link></TableCell></TableRow>)}</TableBody></Table>}
        <nav className="site-action-row" aria-label="알림톡 환불 신청 페이지">{page>1&&<Link className="site-button site-button-outline" href={`/admin/alimtalk-refunds?page=${page-1}`}>이전</Link>}
          <span className="type-caption">{page} / {Math.max(1,Math.ceil(queue.total/50))}</span>{page*50<queue.total&&<Link className="site-button site-button-outline" href={`/admin/alimtalk-refunds?page=${page+1}`}>다음</Link>}</nav>
      </div>;
    }else content=<p className="type-body-sm" role="alert">{errorMessage}</p>;
  return <SitePage title="알림톡 환불 관리" typography="management" align="start">{content}</SitePage>;
}
