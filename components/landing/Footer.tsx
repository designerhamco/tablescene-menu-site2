export function Footer() {
  return (
    <footer className="border-t border-zinc-800 bg-[#111111] py-12 text-zinc-400">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-12 flex flex-col items-start justify-between gap-8 md:flex-row">
          <div className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight text-white">TABLE SCENE</h2>
            <p className="max-w-xs text-sm font-normal leading-relaxed text-zinc-500">
              디지털 혁신과 시각적 스토리텔링을 통해<br />
              다이닝 경험의 새로운 장면을 만듭니다.
            </p>
          </div>
          <div className="text-left md:text-right">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-white opacity-80">Contact</h3>
            <ul className="space-y-1.5 text-sm font-normal text-zinc-500">
              <li>평일 09:00 ~ 17:00 (점심시간 12:00 ~ 13:00 제외)</li>
              <li>주말/공휴일 긴급 10:00 ~ 22:00</li>
              <li>admin@dndcommerce.co.kr</li>
              <li>카카오톡 채널: 디앤디커머스</li>
            </ul>
          </div>
        </div>

        <div className="mb-8 border-t border-zinc-800/60" />

        <div className="flex flex-col items-end justify-between gap-8 md:flex-row md:items-start">
          <div className="w-full space-y-1.5 text-[10px] font-normal leading-relaxed text-zinc-600 md:max-w-3xl md:text-[11px]">
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              <span><span className="font-semibold text-zinc-500">상호명</span> 디앤디커머스</span>
              <span className="text-zinc-800">|</span>
              <span><span className="font-semibold text-zinc-500">대표자</span> 나형미</span>
              <span className="text-zinc-800">|</span>
              <span><span className="font-semibold text-zinc-500">개인정보보호책임자</span> 나형미</span>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              <span><span className="font-semibold text-zinc-500">사업자등록번호</span> 876-47-00697</span>
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

          <div className="mt-4 flex w-full shrink-0 flex-col gap-3 text-left md:mt-0 md:w-auto md:items-end md:text-right">
            <div className="flex gap-4 text-[11px] font-medium text-zinc-500 md:gap-6">
              <a href="mailto:admin@dndcommerce.co.kr?subject=이용약관 문의" className="transition-colors hover:text-zinc-300">이용약관</a>
              <a href="mailto:admin@dndcommerce.co.kr?subject=개인정보처리방침 문의" className="transition-colors hover:text-zinc-300">개인정보처리방침</a>
            </div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-700">© 2026 Table Scene Studio.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
