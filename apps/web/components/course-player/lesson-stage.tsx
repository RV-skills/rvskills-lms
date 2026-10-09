"use client";

import type { JSX } from "react";
import type { LessonContentType, PlayerLesson, PlayerResource } from "@/lib/course-player";

// What the stage is showing: the lesson itself, or one of its resources.
export type StageContent =
  | { kind: "lesson"; lesson: PlayerLesson }
  | { kind: "resource"; resource: PlayerResource };

interface StageItem {
  key: string;
  type: LessonContentType;
  url: string | null;
  title: string;
}

// Only ever render http(s) links. A "javascript:" URL in a link or player could run code
// in the student's browser, and lesson video URLs are not validated on save yet.
function webUrlOrNull(url: string | null): string | null {
  return url && /^https?:\/\//i.test(url) ? url : null;
}

function toStageItem(content: StageContent): StageItem {
  if (content.kind === "resource") {
    const r = content.resource;
    return { key: `r-${r.resource_id}`, type: r.resource_type, url: webUrlOrNull(r.file_url), title: r.title };
  }
  const l = content.lesson;
  return { key: `l-${l.lesson_id}`, type: l.content_type, url: webUrlOrNull(l.video_url), title: l.title };
}

export function LessonStage({ content }: { content: StageContent }): JSX.Element {
  const item = toStageItem(content);
  return (
    <div className="aspect-video w-full overflow-hidden rounded-lg border border-neutral-100 bg-neutral-900">
      {/* key: switching items starts the viewer fresh instead of reusing the old one's state */}
      <StageBody key={item.key} item={item} />
    </div>
  );
}

function StageBody({ item }: { item: StageItem }): JSX.Element {
  if (item.type === "QUIZ") {
    return <StageMessage text="This lesson is a quiz. Open the Assessments tab below to take it." />;
  }
  if (!item.url) {
    return <StageMessage text="This lesson has no content yet." />;
  }

  switch (item.type) {
    case "VIDEO":
      // Stand-in until the custom player (next steps)
      return <video className="h-full w-full" src={item.url} controls controlsList="nodownload" />;
    case "PDF":
    case "SLIDE":
      // Stand-in until the PDF viewer (next steps)
      return <StageMessage text={`Document viewer coming next: ${item.title}`} />;
    case "LINK":
      return <LinkCard url={item.url} title={item.title} />;
    case "OTHER":
      return <StageMessage text="This content can't be shown here yet." />;
  }
}

function StageMessage({ text }: { text: string }): JSX.Element {
  return <div className="flex h-full items-center justify-center p-6 text-center text-sm text-neutral-500">{text}</div>;
}

// Most outside websites refuse to be shown inside another site, so a link gets a card
// in the stage with a button that opens it in a new tab.
function LinkCard({ url, title }: { url: string; title: string }): JSX.Element {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-sm text-neutral-100">{title}</p>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-md bg-primary-500 px-4 py-2 text-sm text-white hover:bg-primary-700"
      >
        Open link
      </a>
    </div>
  );
}