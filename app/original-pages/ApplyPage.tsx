import React, { useState } from 'react';
import { motion } from 'motion/react';
import PageHeader from '../components/layout/PageHeader';
import { 
  Check, Upload, CreditCard, Shield, AlertCircle, 
  Building2, MonitorSmartphone, Receipt, FileText, 
  ChevronRight, Info, HelpCircle
} from 'lucide-react';

const ApplyPage = () => {
  const [isPortoneLater, setIsPortoneLater] = useState(false);
  const [agreements, setAgreements] = useState({
    terms: false,
    privacy: false,
    refund: false,
    pg: false
  });

  const toggleAgreement = (key: keyof typeof agreements) => {
    setAgreements(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const allAgreed = Object.values(agreements).every(v => v);

  return (
    <div className="min-h-screen bg-white">
      <PageHeader 
        title="서비스 도입 신청" 
        subtitle="메뉴링크의 올인원 솔루션을 시작해보세요."
        dark={false} 
      />

      <main className="max-w-3xl mx-auto px-6 py-20">
        
        {/* Step 1: Basic Info */}
        <section className="mb-16">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center font-bold text-lg">1</div>
            <h2 className="text-2xl font-bold text-zinc-900">결제 및 기본 정보 (행정)</h2>
          </div>
          
          <div className="bg-zinc-50 p-8 rounded-2xl border border-zinc-100 space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-700">대표자 성함</label>
                <input type="text" className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:outline-none focus:border-black transition-colors" placeholder="홍길동" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-700">연락처</label>
                <input type="tel" className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:outline-none focus:border-black transition-colors" placeholder="010-1234-5678" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-700">이메일 (계산서 발행용)</label>
              <input type="email" className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:outline-none focus:border-black transition-colors" placeholder="example@email.com" />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-700">상호명</label>
                <input type="text" className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:outline-none focus:border-black transition-colors" placeholder="메뉴링크 식당" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-700">사업자 등록번호</label>
                <input type="text" className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:outline-none focus:border-black transition-colors" placeholder="000-00-00000" />
              </div>
            </div>

            <div className="space-y-2">
               <label className="text-sm font-bold text-zinc-700">통신판매업 신고번호</label>
               <input type="text" className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:outline-none focus:border-black transition-colors" placeholder="제 2024-서울강남-0000호" />
               <p className="text-xs text-zinc-500">* 온라인 결제 연동을 위해 웹 메뉴판 하단에 필수로 표기되어야 합니다.</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-700">사업자등록증 첨부</label>
              <div className="border-2 border-dashed border-zinc-300 rounded-xl p-6 text-center hover:bg-zinc-100 transition-colors cursor-pointer group">
                <Upload className="w-6 h-6 text-zinc-400 mx-auto mb-2 group-hover:text-black transition-colors" />
                <span className="text-sm text-zinc-500 group-hover:text-zinc-700">클릭하여 파일 업로드</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-700">가게 주소 (영수증 출력용)</label>
              <input type="text" className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:outline-none focus:border-black transition-colors" placeholder="서울시 강남구..." />
            </div>

            <div className="pt-4 border-t border-zinc-200">
               <div className="flex justify-between items-center mb-4">
                  <span className="font-bold text-zinc-700">서비스 월 이용료 결제</span>
                  <span className="text-xl font-bold text-black">월 59,000원 <span className="text-sm text-zinc-500 font-normal">(VAT 별도)</span></span>
               </div>
               <button type="button" className="w-full py-4 bg-zinc-900 text-white font-bold rounded-xl hover:bg-black transition-colors flex items-center justify-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  카드 등록 및 결제하기
               </button>
               <p className="text-xs text-zinc-500 mt-2 text-center">
                  * 첫 달 결제 후 매월 자동 결제됩니다.
               </p>
            </div>
          </div>
        </section>

        {/* Step 2: System Setting */}
        <section className="mb-16">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center font-bold text-lg">2</div>
            <h2 className="text-2xl font-bold text-zinc-900">시스템 세팅 정보 (메뉴/기술)</h2>
          </div>

          <div className="bg-zinc-50 p-8 rounded-2xl border border-zinc-100 space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-700">메뉴 데이터 제출</label>
              <p className="text-xs text-zinc-500 mb-2">메뉴명, 가격, 설명이 포함된 엑셀/텍스트 파일을 업로드해주세요.</p>
              <div className="border-2 border-dashed border-zinc-300 rounded-xl p-6 text-center hover:bg-zinc-100 transition-colors cursor-pointer group">
                <FileText className="w-6 h-6 text-zinc-400 mx-auto mb-2 group-hover:text-black transition-colors" />
                <span className="text-sm text-zinc-500 group-hover:text-zinc-700">메뉴 리스트 업로드</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-700">메뉴 사진 (압축 파일)</label>
              <div className="border-2 border-dashed border-zinc-300 rounded-xl p-6 text-center hover:bg-zinc-100 transition-colors cursor-pointer group">
                <Upload className="w-6 h-6 text-zinc-400 mx-auto mb-2 group-hover:text-black transition-colors" />
                <span className="text-sm text-zinc-500 group-hover:text-zinc-700">이미지 ZIP 파일 업로드</span>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-700">테이블 개수</label>
                <input type="number" className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:outline-none focus:border-black transition-colors" placeholder="20" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-700">사용 중인 프린터 모델명</label>
                <input type="text" className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:outline-none focus:border-black transition-colors" placeholder="EPSON TM-T88VI" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-700">카카오 채널 ID (알림톡 연동용)</label>
              <input type="text" className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:outline-none focus:border-black transition-colors" placeholder="@채널아이디" />
            </div>
          </div>
        </section>

        {/* Step 3: PortOne Integration */}
        <section className="mb-16">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center font-bold text-lg">3</div>
            <h2 className="text-2xl font-bold text-zinc-900">결제 연동 정보 (포트원 API)</h2>
          </div>

          <div className="bg-zinc-50 p-8 rounded-2xl border border-zinc-100 space-y-6">
            <div className="bg-white p-4 rounded-xl border border-zinc-200 mb-4">
               <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                  <div className="text-sm text-zinc-600 leading-relaxed">
                     <span className="font-bold text-zinc-900 block mb-1">포트원(PortOne)이란?</span>
                     고객이 테이블에서 직접 카드 결제를 할 수 있도록 돕는 PG 연동 서비스입니다.<br/>
                     가입 심사는 1~2주 소요되므로, <strong>[API 키는 나중에 입력하겠습니다]</strong>를 체크하고 먼저 진행하셔도 됩니다.
                  </div>
               </div>
            </div>

            <div className="flex items-center gap-2 mb-4">
               <input 
                  type="checkbox" 
                  id="portoneLater" 
                  checked={isPortoneLater}
                  onChange={(e) => setIsPortoneLater(e.target.checked)}
                  className="w-5 h-5 rounded border-zinc-300 text-black focus:ring-black" 
               />
               <label htmlFor="portoneLater" className="text-zinc-700 font-medium cursor-pointer select-none">
                  API 키는 나중에 입력하겠습니다. (심사 진행 중)
               </label>
            </div>

            {!isPortoneLater && (
               <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-6"
               >
                  <div className="space-y-4">
                     <div className="flex items-center gap-2 mb-2">
                        <label className="text-sm font-bold text-zinc-700">포트원 가입 및 심사 신청 완료 여부</label>
                     </div>
                     <div className="flex gap-6">
                        <label className="flex items-center gap-2 cursor-pointer">
                           <input type="radio" name="portoneStatus" className="w-4 h-4 text-black focus:ring-black" />
                           <span className="text-zinc-600">네, 완료했습니다.</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                           <input type="radio" name="portoneStatus" className="w-4 h-4 text-black focus:ring-black" />
                           <span className="text-zinc-600">아니요, 아직입니다.</span>
                        </label>
                     </div>
                  </div>

                  <div className="space-y-2">
                     <label className="text-sm font-bold text-zinc-700">가맹점 식별코드 (Store ID)</label>
                     <input type="text" className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:outline-none focus:border-black transition-colors" placeholder="store-..." />
                  </div>

                  <div className="space-y-2">
                     <label className="text-sm font-bold text-zinc-700">REST API Key</label>
                     <input type="text" className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:outline-none focus:border-black transition-colors" />
                  </div>

                  <div className="space-y-2">
                     <label className="text-sm font-bold text-zinc-700">REST API Secret</label>
                     <input type="password" className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:outline-none focus:border-black transition-colors" />
                     <p className="text-xs text-zinc-500 flex items-center gap-1 mt-1">
                        <HelpCircle size={12} />
                        포트원 관리자 페이지 &gt; 결제 연동 &gt; 내 식별 정보에서 확인 가능합니다.
                     </p>
                  </div>
               </motion.div>
            )}
          </div>
        </section>

        {/* Step 4: Terms & Agreement */}
        <section className="mb-16">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center font-bold text-lg">4</div>
            <h2 className="text-2xl font-bold text-zinc-900">약관 및 규정 동의</h2>
          </div>

          <div className="bg-zinc-50 p-8 rounded-2xl border border-zinc-100 space-y-4">
             {/* Term Item */}
             <label className="flex items-start gap-3 cursor-pointer group p-3 hover:bg-zinc-100 rounded-xl transition-colors -ml-3">
                <div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors ${agreements.terms ? 'bg-black border-black text-white' : 'bg-white border-zinc-300'}`}>
                   {agreements.terms && <Check size={14} />}
                </div>
                <input type="checkbox" className="hidden" checked={agreements.terms} onChange={() => toggleAgreement('terms')} />
                <div className="flex-1">
                   <span className="font-bold text-zinc-900 mr-2">[필수]</span>
                   <span className="text-zinc-700">서비스 이용 약관 동의</span>
                </div>
             </label>

             <label className="flex items-start gap-3 cursor-pointer group p-3 hover:bg-zinc-100 rounded-xl transition-colors -ml-3">
                <div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors ${agreements.privacy ? 'bg-black border-black text-white' : 'bg-white border-zinc-300'}`}>
                   {agreements.privacy && <Check size={14} />}
                </div>
                <input type="checkbox" className="hidden" checked={agreements.privacy} onChange={() => toggleAgreement('privacy')} />
                <div className="flex-1">
                   <span className="font-bold text-zinc-900 mr-2">[필수]</span>
                   <span className="text-zinc-700">개인정보 수집 및 이용 동의 (PG사 심사 대행)</span>
                </div>
             </label>

             <label className="flex items-start gap-3 cursor-pointer group p-3 hover:bg-zinc-100 rounded-xl transition-colors -ml-3">
                <div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors ${agreements.refund ? 'bg-black border-black text-white' : 'bg-white border-zinc-300'}`}>
                   {agreements.refund && <Check size={14} />}
                </div>
                <input type="checkbox" className="hidden" checked={agreements.refund} onChange={() => toggleAgreement('refund')} />
                <div className="flex-1">
                   <span className="font-bold text-zinc-900 mr-2">[필수]</span>
                   <span className="text-zinc-700">계약 유지 및 혜택 반환 규정 동의</span>
                   <p className="text-sm text-zinc-500 mt-1 leading-relaxed bg-zinc-100 p-3 rounded-lg">
                      "본 서비스는 별도의 해지 위약금이 없으나, 계약 후 1년 이내 해지 시 설치 시점에 면제받은 초기 세팅비(19.9만 원)가 반환 청구됨을 확인합니다."
                   </p>
                </div>
             </label>

             <label className="flex items-start gap-3 cursor-pointer group p-3 hover:bg-zinc-100 rounded-xl transition-colors -ml-3">
                <div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors ${agreements.pg ? 'bg-black border-black text-white' : 'bg-white border-zinc-300'}`}>
                   {agreements.pg && <Check size={14} />}
                </div>
                <input type="checkbox" className="hidden" checked={agreements.pg} onChange={() => toggleAgreement('pg')} />
                <div className="flex-1">
                   <span className="font-bold text-zinc-900 mr-2">[필수]</span>
                   <span className="text-zinc-700">PG 가입 서류 제출 의무 확인</span>
                   <p className="text-sm text-zinc-500 mt-1">
                      "결제 시스템 연동을 위해 안내받은 PG사 가입 서류를 7일 이내 제출하는 것에 동의합니다."
                   </p>
                </div>
             </label>
          </div>
        </section>

        {/* Submit Action */}
        <div className="sticky bottom-6 z-20">
           <button 
             disabled={!allAgreed}
             className={`w-full py-5 rounded-2xl text-lg font-bold shadow-2xl transition-all flex items-center justify-center gap-2 ${
               allAgreed 
                 ? 'bg-[#F8E731] text-black hover:scale-[1.02]' 
                 : 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
             }`}
             onClick={() => alert("신청이 접수되었습니다. 담당자가 확인 후 연락드리겠습니다.")}
           >
             {allAgreed ? "위 내용으로 신청 및 결제하기" : "모든 필수 항목에 동의해주세요"}
             {allAgreed && <ChevronRight className="w-5 h-5" />}
           </button>
        </div>

      </main>
    </div>
  );
};

export default ApplyPage;