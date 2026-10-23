import Link from "next/link";

import Footer from "@/app/components/layout/Footer";
import OfficialSiteNavbar from "@/components/layout/OfficialSiteNavbar";
import ActionFeedbackToast from "@/components/ui/ActionFeedbackToast";

import RequestPasswordResetForm from "./RequestPasswordResetForm";

type SearchParams = Promise<{
  error?: string;
  message?: string;
}>;

function getErrorMessage(error?: string) {
  if (error === "missing-email") {
    return "이메일 주소를 입력해주세요.";
  }

  if (error === "send-failed") {
    return "입력하신 이메일로 비밀번호 재설정 안내를 보낼 수 있는지 확인 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.";
  }

  return null;
}

function getNotice(message?: string) {
  if (message === "sent") {
    return "입력하신 이메일로 비밀번호 재설정 링크를 보냈습니다. 메일함을 확인해주세요.";
  }

  return null;
}

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { error, message } = await searchParams;
  const errorMessage = getErrorMessage(error);
  const notice = getNotice(message);

  return (
    <>
      <OfficialSiteNavbar />
      <main className="site-gutter site-auth-page bg-white text-zinc-950">
        <ActionFeedbackToast message={notice} tone="success" />
        <ActionFeedbackToast message={errorMessage} tone="error" />
        <div className="site-auth-content">
          <div className="site-auth-form">
            <div className="site-auth-header">
              <h1 className="type-subsection-title">비밀번호 재설정</h1>
              <p className="mt-3 break-keep text-sm font-medium leading-relaxed text-zinc-500">
                가입한 이메일을 입력하면 비밀번호를 다시 설정할 수 있는 링크를 보내드립니다.
              </p>
            </div>

            {notice && <div className="site-notice site-notice-success mb-6 px-4 py-3 text-sm font-medium">{notice}</div>}
            {errorMessage && <div className="site-notice site-notice-error mb-6 px-4 py-3 text-sm font-medium">{errorMessage}</div>}

            <RequestPasswordResetForm />

            <div className="mt-6 text-center text-sm font-medium text-zinc-500">
              <Link href="/sign-in" className="font-bold text-zinc-950 hover:underline">
                로그인으로 돌아가기
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
