"use client";

import {
  CONTENT_TYPE_LABEL,
  formatMinutes,
  moduleMinutes,
  parseDuration,
  type DraftCourse,
} from "@/lib/course-outline";

// The course hierarchy as a tree: course, then numbered modules and lessons.
// Used live beside the builder and again, full size, on the review step.
export function OutlineTree({ draft, size = "sm" }: { draft: DraftCourse; size?: "sm" | "lg" }) {
  const title = draft.title.trim() || "Untitled course";
  const text = size === "lg" ? "text-sm" : "text-xs";

  return (
    <div className={text}>
      <p className={`${size === "lg" ? "text-base" : "text-sm"} text-neutral-900`}>{title}</p>
      <p className="mt-0.5 text-xs capitalize text-neutral-500">{draft.difficulty}</p>

      {draft.modules.length === 0 ? (
        <p className="mt-4 text-neutral-500">No modules yet.</p>
      ) : (
        <ol className="mt-4 flex flex-col gap-3">
          {draft.modules.map((m, mi) => {
            const mins = moduleMinutes(m);
            return (
              <li key={m.key}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className={m.title.trim() ? "text-neutral-900" : "italic text-danger"}>
                    {mi + 1}. {m.title.trim() || "Module title missing"}
                  </span>
                  <span className="flex-shrink-0 text-neutral-500">
                    {m.lessons.length} lesson{m.lessons.length !== 1 ? "s" : ""}
                    {mins > 0 && ` · ${formatMinutes(mins)}`}
                  </span>
                </div>
                {m.lessons.length === 0 ? (
                  <p className="ml-4 mt-1 border-l border-neutral-100 pl-3 italic text-neutral-500">Empty module</p>
                ) : (
                  <ol className="ml-4 mt-1 flex flex-col gap-0.5 border-l border-neutral-100 pl-3">
                    {m.lessons.map((l, li) => {
                      const d = parseDuration(l.duration);
                      return (
                        <li key={l.key} className="flex items-baseline justify-between gap-2">
                          <span className={l.title.trim() ? "text-neutral-900" : "italic text-danger"}>
                            {mi + 1}.{li + 1} {l.title.trim() || "Lesson title missing"}
                          </span>
                          <span className="flex-shrink-0 text-neutral-500">
                            {CONTENT_TYPE_LABEL[l.content_type]}
                            {typeof d === "number" && ` · ${d} min`}
                          </span>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
