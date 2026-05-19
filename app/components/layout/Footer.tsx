import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/components/ui/dialog";

const Footer = () => {
  const showAdminLink = process.env.NODE_ENV !== "production";

  return (
    <footer className="bg-[#111111] text-zinc-400 py-12 border-t border-zinc-800">
      <div className="max-w-7xl mx-auto px-6">
        {/* Top Section: Brand & Contact */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-12">
          {/* Brand */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white tracking-tight">TABLE SCENE</h2>
            <p className="text-zinc-500 text-sm leading-relaxed max-w-xs font-normal">
              디지털 혁신과 시각적 스토리텔링을 통해<br/>
              다이닝 경험의 새로운 장면을 만듭니다.
            </p>
          </div>

          {/* Contact Info (Aligned Right on Desktop) */}
          <div className="text-left md:text-right">
             <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-3 opacity-80">Contact</h3>
             <ul className="space-y-1.5 text-sm text-zinc-500 font-normal">
                <li className="hover:text-white transition-colors">평일 09:00 ~ 17:00 (점심시간 12:00 ~ 13:00 제외)</li>
                <li className="hover:text-white transition-colors">주말/공휴일 긴급 10:00 ~ 22:00</li>
                <li className="hover:text-white transition-colors">admin@dndcommerce.co.kr</li>
                <li className="hover:text-white transition-colors">카카오톡 채널: 디앤디커머스</li>
             </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-zinc-800/60 mb-8" />

        {/* Legal Info & Copyright */}
        <div className="flex flex-col md:flex-row justify-between items-end md:items-start gap-8">
            {/* Legal Text */}
            <div className="text-[10px] md:text-[11px] text-zinc-600 space-y-1.5 leading-relaxed w-full md:max-w-3xl font-normal">
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                <span><span className="font-semibold text-zinc-500">상호명</span> 디앤디커머스</span>
                <span className="text-zinc-800">|</span>
                <span><span className="font-semibold text-zinc-500">대표자</span> 나형미</span>
                <span className="text-zinc-800">|</span>
                <span><span className="font-semibold text-zinc-500">개인정보보호책임자</span> 나형미</span>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                <span><span className="font-semibold text-zinc-500">사업자등록번호</span> 876-47-00697 <a href="https://www.ftc.go.kr/bizCommPop.do?wrkr_no=8764700697" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-300 ml-1 underline">[사업자정보확인]</a></span>
                <span className="text-zinc-800">|</span>
                <span><span className="font-semibold text-zinc-500">통신판매업신고번호</span> 2026-경기양평-0670</span>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                 <span><span className="font-semibold text-zinc-500">사업장 소재지</span> 경기도 양평군 지평면 수곡로 150-5</span>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                <span><span className="font-semibold text-zinc-500">고객센터</span> 010-3646-0642</span>
                <span className="text-zinc-800">|</span>
                <span><span className="font-semibold text-zinc-500">이메일</span> admin@dndcommerce.co.kr</span>
              </div>
           </div>

           {/* Copyright & Links */}
           <div className="flex flex-col md:items-end gap-3 shrink-0 w-full md:w-auto text-left md:text-right mt-4 md:mt-0">
              <div className="flex gap-4 md:gap-6 text-[11px] text-zinc-500 font-medium">
                <a href="/faq" className="hover:text-zinc-300 transition-colors">
                  FAQ
                </a>
                {showAdminLink ? (
                  <a href="/admin" className="hover:text-zinc-300 transition-colors">
                    Admin
                  </a>
                ) : null}

                {/* Terms of Service Dialog */}
                <Dialog>
                  <DialogTrigger className="hover:text-zinc-300 cursor-pointer transition-colors">
                    이용약관
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>테이블씬 이용약관</DialogTitle>
                      <DialogDescription>
                         서비스 이용 조건 및 절차에 대한 규정입니다.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="text-sm text-zinc-600 space-y-4 mt-4 leading-relaxed">
                      <p>
                        <strong>제1조 (목적)</strong><br/>
                        본 약관은 디앤디커머스(이하 "회사")가 제공하는 웹 기반 소프트웨어 구독 서비스 '테이블씬'(이하 "서비스")의 이용 조건 및 절차를 규정함을 목적으로 합니다.
                      </p>
                      <p>
                        <strong>제2조 (서비스의 제공)</strong><br/>
                        "회사"는 웹사이트를 통해 "서비스"의 소개, 구독 플랜 안내, 도입 상담 신청 접수 업무를 수행합니다.<br/>
                        실제 서비스 이용 및 결제에 관한 세부 사항은 별도의 계약 또는 서비스 이용 페이지의 안내에 따릅니다.
                      </p>
                      <p>
                        <strong>제3조 (지식재산권 및 데이터 소유권)</strong><br/>
                        <span className="block mt-1 mb-1 font-medium text-zinc-700">회사의 자산:</span>
                        "서비스"를 구동하는 소프트웨어 소스 코드, 웹사이트 디자인, UI/UX, 로고 및 "회사"가 작성한 콘텐츠의 저작권은 "회사"에 귀속됩니다.
                        <span className="block mt-2 mb-1 font-medium text-zinc-700">이용자의 자산:</span>
                        이용자(사장님)가 서비스를 이용하며 직접 업로드한 메뉴 사진, 메뉴명, 가격 정보, 매장 설명 등 이용자의 고유 데이터에 대한 소유권 및 저작권은 이용자에게 있습니다.<br/>
                        "회사"는 서비스 운영 및 기술 지원의 목적 내에서만 이용자의 데이터를 처리하며, 이용자의 사전 동의 없이 이를 제3자에게 판매하거나 소유권을 주장하지 않습니다.
                      </p>
                      <p>
                        <strong>제4조 (상담 신청)</strong><br/>
                        이용자는 문의 폼을 통해 정보를 입력함으로써 도입 상담을 신청할 수 있으며, "회사"는 입력된 정보를 바탕으로 성실히 답변합니다.
                      </p>
                      <p>
                        <strong>제5조 (면책조항)</strong><br/>
                         "회사"는 불가항력적 사유로 인한 서비스 중단에 책임을 지지 않으며, 사이트상에 제공되는 정보는 상담을 돕기 위한 용도로 실제 계약 시점의 조건과 다를 수 있습니다.
                      </p>
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Privacy Policy Dialog */}
                <Dialog>
                  <DialogTrigger className="hover:text-zinc-300 cursor-pointer transition-colors">
                    개인정보처리방침
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>개인정보처리방침</DialogTitle>
                      <DialogDescription>
                        개인정보 처리방침입니다.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="text-sm text-zinc-600 space-y-4 mt-4">
                      <p>
                        <strong>1. 개인정보의 처리 목적</strong><br/>
                        디앤디커머스는 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며 이용 목적이 변경되는 경우에는 「개인정보 보호법」 제18조에 따라 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.
                      </p>
                      <p>
                        <strong>2. 개인정보의 처리 및 보유 기간</strong><br/>
                        ① 회사는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 개인정보를 수집 시에 동의받은 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.<br/>
                        ② 각각의 개인정보 처리 및 보유 기간은 다음과 같습니다.<br/>
                        - 고객 가입 및 관리 : 서비스 이용계약 또는 회원가입 해지 시까지
                      </p>
                      <p>
                        <strong>3. 정보주체와 법정대리인의 권리·의무 및 그 행사방법</strong><br/>
                        정보주체는 회사에 대해 언제든지 개인정보 열람·정정·삭제·처리정지 요구 등의 권리를 행사할 수 있습니다.
                      </p>
                      <p className="text-zinc-400 text-xs">
                        ※ 본 방침은 예시이며, 실제 서비스 운영 시에는 관련 법령에 따른 정식 개인정보처리방침을 수립하여 공개해야 합니다.
                      </p>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <p className="text-[10px] text-zinc-700 font-medium uppercase tracking-wide">
                © 2026 Table Scene Studio.
              </p>
           </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
