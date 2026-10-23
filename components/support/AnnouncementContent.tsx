import { Fragment, type ReactNode } from "react";
import {
  readAnnouncementDocument,
  type AnnouncementNode,
} from "@/lib/announcement-content";
import styles from "./announcement-content.module.css";

function renderNode(node: AnnouncementNode, key: number): ReactNode {
  const children = node.content?.map(renderNode);
  switch (node.type) {
    case "text": {
      let text: ReactNode = node.text;
      for (const mark of node.marks ?? []) {
        if (mark.type === "bold") text = <strong>{text}</strong>;
        else if (mark.type === "italic") text = <em>{text}</em>;
        else if (mark.type === "underline") text = <u>{text}</u>;
        else if (mark.type === "textStyle")
          text = <span style={{ fontSize: mark.attrs?.fontSize }}>{text}</span>;
      }
      return <Fragment key={key}>{text}</Fragment>;
    }
    case "paragraph":
      return <p key={key}>{children ?? <br />}</p>;
    case "hardBreak":
      return <br key={key} />;
    // The allowlist accepts only our immutable, raster announcement uploads.
    // eslint-disable-next-line @next/next/no-img-element
    case "image":
      return (
        <img
          key={key}
          src={node.attrs?.src}
          alt={node.attrs?.alt ?? ""}
          loading="lazy"
          decoding="async"
        />
      );
    case "bulletList":
      return <ul key={key}>{children}</ul>;
    case "orderedList":
      return (
        <ol key={key} start={node.attrs?.start}>
          {children}
        </ol>
      );
    case "listItem":
      return <li key={key}>{children}</li>;
    case "doc":
      return <Fragment key={key}>{children}</Fragment>;
  }
}

export default function AnnouncementContent({ body }: { body: string }) {
  const doc = readAnnouncementDocument(body);
  return (
    <div className={styles.body}>
      {doc ? (
        renderNode(doc, 0)
      ) : (
        <p>본문을 표시할 수 없습니다. 고객센터로 문의해 주세요.</p>
      )}
    </div>
  );
}
