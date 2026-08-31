"use client";

import { useMemo, useState } from "react";

import { ConsentAgreementBox, type ConsentAgreementItem } from "@/components/consent/ConsentAgreementBox";
import {
  MarketingConsentDocument,
  PrivacyCollectionConsentDocument,
  TermsDocumentEmbed,
} from "@/components/legal/SignUpConsentDocuments";

type SignUpAgreementFieldsProps = {
  action: (formData: FormData) => void | Promise<void>;
  safeNext: string;
};

type SignUpConsentKey = "termsAccepted" | "privacyAccepted" | "marketingAccepted";

const signUpConsentItems: readonly ConsentAgreementItem[] = [
  {
    key: "termsAccepted",
    label: "[필수] 아티메뉴 이용약관에 동의합니다.",
    required: true,
    href: "/terms",
    detailTitle: "아티메뉴 이용약관",
    detail: <TermsDocumentEmbed />,
  },
  {
    key: "privacyAccepted",
    label: "[필수] 개인정보 수집·이용에 동의합니다.",
    required: true,
    href: "/privacy",
    detailTitle: "개인정보 수집·이용 안내",
    detail: <PrivacyCollectionConsentDocument />,
  },
  {
    key: "marketingAccepted",
    label: "[선택] 이벤트·혜택·신규 템플릿·AI 기능 업데이트 등 광고성 정보 수신에 동의합니다.",
    detailTitle: "마케팅 정보 수신 동의 안내",
    detail: <MarketingConsentDocument />,
  },
];

export default function SignUpAgreementFields({ action, safeNext }: SignUpAgreementFieldsProps) {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [consents, setConsents] = useState<Record<SignUpConsentKey, boolean>>({
    termsAccepted: false,
    privacyAccepted: false,
    marketingAccepted: false,
  });
  const [activeConsent, setActiveConsent] = useState<SignUpConsentKey | null>(null);

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const requiredConsentsAccepted = consents.termsAccepted && consents.privacyAccepted;
  const canSubmit = displayName.trim().length > 0 && isEmailValid && password.length >= 6 && requiredConsentsAccepted;
  const consentAgreedAt = useMemo(() => (requiredConsentsAccepted ? new Date().toISOString() : ""), [requiredConsentsAccepted]);

  function updateConsent(key: SignUpConsentKey, checked: boolean) {
    setConsents((current) => ({ ...current, [key]: checked }));
  }

  function toggleAllConsents(checked: boolean) {
    setConsents({
      termsAccepted: checked,
      privacyAccepted: checked,
      marketingAccepted: checked,
    });
  }

  return (
    <>
      <form action={action} className="space-y-5">
        <input type="hidden" name="next" value={safeNext} />
        <input type="hidden" name="consentAgreedAt" value={consentAgreedAt} />
        <input type="hidden" name="consentContext" value="sign_up" />

        <div>
          <h2 className="text-xl font-black tracking-tight">이메일로 계정 만들기</h2>
          <p className="mt-2 break-keep text-sm font-semibold leading-relaxed text-zinc-500">
            카카오 계정이 없거나 이메일 가입을 원하는 경우 사용할 수 있습니다.
          </p>
        </div>

        <div>
          <label htmlFor="displayName" className="mb-2 block text-sm font-bold">
            이름 또는 매장명
          </label>
          <input
            id="displayName"
            name="displayName"
            type="text"
            required
            autoComplete="name"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-base outline-none transition-colors focus:border-zinc-950"
            placeholder="강남 비스트로"
          />
        </div>

        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-bold">
            이메일 주소
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-base outline-none transition-colors focus:border-zinc-950"
            placeholder="owner@example.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-2 block text-sm font-bold">
            비밀번호
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-base outline-none transition-colors focus:border-zinc-950"
            placeholder="6자 이상"
          />
        </div>

        <ConsentAgreementBox<SignUpConsentKey>
          values={consents}
          items={signUpConsentItems}
          activeKey={activeConsent}
          onChange={updateConsent}
          onToggleAll={toggleAllConsents}
          onOpen={setActiveConsent}
          onClose={() => setActiveConsent(null)}
        />

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full rounded-2xl bg-zinc-950 px-5 py-4 text-base font-bold text-white transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-500 disabled:hover:scale-100"
        >
          이메일로 가입하기
        </button>
      </form>
    </>
  );
}
