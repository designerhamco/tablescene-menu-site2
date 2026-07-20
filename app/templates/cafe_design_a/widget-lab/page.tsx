import type { Metadata } from "next";
import { notFound } from "next/navigation";

import CafeAWidgetBlock, { type CafeAWidgetPreview } from "@/components/menu-templates/CafeAWidgetBlock";
import KoreanFontAssets from "@/components/menu-templates/shared/KoreanFontAssets";
import {
  CAFE_A_WIDGET_ALL_FIXTURES,
  CAFE_A_WIDGET_CONSECUTIVE_FIXTURES,
  CAFE_A_WIDGET_IMAGE_TEXT_FIXTURES,
  CAFE_A_WIDGET_RATIO_FIXTURES,
  CAFE_A_WIDGET_TEXT_FIXTURES,
  CAFE_A_WIDGET_TYPE_FIXTURES,
} from "@/lib/template-demo-data/cafe-a-widget-preview";
import {
  getDefaultTypographyPreset,
  getEnglishFontLoadAssets,
  getKoreanFontLoadAssets,
} from "@/lib/template-typography-presets";

export const metadata: Metadata = {
  title: "CafeA Widget Lab",
  robots: {
    index: false,
    follow: false,
  },
};

type WidgetLabSectionProps = {
  title: string;
  description: string;
  widgets: CafeAWidgetPreview[];
  columns?: "single" | "grid";
};

function WidgetLabSection({ title, description, widgets, columns = "grid" }: WidgetLabSectionProps) {
  return (
    <section className="min-w-0">
      <div className="mb-4">
        <h2 className="text-[clamp(1.25rem,2.2vw,1.85rem)] font-black leading-[0.95] tracking-[-0.01em] text-[#191c1b]">
          {title}
        </h2>
        <p className="mt-2 max-w-[48rem] text-sm font-semibold leading-relaxed text-[#191c1b]/60">{description}</p>
      </div>
      <div
        className={
          columns === "single"
            ? "grid max-w-[27rem] gap-4"
            : "grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
        }
      >
        {widgets.map((widget) => (
          <div key={widget.id} className="min-w-0">
            <CafeAWidgetBlock widget={widget} />
          </div>
        ))}
      </div>
    </section>
  );
}

export default function CafeAWidgetLabPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const hiddenRenderedCount = CAFE_A_WIDGET_ALL_FIXTURES.filter((widget) => !widget.visible).length;
  const typographySettings = getDefaultTypographyPreset("cafe_design_a");
  const koreanFontAssets = getKoreanFontLoadAssets(typographySettings.korean_font_key);
  const englishFontAssets = getEnglishFontLoadAssets(typographySettings.english_font_key);

  return (
    <main className="min-h-screen bg-[#f7f6f2] px-4 py-6 text-[#191c1b] sm:px-6 lg:px-10">
      <KoreanFontAssets assets={[koreanFontAssets, englishFontAssets]} />
      <div className="mx-auto max-w-[88rem]">
        <header className="mb-8 grid gap-5 border-b border-[#191c1b]/70 pb-6 lg:grid-cols-[minmax(15rem,0.7fr)_minmax(0,1fr)] lg:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#191c1b]/55">Development Only</p>
            <h1 className="mt-2 text-[clamp(2.5rem,7vw,5.8rem)] font-black leading-[0.88] tracking-[-0.03em]">
              AUBE
              <br />
              WIDGET LAB
            </h1>
          </div>
          <p className="max-w-[38rem] text-sm font-semibold leading-relaxed text-[#191c1b]/64">
            CafeA 실제 메뉴 열 폭에 들어갈 위젯 visual shell만 확인하는 개발 전용 화면입니다. DB, public loader,
            editor, CafeDesignA 배치 엔진과는 연결되어 있지 않습니다.
          </p>
        </header>

        <div className="grid gap-10">
          <WidgetLabSection
            title="Widget Types"
            description="image, text, image+text 기본형을 같은 메뉴 열 너비 안에서 비교합니다."
            widgets={CAFE_A_WIDGET_TYPE_FIXTURES}
          />

          <WidgetLabSection
            title="Aspect Ratios"
            description="2:1, 3:2 contain, 1:1, 3:4 이미지 비율을 확인합니다."
            widgets={CAFE_A_WIDGET_RATIO_FIXTURES}
          />

          <WidgetLabSection
            title="Text Auto Height"
            description="짧은 공지, 제목 없는 안내, 긴 본문, 영문 혼합 중앙 정렬을 확인합니다."
            widgets={CAFE_A_WIDGET_TEXT_FIXTURES}
          />

          <WidgetLabSection
            title="Image And Text"
            description="이미지 영역에만 ratio를 적용하고 텍스트는 자동 높이로 이어붙인 정책입니다."
            widgets={CAFE_A_WIDGET_IMAGE_TEXT_FIXTURES}
          />

          <div className="grid gap-10 lg:grid-cols-[minmax(18rem,27rem)_minmax(18rem,24rem)] lg:items-start">
            <WidgetLabSection
              title="Single Menu Column"
              description="실제 CafeA 메뉴 열 한 칸에 가까운 폭입니다."
              widgets={CAFE_A_WIDGET_CONSECUTIVE_FIXTURES}
              columns="single"
            />

            <section className="min-w-0">
              <div className="mb-4">
                <h2 className="text-[clamp(1.25rem,2.2vw,1.85rem)] font-black leading-[0.95] text-[#191c1b]">
                  Mobile Width
                </h2>
                <p className="mt-2 text-sm font-semibold leading-relaxed text-[#191c1b]/60">
                  360px대 모바일 폭에서 100% 너비와 긴 본문 흐름을 확인합니다.
                </p>
              </div>
              <div className="mx-auto grid w-full max-w-[22.5rem] gap-4">
                {CAFE_A_WIDGET_CONSECUTIVE_FIXTURES.map((widget) => (
                  <CafeAWidgetBlock key={`mobile-${widget.id}`} widget={widget} />
                ))}
              </div>
            </section>
          </div>

          <section className="border-t border-[#191c1b]/70 pt-5 text-xs font-bold leading-relaxed text-[#191c1b]/55">
            Hidden fixture count: {hiddenRenderedCount}. visible=false 위젯은 실제 목록에 렌더링하지 않습니다.
          </section>
        </div>
      </div>
    </main>
  );
}
