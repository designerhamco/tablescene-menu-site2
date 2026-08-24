const Footer = () => {
  const showAdminLink = process.env.NODE_ENV !== "production";

  return (
    <footer className="border-t border-zinc-200 bg-white py-12 text-zinc-600">
      <div className="max-w-7xl mx-auto px-6">
        {/* Top Section: Brand & Contact */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-12">
          {/* Brand */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight text-zinc-950">ArtiMenu</h2>
            <p className="max-w-xs text-sm font-normal leading-relaxed text-zinc-500">
              디지털 혁신과 시각적 스토리텔링을 통해<br/>
              다이닝 경험의 새로운 장면을 만듭니다.
            </p>
          </div>

          {/* Support information */}
          <div className="grid gap-7 text-left sm:grid-cols-3 md:max-w-3xl md:gap-10">
            <div>
              <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-zinc-900">운영 시간</h3>
              <p className="text-sm leading-relaxed text-zinc-500">평일 09:00 ~ 17:00<br />점심 12:00 ~ 13:00 제외<br />긴급(주말) 10:00 ~ 22:00</p>
            </div>
            <div>
              <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-zinc-900">카카오톡 상담</h3>
              <p className="text-sm leading-relaxed text-zinc-500">@디앤디커머스<br />admin@dndcommerce.co.kr</p>
            </div>
            <div>
              <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-zinc-900">원격 점검 지원</h3>
              <p className="text-sm leading-relaxed text-zinc-500">화면 공유로 해결<br />안정적인 매장 운영을 지원합니다.</p>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="mb-8 border-t border-zinc-200" />

        {/* Legal Info & Copyright */}
        <div className="flex flex-col md:flex-row justify-between items-end md:items-start gap-8">
            {/* Legal Text */}
            <div className="w-full space-y-1.5 text-[10px] font-normal leading-relaxed text-zinc-500 md:max-w-3xl md:text-[11px]">
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                <span><span className="font-semibold text-zinc-500">상호명</span> 디앤디커머스</span>
                <span className="text-zinc-300">|</span>
                <span><span className="font-semibold text-zinc-500">대표자</span> 나형미</span>
                <span className="text-zinc-300">|</span>
                <span><span className="font-semibold text-zinc-500">개인정보보호책임자</span> 나형미</span>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                <span><span className="font-semibold text-zinc-600">사업자등록번호</span> 876-47-00697 <a href="https://www.ftc.go.kr/bizCommPop.do?wrkr_no=8764700697" target="_blank" rel="noopener noreferrer" className="ml-1 underline hover:text-zinc-950">[사업자정보확인]</a></span>
                <span className="text-zinc-300">|</span>
                <span><span className="font-semibold text-zinc-500">통신판매업신고번호</span> 2026-경기양평-0670</span>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                 <span><span className="font-semibold text-zinc-500">사업장 소재지</span> 경기도 양평군 지평면 수곡로 150-5</span>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                <span><span className="font-semibold text-zinc-500">고객센터</span> 010-3646-0642</span>
                <span className="text-zinc-300">|</span>
                <span><span className="font-semibold text-zinc-500">이메일</span> admin@dndcommerce.co.kr</span>
              </div>
           </div>

           {/* Copyright & Links */}
           <div className="flex flex-col md:items-end gap-3 shrink-0 w-full md:w-auto text-left md:text-right mt-4 md:mt-0">
              <div className="flex gap-4 text-[11px] font-medium text-zinc-500 md:gap-6">
                <a href="/faq" className="transition-colors hover:text-zinc-950">
                  FAQ
                </a>
                {showAdminLink ? (
                  <a href="/admin" className="transition-colors hover:text-zinc-950">
                    Admin
                  </a>
                ) : null}

                <a href="/terms" className="transition-colors hover:text-zinc-950">
                  이용약관
                </a>
                <a href="/privacy" className="transition-colors hover:text-zinc-950">
                  개인정보 처리방침
                </a>
                <a href="mailto:admin@dndcommerce.co.kr" className="transition-colors hover:text-zinc-950">
                  고객지원
                </a>
              </div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                © 2026 ArtiMenu Studio.
              </p>
           </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
