"use client";

import Link from "next/link";
import { useId } from "react";
import { BookOpen, ChevronRight, Monitor } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/app/components/ui/accordion";
import { SupportChatIcon } from "@/app/components/ui/support-chat-icon";
import { DETAILED_FAQ_DATA } from "@/app/components/common/FAQ";
import styles from "./support-home.module.css";

export const SUPPORT_HOME_QUESTIONS = [
  "프로그램을 설치해야 하나요?",
  "QR 이미지는 받을 수 있나요?",
  "메뉴판을 여러 개 만들 수 있나요?",
] as const;
const questions = SUPPORT_HOME_QUESTIONS.flatMap(question => DETAILED_FAQ_DATA.flatMap(group => group.items).filter(item => item.question === question));

export default function SupportHome({ enabled, onChat, onNavigate }: {
  enabled: boolean | null; onChat: () => void; onNavigate?: () => void;
}) {
  const uid = useId();
  return <div className={styles.home}>
    <p className={styles.intro}>궁금한 내용을 빠르게 찾아보세요.</p>
    <nav className={styles.channels} aria-label="문의 방법">
      <button type="button" className={styles.channel} onClick={onChat}>
        <span className={styles.aiIcon}><SupportChatIcon width={26} height={26} /></span>
        <span className={styles.channelLabel}>AI 실시간 문의</span>
        {enabled === false ? <span className={styles.availability}>준비 중</span> : null}
      </button>
      <Link href="/mypage/inquiries" onClick={onNavigate} className={styles.channel}>
        <span className={styles.emoji} aria-hidden="true">✉️</span><span className={styles.channelLabel}>1:1 문의</span>
      </Link>
      <Link href="/faq?tab=faq" onClick={onNavigate} className={styles.channel}>
        <span className={styles.emoji} aria-hidden="true">❓</span><span className={styles.channelLabel}>FAQ</span>
      </Link>
    </nav>
    <section className={styles.section} aria-labelledby={`${uid}-guides`}>
      <h3 id={`${uid}-guides`} className="type-content-title">서비스 가이드</h3>
      <div className={styles.guides}>
        <Link href="/guides" onClick={onNavigate} className={styles.guide}>
          <BookOpen size={22} aria-hidden="true" /><strong>브라우저 설정</strong><span>전체 화면·화면 배율</span><ChevronRight size={18} aria-hidden="true" />
        </Link>
        <Link href="/guides?plan=display#display-connection" onClick={onNavigate} className={styles.guide}>
          <Monitor size={22} aria-hidden="true" /><strong>매장 화면 연결</strong><span>TV·모니터 연결 방법</span><ChevronRight size={18} aria-hidden="true" />
        </Link>
      </div>
    </section>
    <section className={styles.section} aria-labelledby={`${uid}-faq`}>
      <div className={styles.sectionHeading}><h3 id={`${uid}-faq`} className="type-content-title">자주 묻는 질문</h3><Link href="/faq?tab=faq" onClick={onNavigate} className={styles.more}>전체 보기<ChevronRight size={16} aria-hidden="true" /></Link></div>
      <Accordion type="single" collapsible className={styles.faq}>
        {questions.map(item => <AccordionItem key={item.question} value={item.question}><AccordionTrigger>{item.question}</AccordionTrigger><AccordionContent className={styles.answer}>{item.answer}</AccordionContent></AccordionItem>)}
      </Accordion>
    </section>
  </div>;
}
