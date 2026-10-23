"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { ArrowUpRight, Laptop, Monitor, X } from "lucide-react";
import styles from "./marketing.module.css";

const guides = {
  safari: {
    title: "Safari에서 메뉴판 열기",
    steps: [
      "마이 메뉴에서 공개한 메뉴판의 주소를 복사합니다.",
      "iPhone·iPad·Mac의 Safari에서 메뉴판 주소를 엽니다.",
      "iPhone·iPad는 공유 메뉴에서 ‘홈 화면에 추가’를 선택하면 앱처럼 바로 열 수 있습니다. Mac은 보기 메뉴의 ‘전체 화면 시작’을 이용하세요.",
    ],
    note: "iPhone·iPad의 홈 화면 실행과 Mac의 전체 화면은 서로 다른 기능입니다. Safari 버전에 따라 메뉴 이름이 다를 수 있습니다.",
  },
  chrome: {
    title: "Chrome에서 메뉴판 열기",
    steps: [
      "마이 메뉴에서 공개한 메뉴판의 주소를 복사합니다.",
      "기기의 Chrome 주소창에 메뉴판 주소를 입력합니다.",
      "PC는 브라우저 메뉴의 확대/축소 옆 전체 화면 아이콘을 선택합니다. Android 태블릿은 메뉴의 ‘설치 및 바로가기 만들기’에서 설치나 바로가기를 추가할 수 있습니다.",
    ],
    note: "모바일 Chrome은 PC와 같은 전체 화면 버튼을 제공하지 않을 수 있습니다. 매장에서 사용할 기기로 표시 상태와 화면 꺼짐 설정을 확인해 주세요.",
  },
  edge: {
    title: "Edge에서 메뉴판 열기",
    steps: [
      "마이 메뉴에서 공개한 메뉴판의 주소를 복사합니다.",
      "Windows PC나 태블릿의 Edge에서 메뉴판 주소를 엽니다.",
      "브라우저 메뉴의 전체 화면 아이콘 또는 F11을 이용합니다. 키보드가 없는 기기는 브라우저 메뉴에서 지원 여부를 확인해 주세요.",
    ],
    note: "전체 화면과 절전 방지는 별도 설정입니다. 매장 운영에 맞게 기기의 화면 자동 꺼짐도 조정해 주세요.",
  },
  smart: {
    title: "스마트 TV에 연결하기",
    steps: [
      "TV에 인터넷과 웹 브라우저가 있는지 확인하고 네트워크에 연결합니다.",
      "TV 브라우저에서 공개 메뉴판 주소를 열고 사용할 페이지를 선택합니다.",
      "지원하는 경우 브라우저의 전체 화면을 켜고 TV의 절전·화면 꺼짐 설정을 확인합니다.",
    ],
    note: "웹 브라우저와 필요한 표시 기능을 지원하는 TV에 한해 별도 PC 없이 사용할 수 있습니다. 지원하지 않는 모델은 일반 모니터 연결 방식을 이용해 주세요.",
  },
  monitor: {
    title: "일반 TV·모니터에 연결하기",
    steps: [
      "미니 PC 또는 노트북을 HDMI로 TV·모니터에 연결하고 올바른 입력을 선택합니다.",
      "연결한 PC를 인터넷에 연결한 뒤 Chrome 또는 Edge에서 공개 메뉴판 주소를 엽니다.",
      "표시할 페이지를 선택하고 브라우저의 전체 화면을 켭니다. 화면 방향과 절전 설정도 확인해 주세요.",
    ],
    note: "미니 PC·노트북·HDMI 케이블 등 연결 장비는 별도로 준비해야 합니다. 디스플레이 플랜의 신규 신청은 현재 준비 중입니다.",
  },
} as const;

function GuideButton({
  guide,
  label,
}: {
  guide: keyof typeof guides;
  label: string;
}) {
  const content = guides[guide];
  return (
    <Dialog.Root>
      <Dialog.Trigger className="site-button site-button-secondary">
        {label}
        <ArrowUpRight size={16} aria-hidden="true" />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.dialogOverlay} />
        <Dialog.Content className={styles.dialogContent}>
          <Dialog.Title className="type-subsection-title">
            {content.title}
          </Dialog.Title>
          <Dialog.Description className="type-body-sm mt-3 text-zinc-500">
            매장 기기에 메뉴판을 표시하는 순서입니다.
          </Dialog.Description>
          <ol className={styles.guideSteps}>
            {content.steps.map((step, i) => (
              <li key={step}>
                <span>{i + 1}</span>
                <p>{step}</p>
              </li>
            ))}
          </ol>
          <p className={styles.guideNote}>{content.note}</p>
          <Dialog.Close
            className={`site-button site-button-ghost site-button-icon ${styles.dialogClose}`}
            aria-label="사용법 닫기"
          >
            <X size={20} />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default function UsageGuides({
  display = false,
}: {
  display?: boolean;
}) {
  return (
    <section className={styles.usage} aria-labelledby="usage-heading">
      <div className="site-container">
        <div className={styles.sectionHeading}>

          <h2 id="usage-heading" className="type-section-title">
            지금 쓰는 기기에서 시작하세요
          </h2>
          <p className="site-body text-zinc-500">
            기기와 브라우저에 맞는 방법으로 메뉴판을 열어보세요.
          </p>
        </div>
        <div className={styles.guideGrid}>
          {display ? (
            <>
              <article>
                <Monitor size={28} />
                <h3 className="type-content-title">스마트 TV</h3>
                <p className="site-body-sm">
                  웹 브라우저를 지원하는 TV에서 바로 연결
                </p>
                <GuideButton guide="smart" label="연결 방법 보기" />
              </article>
              <article>
                <Laptop size={28} />
                <h3 className="type-content-title">일반 TV · 모니터</h3>
                <p className="site-body-sm">미니 PC나 노트북을 HDMI로 연결</p>
                <GuideButton guide="monitor" label="연결 방법 보기" />
              </article>
            </>
          ) : (
            <>
              <article>
                <Laptop size={28} />
                <h3 className="type-content-title">Apple 기기</h3>
                <p className="site-body-sm">Mac · iPad · iPhone</p>
                <div>
                  <GuideButton guide="safari" label="Safari" />
                  <GuideButton guide="chrome" label="Chrome" />
                </div>
              </article>
              <article>
                <Monitor size={28} />
                <h3 className="type-content-title">Windows · Android 기기</h3>
                <p className="site-body-sm">삼성 PC · 갤럭시 태블릿 등</p>
                <div>
                  <GuideButton guide="chrome" label="Chrome" />
                  <GuideButton guide="edge" label="Edge" />
                </div>
              </article>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
