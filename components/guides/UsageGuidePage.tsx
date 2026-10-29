"use client";

import { Fragment, useEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { ArrowUpRight, ChevronDown, EllipsisVertical, Fullscreen, Minus, Plus, Video } from "lucide-react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/app/components/ui/tabs";
import {
  GUIDE_PLANS,
  GUIDE_VIDEOS,
  getGuideSections,
  normalizeGuidePlan,
  guideVideoKey,
  type GuideControl,
  type GuideStep,
  type GuidePlan,
  type GuideTabPlan,
  type GuideDevice,
  type GuideBrowser,
  type GuideSection,
  type GuideVideo,
} from "@/lib/usage-guides";
import styles from "./usage-guide.module.css";
import SitePageHeader from "@/components/layout/SitePageHeader";

const GUIDE_DEVICE = "windows";
const GUIDE_BROWSER = "chrome";

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
const GUIDE_CONTROLS = {
  more: { label: "더보기", icon: EllipsisVertical },
  fullscreen: { label: "전체 화면", icon: Fullscreen },
  "zoom-in": { label: "확대", icon: Plus },
  "zoom-out": { label: "축소", icon: Minus },
} satisfies Record<GuideControl, { label: string; icon: typeof Plus }>;

function InstructionStep({ step }: { step: GuideStep }) {
  if (typeof step === "string") return step;
  return step.map((part, index) => {
    if (typeof part === "string") return <Fragment key={index}>{part}</Fragment>;
    const { label, icon: Icon } = GUIDE_CONTROLS[part.control];
    return (
      <span className={styles.browserControl} key={index}>
        <strong>{label}</strong>
        <Icon size={18} strokeWidth={2} aria-hidden="true" />
      </span>
    );
  });
}

function GuideInstructions({ section }: { section: GuideSection }) {
  return (
    <div className={styles.instructionBox}>
      <h3 className="type-content-title">{section.id === "connection" ? "연결 순서" : "브라우저 메뉴로 설정"}</h3>
      <ol className={styles.steps}>
        {section.steps.map((step, index) => (
          <li className="type-body" key={index}>
            <InstructionStep step={step} />
          </li>
        ))}
      </ol>
      {section.toolbar && (
        <div className={styles.instructionGroup}>
          <h3 className="type-content-title">주소창·툴바 숨기기</h3>
          {section.toolbar.map((entry) => (
            <div className={styles.toolbarSteps} key={entry.device}>
              <h4 className="type-label">{entry.device}</h4>
              <ol className={styles.steps}>
                {entry.steps.map((step) => <li className="type-body" key={step}>{step}</li>)}
              </ol>
            </div>
          ))}
        </div>
      )}
      {section.shortcuts && (
        <div className={styles.instructionGroup}>
          <h3 className="type-content-title">단축키로 설정</h3>
          <dl className={styles.shortcutRows}>
            {section.shortcuts.map((shortcut) => (
              <div className={styles.shortcutRow} key={shortcut.device}>
                <dt className="type-label">{shortcut.device}</dt>
                <dd className={styles.shortcutCommands}>
                  {shortcut.commands.map((command) => (
                    <div className={styles.shortcutCommand} key={command.label}>
                      <span className="type-body-sm">{command.label}</span>
                      <span className={styles.keys}>
                        {command.keys.map((key, index) => (
                          <Fragment key={index}>
                            {index > 0 && <span aria-hidden="true">+</span>}
                            <kbd aria-label={key === "⌘" ? "Command" : undefined}>
                              {key}
                            </kbd>
                          </Fragment>
                        ))}
                      </span>
                    </div>
                  ))}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}

function GuideDescription({ titleId, mediaRef, children }: {
  titleId: string;
  mediaRef: RefObject<HTMLDivElement | null>;
  children: ReactNode;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [preview, setPreview] = useState({ canExpand: false, height: 0 });

  useEffect(() => {
    const media = mediaRef.current;
    const content = contentRef.current;
    if (!media || !content) return;

    let active = true;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const height = media.getBoundingClientRect().height;
      const canExpand = window.matchMedia("(min-width: 768px)").matches &&
        content.scrollHeight > height + 1;
      setPreview(previous => previous.canExpand === canExpand && previous.height === height
        ? previous : { canExpand, height });
    };
    const schedule = () => {
      if (active && !frame) frame = requestAnimationFrame(measure);
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(media);
    observer.observe(content);
    window.addEventListener("resize", schedule);
    document.fonts.ready.then(schedule);
    schedule();

    return () => {
      active = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", schedule);
    };
  }, [mediaRef]);

  const collapsed = preview.canExpand && !expanded;
  function toggleDescription() {
    setExpanded(!expanded);
    if (expanded) requestAnimationFrame(() => {
      const button = toggleRef.current;
      const headerBottom = document.querySelector("[data-site-header]")?.getBoundingClientRect().bottom ?? 0;
      if (button && button.getBoundingClientRect().top < headerBottom + 16) {
        button.scrollIntoView({ block: "center", behavior: "instant" });
      }
    });
  }

  return (
    <div
      className={styles.description}
      data-guide-description-wrapper
      data-can-expand={preview.canExpand}
      data-expanded={expanded}
      style={preview.height ? { "--guide-preview-height": `${preview.height}px` } as CSSProperties : undefined}
    >
      <div
        id={`${titleId}-description`}
        className={styles.descriptionClip}
        data-guide-description
        role="region"
        aria-labelledby={titleId}
        onFocusCapture={event => {
          if (!collapsed) return;
          const target = event.target;
          setExpanded(true);
          requestAnimationFrame(() => target.scrollIntoView({ block: "nearest", behavior: "instant" }));
        }}
      >
        <div ref={contentRef} className={styles.articleCopy}>{children}</div>
        {collapsed && <div className={styles.descriptionFade} aria-hidden="true" />}
      </div>
      {preview.canExpand && (
        <button
          ref={toggleRef}
          type="button"
          className={`site-button site-button-outline ${styles.descriptionToggle}`}
          data-guide-description-toggle
          aria-expanded={expanded}
          aria-controls={`${titleId}-description`}
          onClick={toggleDescription}
        >
          {expanded ? "접기" : "더보기"}
          <ChevronDown size={16} aria-hidden="true" />
        </button>
      )}
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
  const mediaRef = useRef<HTMLDivElement>(null);
  return (
    <article
      id={`${plan}-${section.id}`}
      className={styles.article}
      tabIndex={-1}
      aria-labelledby={`${plan}-${section.id}-title`}
    >
      <div
        ref={mediaRef}
        className={styles.media}
        data-guide-media
        id={plan === "basic" ? `dining-${section.id}` : undefined}
      >
        <VideoFrame
          title={section.title}
          video={GUIDE_VIDEOS[guideVideoKey(plan, device, browser, section.id)]}
        />
      </div>
      <GuideDescription titleId={`${plan}-${section.id}-title`} mediaRef={mediaRef}>
        <h2
          id={`${plan}-${section.id}-title`}
          className="type-subsection-title"
        >
          {section.title}
        </h2>
        <p className="type-body">{section.body}</p>
        <GuideInstructions section={section} />
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
      </GuideDescription>
    </article>
  );
}
export default function UsageGuidePage({
  initialPlan = "basic",
}: {
  initialPlan?: GuidePlan;
}) {
  const [plan, setPlan] = useState<GuideTabPlan>(() =>
    normalizeGuidePlan(initialPlan),
  );

  return (
    <div className={styles.page} data-usage-guide>
      <div className="site-container">
        <SitePageHeader title="이용가이드" description="메뉴판 연결부터 브라우저 설정까지, 필요한 이용 방법을 확인하세요." />
        <aside className={`site-notice ${styles.recommendation}`}>
            <p className="type-body-lg font-semibold">
              아티메뉴 메뉴판은 Chrome(크롬) 사용을 권장합니다.
            </p>
            <p className="type-body-sm">
              아래 브라우저 설정은 컴퓨터용 Chrome 기준입니다.
            </p>
          </aside>
        <Tabs
          purpose="page"
          value={plan}
          onValueChange={(value) => setPlan(normalizeGuidePlan(value))}
          className={styles.tabs}
        >
          <TabsList size="lg" aria-label="플랜별 사용가이드" className={styles.planTabs}>
            {GUIDE_PLANS.map((entry) => (
              <TabsTrigger key={entry.id} value={entry.id}>
                {entry.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {GUIDE_PLANS.map((entry) => {
            const sections = getGuideSections(
              entry.id,
              GUIDE_DEVICE,
              GUIDE_BROWSER,
            );
            return (
              <TabsContent
                key={entry.id}
                value={entry.id}
                className={styles.planContent}
              >
                <div
                  className={`site-filter-group ${styles.topics}`}
                  role="group"
                  aria-label="가이드 종류"
                >
                  <a
                    href={`#${entry.id}-${entry.id === "display" ? "connection" : "fullscreen"}`}
                    className="site-filter"
                    aria-current="location"
                  >
                    {entry.id === "display"
                      ? "화면 연결·브라우저 설정 가이드"
                      : "브라우저 설정 가이드"}
                  </a>
                  <button
                    type="button"
                    className="site-filter"
                    disabled
                  >
                    추가 가이드 · 준비 중
                  </button>
                </div>
                <div className={styles.articles}>
                  {sections.map((section) => (
                    <GuideArticle
                      key={section.id}
                      section={section}
                      plan={entry.id}
                      device={GUIDE_DEVICE}
                      browser={GUIDE_BROWSER}
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
