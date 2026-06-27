import { termsContent } from "@/lib/legal-documents";

function renderLegalText(content: string) {
  return content.trim().split("\n").map((line, index) => {
    const trimmedLine = line.trim();

    if (!trimmedLine) {
      return <div key={`space-${index}`} className="h-2" aria-hidden="true" />;
    }

    if (trimmedLine.startsWith("## ")) {
      return (
        <h4 key={`${trimmedLine}-${index}`} className="mt-7 break-keep border-t border-zinc-100 pt-7 text-base font-black text-zinc-950">
          {trimmedLine.slice(3)}
        </h4>
      );
    }

    const isListItem = /^(\d+\.|- )/.test(trimmedLine);

    return (
      <p key={`${trimmedLine}-${index}`} className={`${isListItem ? "pl-3" : ""} break-keep text-sm font-semibold leading-7 text-zinc-600`}>
        {trimmedLine}
      </p>
    );
  });
}

export function TermsDocumentEmbed() {
  return (
    <div className="space-y-2">
      {renderLegalText(termsContent)}
    </div>
  );
}

export function PrivacyCollectionConsentDocument() {
  return (
    <div className="space-y-6 break-keep">
      <section className="space-y-2">
        <h4 className="text-base font-black text-zinc-950">개인정보 수집·이용 동의</h4>
        <p>디앤디커머스는 메뉴링크 회원가입 및 서비스 제공을 위해 아래와 같이 개인정보를 수집·이용합니다.</p>
      </section>

      <section className="space-y-2">
        <h4 className="text-base font-black text-zinc-950">■ 수집하는 개인정보 항목</h4>
        <p>회사는 회원가입, 서비스 신청, 메뉴판 생성 및 관리, 결제, 고객지원 등을 위해 아래 개인정보를 수집할 수 있습니다.</p>
        <p>· 회원가입 필수 항목: 이름 또는 매장명, 이메일 주소, 비밀번호</p>
        <p>· 카카오 간편가입 이용 시: 카카오 계정 식별정보, 이름, 카카오계정 전화번호, CI(연계정보), 이메일 또는 닉네임 등 이용자가 동의한 항목</p>
        <p>· 담당자 및 고객지원 정보: 담당자명, 담당자 연락처, 문의/알림 수신 이메일, 문의 내용, 답변 기록</p>
        <p>· 첫 달 체험 및 유료서비스 이용 정보: 메뉴판 이름, 공개 주소, 템플릿 정보, 요금제, 구독 상태, 서비스 이용 기간</p>
        <p>· 결제 정보: 주문번호, 결제금액, 결제일시, 결제수단, 승인번호, 결제 상태, 환불 또는 취소 처리 정보</p>
        <p>· 사업자 서비스 이용 시 추가 정보: 상호명, 대표자명, 사업자등록번호, 사업장 주소, 사업자 상태, 과세 유형, 사업자 인증일, 담당자 정보</p>
        <p>· 메뉴판 서비스 이용 정보: 매장명, 메뉴명, 가격, 설명, 카테고리, 이미지, SNS 링크, 이벤트 정보, 디자인 설정 등 이용자가 입력한 메뉴판 정보</p>
        <p>· AI 기능 이용 정보: 사용 기능, 사용 일시, 차감 크레딧, 요청 내용, AI 생성 결과, 번역 결과, 오류 또는 실패 기록</p>
        <p>· 자동 수집 항목: IP 주소, 접속 일시, 브라우저 및 기기 정보, OS 정보, 쿠키, 서비스 이용 기록, 오류 로그</p>
      </section>

      <section className="space-y-2">
        <h4 className="text-base font-black text-zinc-950">■ 개인정보의 수집 및 이용 목적</h4>
        <p>회사는 수집한 개인정보를 다음의 목적을 위해 이용합니다.</p>
        <p>· 회원가입, 로그인 및 계정 관리</p>
        <p>· 본인 확인, 중복 가입 및 부정 이용 방지</p>
        <p>· 메뉴링크 서비스 제공 및 메뉴판 생성·관리</p>
        <p>· 공개 메뉴판 URL 제공 및 QR 코드 생성</p>
        <p>· 첫 달 체험, 유료서비스 결제 및 정기구독 관리</p>
        <p>· 사업자 정보 확인 및 사업자 인증</p>
        <p>· AI 기능 제공 및 AI 크레딧 관리</p>
        <p>· 고객지원, 문의 응대 및 분쟁 대응</p>
        <p>· 결제 실패, 구독 만료, 데이터 삭제 예정, 약관 변경, 서비스 장애, 보안 안내 등 필수 고지 발송</p>
        <p>· 서비스 품질 개선 및 오류 대응</p>
      </section>

      <section className="space-y-2">
        <h4 className="text-base font-black text-zinc-950">■ 개인정보의 보유 및 이용 기간</h4>
        <p>회사는 개인정보 수집 및 이용 목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다. 단, 관계 법령에 따라 보관이 필요한 정보는 법령에서 정한 기간 동안 보관할 수 있습니다.</p>
        <p>· 회원 계정 정보: 회원 탈퇴 시까지</p>
        <p>· 첫 달 체험 데이터: 체험 기간 및 종료 후 30일까지 복구 가능 상태로 보관 가능</p>
        <p>· 유료서비스 메뉴판 데이터: 유료서비스 이용기간 및 종료 후 90일까지 복구 가능 상태로 보관 가능</p>
        <p>· 결제 실패, 미납 또는 결제수단 확인 필요로 이용이 제한된 메뉴판 데이터: 제한 발생 후 30일까지 복구 가능 상태로 보관 가능</p>
        <p>· 결제 및 거래 기록: 관계 법령에 따라 최대 5년</p>
        <p>· 소비자 불만 또는 분쟁처리 기록: 관계 법령에 따라 최대 3년</p>
        <p>· 표시·광고에 관한 기록: 관계 법령에 따라 최대 6개월</p>
        <p>· 고객지원 기록: 문의 처리 완료 후 3년 또는 분쟁 대응에 필요한 기간</p>
        <p>· 마케팅 수신 동의 및 철회 기록: 동의 철회 시 또는 회원 탈퇴 시까지</p>
      </section>

      <section className="space-y-2">
        <h4 className="text-base font-black text-zinc-950">■ 동의 거부권 및 불이익</h4>
        <p>이용자는 개인정보 수집·이용에 대한 동의를 거부할 권리가 있습니다.</p>
        <p>다만 필수 항목에 대한 동의를 거부할 경우 회원가입, 로그인, 메뉴판 생성, 첫 달 체험, 유료서비스 결제, 정기구독 관리, 고객지원 및 메뉴링크 서비스 이용이 제한될 수 있습니다.</p>
      </section>
    </div>
  );
}

export function MarketingConsentDocument() {
  return (
    <div className="space-y-6 break-keep">
      <section className="space-y-2">
        <h4 className="text-base font-black text-zinc-950">1. 수신 목적</h4>
        <p>메뉴링크는 이용자가 선택적으로 동의한 경우 이벤트, 할인 혜택, 신규 템플릿 출시, AI 기능 업데이트, 서비스 개선 소식, 유료 기능 안내, 프로모션 및 혜택 안내 등 광고성 정보를 발송할 수 있습니다.</p>
      </section>

      <section className="space-y-2">
        <h4 className="text-base font-black text-zinc-950">2. 수신 내용 및 채널</h4>
        <p>수신 내용은 이벤트 및 할인 혜택, 신규 템플릿 출시 안내, AI 기능 업데이트 안내, 서비스 개선 소식, 유료 기능 및 프로모션 안내를 포함합니다.</p>
        <p>수신 채널은 이메일, 문자메시지, 카카오 메시지 등 메뉴링크가 운영하는 안내 채널을 포함할 수 있습니다.</p>
      </section>

      <section className="space-y-2">
        <h4 className="text-base font-black text-zinc-950">3. 보유 및 이용 기간</h4>
        <p>마케팅 수신 동의 정보는 동의 철회 시까지 또는 회원 탈퇴 시까지 보관·이용됩니다. 동의 및 철회 기록은 분쟁 대응과 수신 동의 이력 관리를 위해 필요한 기간 동안 보관될 수 있습니다.</p>
      </section>

      <section className="space-y-2">
        <h4 className="text-base font-black text-zinc-950">4. 동의 철회 방법</h4>
        <p>이용자는 언제든지 마이페이지의 광고성 정보 수신 설정, 이메일 하단 수신거부 링크 또는 고객지원 문의를 통해 마케팅 정보 수신 동의를 철회할 수 있습니다.</p>
      </section>

      <section className="space-y-2">
        <h4 className="text-base font-black text-zinc-950">5. 선택 동의 안내</h4>
        <p>마케팅 정보 수신 동의는 선택 사항이며, 동의하지 않아도 회원가입, 첫 달 체험, 유료서비스 결제 및 메뉴링크 서비스 이용에는 제한이 없습니다.</p>
        <p>결제 완료, 정기결제 예정 또는 실패, 구독 만료, 데이터 삭제 예정, 약관·정책 변경, 서비스 장애, 보안 안내, 고객지원 답변 등 서비스 이용에 필요한 필수 고지는 마케팅 수신 동의 여부와 관계없이 발송될 수 있습니다.</p>
      </section>
    </div>
  );
}
