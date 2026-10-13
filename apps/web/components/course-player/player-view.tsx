"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CoursePlayerData, PlayerLesson } from "@/lib/course-player";
import { AssessmentsTab } from "./assessments-tab";
import { LessonStage } from "./lesson-stage";

type Tab = "overview" | "resources" | "discussion" | "assessments";

function dotColor(status: PlayerLesson["status"]): string {
  switch (status) {
    case "completed":
      return "bg-success";
    case "current":
      return "bg-primary-500";
    default:
      return "bg-neutral-100 border border-neutral-500";
  }
}

// The course player screen. Students and the faculty preview both render this, so the
// preview always matches what students get. In preview mode nothing is saved: lessons
// can't be marked complete, assessments can't be submitted, and locked modules stay
// open so faculty can check their content.
export function PlayerView({
  courseId,
  data,
  preview = false,
  onMarkComplete,
}: {
  courseId: string;
  data: CoursePlayerData;
  preview?: boolean;
  onMarkComplete?: (lessonId: string) => Promise<void>;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);

  const { courseTitle, modules, currentLesson } = data;

  const lessonsWithModuleLock = modules.flatMap((m) =>
    m.lessons.map((l) => ({ ...l, moduleLocked: m.is_locked }))
  );
  const completedCount = lessonsWithModuleLock.filter((l) => l.status === "completed").length;
  const totalCount = lessonsWithModuleLock.length;
  const progressPct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const courseComplete = totalCount > 0 && completedCount === totalCount;

  const displayedLesson =
    lessonsWithModuleLock.find((l) => l.lesson_id === selectedLessonId) ?? currentLesson;
  const displayedResource = displayedLesson.resources.find(
    (r) => r.resource_id === selectedResourceId
  );

  function selectLesson(lessonId: string) {
    setSelectedLessonId(lessonId);
    setSelectedResourceId(null);
  }

  async function handleMarkComplete() {
    if (preview || !onMarkComplete) return;
    setCompleting(true);
    try {
      const currentIndex = lessonsWithModuleLock.findIndex(
        (l) => l.lesson_id === displayedLesson.lesson_id
      );
      const nextLesson = lessonsWithModuleLock[currentIndex + 1];
      await onMarkComplete(displayedLesson.lesson_id);
      if (nextLesson) {
        selectLesson(nextLesson.lesson_id);
      }
    } finally {
      setCompleting(false);
    }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "resources", label: "Resources" },
    { key: "discussion", label: "Discussion" },
    { key: "assessments", label: "Assessments" },
  ];

  return (
    <div className="mx-auto flex max-w-6xl gap-8 px-6 py-10">
      <div className="flex-1">
        {courseComplete && (
          <div className="mb-6 rounded-lg bg-success/10 px-4 py-3 text-sm text-success">
            You&apos;ve completed this course. Nice work!
          </div>
        )}

        {displayedResource && (
          <button
            onClick={() => setSelectedResourceId(null)}
            className="mb-2 text-sm text-primary-700 hover:underline"
          >
            ← Back to lesson
          </button>
        )}

        <LessonStage
          content={
            displayedResource
              ? { kind: "resource", resource: displayedResource }
              : { kind: "lesson", lesson: displayedLesson }
          }
        />

        <h2 className="mt-4 text-lg text-neutral-900">{displayedLesson.title}</h2>
        {displayedLesson.estimated_duration_mins !== null && (
          <p className="mt-1 text-sm text-neutral-500">
            {displayedLesson.estimated_duration_mins} min
          </p>
        )}

        {displayedLesson.status !== "completed" &&
          (preview ? (
            <div className="mt-4 flex items-center gap-3">
              <Button size="sm" disabled>
                Mark as complete
              </Button>
              <span className="text-xs text-neutral-500">Students use this to record progress. Off in preview.</span>
            </div>
          ) : (
            <Button size="sm" className="mt-4" onClick={handleMarkComplete} loading={completing}>
              Mark as complete
            </Button>
          ))}

        <div className="mt-6 flex gap-6 border-b border-neutral-100">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`-mb-px border-b-2 pb-3 text-sm ${
                activeTab === tab.key
                  ? "border-primary-500 text-primary-700"
                  : "border-transparent text-neutral-500 hover:text-neutral-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {activeTab === "overview" && (
            <p className="text-sm text-neutral-500">
              {displayedLesson.description ?? "No overview has been added for this lesson yet."}
            </p>
          )}
          {activeTab === "resources" && (
            displayedLesson.resources.length === 0 ? (
              <p className="text-sm text-neutral-500">
                No resources have been added for this lesson yet.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {displayedLesson.resources.map((resource) => (
                  <button
                    key={resource.resource_id}
                    onClick={() => setSelectedResourceId(resource.resource_id)}
                    className={`flex items-center justify-between rounded-md px-4 py-3 text-left text-sm ${
                      resource.resource_id === selectedResourceId
                        ? "bg-primary-100 text-primary-700"
                        : "bg-neutral-50 text-neutral-900 hover:bg-neutral-100"
                    }`}
                  >
                    {resource.title}
                  </button>
                ))}
              </div>
            )
          )}
          {activeTab === "discussion" && (
            <p className="text-sm text-neutral-500">
              Discussion isn&apos;t available yet. Check back soon.
            </p>
          )}
          {activeTab === "assessments" && <AssessmentsTab courseId={courseId} preview={preview} />}
        </div>
      </div>

      <aside className="w-80 flex-shrink-0">
        <h1 className="text-lg text-neutral-900">{courseTitle}</h1>

        <div className="mt-4">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
            <div
              className="h-full rounded-full bg-primary-500 transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-neutral-500">
            {completedCount} of {totalCount} lesson{totalCount !== 1 ? "s" : ""} complete
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-4">
          {modules.map((module) => {
            // Students can't open a locked module. Faculty previewing can, to check it.
            const blocked = module.is_locked && !preview;
            return (
              <div key={module.module_id}>
                <h2 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-neutral-500">
                  {module.title}
                  {module.is_locked && <Lock size={12} />}
                </h2>
                {module.is_locked && preview && (
                  <p className="mt-1 text-xs text-neutral-500">Locked for students until the previous module is done.</p>
                )}
                <div className="mt-2 flex flex-col gap-1">
                  {module.lessons.map((lesson) => (
                    <button
                      key={lesson.lesson_id}
                      onClick={() => !blocked && selectLesson(lesson.lesson_id)}
                      disabled={blocked}
                      className={`flex w-full items-center gap-3 rounded-md px-2 py-2 text-left ${
                        blocked
                          ? "cursor-not-allowed opacity-50"
                          : module.is_locked
                            ? "opacity-70 hover:bg-neutral-100"
                            : "hover:bg-neutral-100"
                      }`}
                    >
                      <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${dotColor(lesson.status)}`} />
                      <span
                        className={
                          lesson.lesson_id === displayedLesson.lesson_id
                            ? "text-sm text-neutral-900"
                            : "text-sm text-neutral-500"
                        }
                      >
                        {lesson.title}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </aside>
    </div>
  );
}
