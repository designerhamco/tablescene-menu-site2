"use client";

import { useState } from "react";
import { ArrowDown, ArrowUpRight, Video } from "lucide-react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/app/components/ui/tabs";
import {
  GUIDE_PLANS,
  GUIDE_DEVICES,
  GUIDE_BROWSER_LABELS,
  GUIDE_VIDEOS,
  getGuideDevice,
  getGuideBrowser,
  getGuideBrowsers,
  getGuideSections,
  guideVideoKey,
  type GuidePlan,
  type GuideDevice,
  type GuideBrowser,
  type GuideSection,
  type GuideVideo,
} from "@/lib/usage-guides";
import styles from "./usage-guide.module.css";

function VideoFrame({ title, video }: { title: string; video?: GuideVideo }) {
  if (video)
    return (
      <video
        className={styles.video}
        controls
        playsInline
        preload="none"
        poster={video.poster}
        aria-label={`${title} 안내 영상`}
      >
        <source src={video.src} />
        <track
          kind="captions"
          src={video.captionsSrc}
          srcLang="ko"
          label="한국어 자막"
          default
        />
        브라우저에서 영상을 재생할 수 없습니다. 아래 설명을 확인해 주세요.
      </video>
    );
  return (
    <div
      className={styles.videoPlaceholder}
      role="img"
      aria-label={`${title} — 영상 준비 중`}
    >
      <Video size={28} strokeWidth={1.5} aria-hidden="true" />
      <span className="type-content-title">영상 준비 중</span>
      <span className="type-body-sm">아래 설명으로 먼저 따라 해보세요.</span>
    </div>
  );
}
function GuideArticle({
  section,
  plan,
  device,
  browser,
}: {
  section: GuideSection;
  plan: GuidePlan;
  device: GuideDevice;
  browser: GuideBrowser;
}) {
  return (
    <article
      id={`${plan}-${section.id}`}
      className={styles.article}
      tabIndex={-1}
      aria-labelledby={`${plan}-${section.id}-title`}
    >
      <VideoFrame
        title={section.title}
        video={GUIDE_VIDEOS[guideVideoKey(plan, device, browser, section.id)]}
      />
      <div className={styles.articleCopy}>
        <h2
          id={`${plan}-${section.id}-title`}
          className="type-subsection-title"
        >
          {section.title}
        </h2>
        <p className="type-body">{section.body}</p>
        <ol className={styles.steps}>
          {section.steps.map((step) => (
            <li className="type-body" key={step}>
              {step}
            </li>
          ))}
        </ol>
        {section.note && (
          <p className="site-notice type-body-sm">{section.note}</p>
        )}
        {section.sources && (
          <div className={styles.sources}>
            {section.sources.map((source) => (
              <a
                key={source.href}
                href={source.href}
                target="_blank"
                rel="noopener noreferrer"
                className="site-button site-button-ghost type-label"
              >
                {source.label}
                <ArrowUpRight size={14} aria-hidden="true" />
                <span className="sr-only"> (새 창)</span>
              </a>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
export default function UsageGuidePage({
  initialPlan = "basic",
}: {
  initialPlan?: GuidePlan;
}) {
  const [plan, setPlan] = useState<GuidePlan>(initialPlan);
  const [device, setDevice] = useState<GuideDevice>("windows");
  const [browser, setBrowser] = useState<GuideBrowser>("chrome");
  const actualDevice = getGuideDevice(plan, device);
  const actualBrowser = getGuideBrowser(actualDevice, browser);

  return (
    <div className={styles.page} data-usage-guide>
      <div className="site-container">
        <header className={styles.heading}>
          <h1 className="type-page-title">사용가이드</h1>
          <p className="type-body-lg">
            메뉴판을 여는 순간부터, 매장에 꼭 맞는 화면까지.
          </p>
        </header>
        <Tabs
          value={plan}
          onValueChange={(value) => setPlan(value as GuidePlan)}
          className={styles.tabs}
        >
          <TabsList aria-label="플랜별 사용가이드" className={styles.planTabs}>
            {GUIDE_PLANS.map((entry) => (
              <TabsTrigger key={entry.id} value={entry.id}>
                {entry.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {GUIDE_PLANS.map((entry) => {
            const sections = getGuideSections(
              entry.id,
              getGuideDevice(entry.id, device),
              browser,
            );
            return (
              <TabsContent
                key={entry.id}
                value={entry.id}
                className={styles.planContent}
              >
                <p className={`type-body ${styles.planDescription}`}>
                  {entry.body}
                </p>
                <div className={styles.topics} aria-label="가이드 종류">
                  <a
                    href={`#${entry.id}-${entry.id === "display" ? "connection" : "fullscreen"}`}
                    className="site-button site-button-primary"
                  >
                    {entry.id === "display"
                      ? "화면 연결·브라우저 설정 가이드"
                      : "브라우저 설정 가이드"}
                  </a>
                  <button
                    type="button"
                    className="site-button site-button-outline"
                    disabled
                  >
                    추가 가이드 · 준비 중
                  </button>
                </div>
                <div className={styles.preferences}>
                  <p className="type-content-title">
                    사용 중인 기기와 브라우저
                  </p>
                  <div className={styles.fields}>
                    <label
                      className="type-label"
                      htmlFor={`${entry.id}-device`}
                    >
                      기기
                      <select
                        id={`${entry.id}-device`}
                        className="site-field"
                        value={actualDevice}
                        onChange={(event) => {
                          const next = event.target.value as GuideDevice;
                          setDevice(next);
                          setBrowser(getGuideBrowser(next, browser));
                        }}
                      >
                        {GUIDE_DEVICES.filter(
                          (item) =>
                            entry.id !== "display" ||
                            item.id === "windows" ||
                            item.id === "mac",
                        ).map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label
                      className="type-label"
                      htmlFor={`${entry.id}-browser`}
                    >
                      브라우저
                      <select
                        id={`${entry.id}-browser`}
                        className="site-field"
                        value={actualBrowser}
                        onChange={(event) =>
                          setBrowser(event.target.value as GuideBrowser)
                        }
                      >
                        {getGuideBrowsers(actualDevice).map((id) => (
                          <option value={id} key={id}>
                            {GUIDE_BROWSER_LABELS[id]}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <p className="type-body-sm">
                    삼성 노트북은 Windows PC, 갤럭시 탭은 Android 태블릿을
                    선택하세요.
                  </p>
                </div>
                <nav
                  className={styles.jumpLinks}
                  aria-label={`${entry.label} 가이드 바로가기`}
                >
                  {sections.map((section) => (
                    <a
                      key={section.id}
                      href={`#${entry.id}-${section.id}`}
                      className="site-button site-button-ghost type-label"
                    >
                      {section.id === "fullscreen"
                        ? "전체 화면·주소창"
                        : section.id === "zoom"
                          ? "메뉴판 크기 조정"
                          : "화면 연결"}
                      <ArrowDown size={14} aria-hidden="true" />
                    </a>
                  ))}
                </nav>
                <div
                  className={styles.articles}
                  key={`${actualDevice}-${actualBrowser}`}
                >
                  {sections.map((section) => (
                    <GuideArticle
                      key={section.id}
                      section={section}
                      plan={entry.id}
                      device={actualDevice}
                      browser={actualBrowser}
                    />
                  ))}
                </div>
                <p className={`type-body-sm ${styles.mobileNote}`}>
                  손님이 휴대전화로 QR을 스캔해 여는 메뉴판은 별도 설정 없이
                  이용할 수 있습니다. 주소창 표시와 확대 방식은 손님의
                  브라우저를 따릅니다.
                </p>
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </div>
  );
}
