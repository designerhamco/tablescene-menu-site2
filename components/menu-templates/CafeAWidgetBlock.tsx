/* eslint-disable @next/next/no-img-element */
import type { CSSProperties } from "react";

import type {
  MenuWidgetAspectRatio,
  MenuWidgetObjectFit,
  MenuWidgetTextAlign,
  MenuWidgetType,
} from "@/lib/menu-widgets";

import styles from "./CafeAWidgetBlock.module.css";

export type CafeAWidgetType = MenuWidgetType;

export type CafeAWidgetAspectRatio = MenuWidgetAspectRatio;

export type CafeAWidgetObjectFit = MenuWidgetObjectFit;

export type CafeAWidgetTextAlign = MenuWidgetTextAlign;

type CafeAWidgetBase = {
  id: string;
  type: CafeAWidgetType;
  visible: boolean;
};

export type CafeAImageWidget = CafeAWidgetBase & {
  type: "image";
  imageUrl: string | null;
  altText: string;
  aspectRatio: CafeAWidgetAspectRatio;
  objectFit: CafeAWidgetObjectFit;
};

export type CafeATextWidget = CafeAWidgetBase & {
  type: "text";
  title: string;
  body: string;
  textAlign: CafeAWidgetTextAlign;
};

export type CafeAImageTextWidget = CafeAWidgetBase & {
  type: "image_text";
  imageUrl: string | null;
  altText: string;
  title: string;
  body: string;
  aspectRatio: CafeAWidgetAspectRatio;
  objectFit: CafeAWidgetObjectFit;
  textAlign: CafeAWidgetTextAlign;
};

export type CafeAWidgetPreview = CafeAImageWidget | CafeATextWidget | CafeAImageTextWidget;

type CafeAWidgetBlockProps = {
  widget: CafeAWidgetPreview;
  className?: string;
};

const ASPECT_RATIO_VALUE: Record<CafeAWidgetAspectRatio, string> = {
  "2:1": "2 / 1",
  "3:2": "3 / 2",
  "4:3": "4 / 3",
  "1:1": "1 / 1",
  "3:4": "3 / 4",
};

function joinClassNames(...classNames: Array<string | false | null | undefined>) {
  return classNames.filter(Boolean).join(" ");
}

function getWidgetAspectRatio(widget: CafeAWidgetPreview) {
  return widget.type === "text" ? null : widget.aspectRatio;
}

function renderMedia(widget: CafeAImageWidget | CafeAImageTextWidget) {
  const mediaStyle = {
    "--cafe-a-widget-ratio": ASPECT_RATIO_VALUE[widget.aspectRatio],
  } as CSSProperties;

  return (
    <div className={styles.mediaFrame} style={mediaStyle} data-cafe-a-widget-media>
      {widget.imageUrl ? (
        <img
          src={widget.imageUrl}
          alt={widget.altText}
          className={joinClassNames(
            styles.media,
            widget.objectFit === "contain" ? styles.mediaContain : styles.mediaCover,
          )}
        />
      ) : (
        <div className={styles.fallback}>이미지 준비 중</div>
      )}
    </div>
  );
}

function renderCopy({
  title,
  body,
  textAlign,
}: {
  title: string;
  body: string;
  textAlign: CafeAWidgetTextAlign;
}) {
  const normalizedTitle = title.trim();
  const copyAlignmentClassName =
    textAlign === "center" ? styles.copyCenter : textAlign === "right" ? styles.copyRight : styles.copyLeft;

  return (
    <div className={joinClassNames(styles.copy, copyAlignmentClassName)} data-cafe-a-widget-copy>
      {normalizedTitle ? <p className={styles.title} data-cafe-a-widget-title>{normalizedTitle}</p> : null}
      <p className={joinClassNames(styles.body, !normalizedTitle && styles.bodyOnly)} data-cafe-a-widget-body>{body}</p>
    </div>
  );
}

export default function CafeAWidgetBlock({ widget, className }: CafeAWidgetBlockProps) {
  if (!widget.visible) return null;

  const aspectRatio = getWidgetAspectRatio(widget);

  if (widget.type === "image") {
    return (
      <section
        className={joinClassNames(styles.widget, className)}
        data-cafe-a-widget-block
        data-widget-type={widget.type}
        data-widget-aspect-ratio={aspectRatio ?? undefined}
      >
        <div className={styles.shell} data-cafe-a-widget-shell>{renderMedia(widget)}</div>
      </section>
    );
  }

  if (widget.type === "text") {
    return (
      <section
        className={joinClassNames(styles.widget, className)}
        data-cafe-a-widget-block
        data-widget-type={widget.type}
        data-widget-aspect-ratio={undefined}
      >
        <div className={joinClassNames(styles.shell, styles.textOnly)} data-cafe-a-widget-shell>
          {renderCopy({ title: widget.title, body: widget.body, textAlign: widget.textAlign })}
        </div>
      </section>
    );
  }

  return (
    <section
      className={joinClassNames(styles.widget, className)}
      data-cafe-a-widget-block
      data-widget-type={widget.type}
      data-widget-aspect-ratio={aspectRatio ?? undefined}
    >
      <div className={joinClassNames(styles.shell, styles.imageText)} data-cafe-a-widget-shell>
        {renderMedia(widget)}
        {renderCopy({ title: widget.title, body: widget.body, textAlign: widget.textAlign })}
      </div>
    </section>
  );
}
