import { notFound } from "next/navigation";

import MenuPageRenderer from "@/components/menu/MenuPageRenderer";
import {
  buildCafeAWidgetLengthFixture,
  getCafeAWidgetLengthFixtureAttributes,
  parseCafeAWidgetLengthFixtureOptions,
} from "@/lib/template-demo-data/cafe-a-widget-length-fixture";

import WidgetLengthFixtureMarkers from "./WidgetLengthFixtureMarkers";

type PageProps = {
  searchParams?: Promise<{
    type?: string | string[];
    count?: string | string[];
    title?: string | string[];
    body?: string | string[];
    locale?: string | string[];
    align?: string | string[];
    layout?: string | string[];
    content?: string | string[];
  }>;
};

export const metadata = {
  title: "CafeA Widget Length Fixture",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function CafeAWidgetLengthFixturePage({ searchParams }: PageProps) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const query = searchParams ? await searchParams : {};
  const options = parseCafeAWidgetLengthFixtureOptions(query);
  const fixture = buildCafeAWidgetLengthFixture(options);

  return (
    <main className="contents" {...getCafeAWidgetLengthFixtureAttributes(options)}>
      <MenuPageRenderer
        mode="preview"
        previewLayoutMode={options.layout}
        debugCafeA={false}
        {...fixture.data}
      />
      <WidgetLengthFixtureMarkers widgets={fixture.widgets} />
    </main>
  );
}
