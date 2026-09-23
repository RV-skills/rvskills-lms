"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  getCoursePlayerData,
  type CoursePlayerResult,
  type PlayerLesson,
} from "@/lib/course-player";
import { enrollInCourse } from "@/lib/enrollment";
import { AssessmentsTab } from "@/components/course-player/assessments-tab";

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

export default function CoursePlayerPage() {
  const params = useParams();
  const courseId = params.id as string;
  const [result, setResult] = useState<CoursePlayerResult | undefined>(undefined);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollError, setEnrollError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);

  const load = useCallback(() => {
    getCoursePlayerData(courseId).then(setResult);
  }, [courseId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleEnroll() {
    setEnrolling(true);
    setEnrollError(null);
    try {
      const enrollResult = await enrollInCourse(courseId);
      if (enrollResult.status === "not_available") {
        setEnrollError(enrollResult.message);
        return;
      }
      load();
    } finally {
      setEnrolling(false);
    }
  }

  if (result === undefined) {
    return <main className="p-10 text-sm text-neutral-500">Loading...</main>;
  }

  if (result.status === "not_found") {
    return (
      <main className="p-10 text-center">
        <h1 className="text-xl text-neutral-900">Course not found</h1>
        <p className="mt-2 text-sm text-neutral-500">
          This course may have been removed or is no longer available.
        </p>
      </main>
    );
  }

  if (result.status === "no_lessons") {
    return (
      <main className="p-10 text-center">
        <h1 className="text-xl text-neutral-900">No lessons yet</h1>
        <p className="mt-2 text-sm text-neutral-500">
          This course doesn&apos;t have any lessons published yet. Check back soon.
        </p>
      </main>
    );
  }

  if (result.status === "not_enrolled") {
    return (
      <main className="p-10 text-center">
        <h1 className="text-xl text-neutral-900">Enroll to start learning</h1>
        <p className="mt-2 text-sm text-neutral-500">
          You need to be enrolled in this course to access the lessons.
        </p>
        {enrollError && <p className="mt-4 text-sm text-danger">{enrollError}</p>}
        <Button className="mt-6" onClick={handleEnroll} loading={enrolling}>
          Enroll now
        </Button>
      </main>
    );
  }

  const { courseTitle, modules, currentLesson } = result.data;
  const allLessons = modules.flatMap((m) => m.lessons);
  const completedCount = allLessons.filter((l) => l.status === "completed").length;
  const progressPct = allLessons.length > 0 ? (completedCount / allLessons.length) * 100 : 0;
  const displayedLesson =
    allLessons.find((l) => l.lesson_id === selectedLessonId) ?? currentLesson;
  const displayedResource = displayedLesson.resources.find(
    (r) => r.resource_id === selectedResourceId
  );

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "resources", label: "Resources" },
    { key: "discussion", label: "Discussion" },
    { key: "assessments", label: "Assessments" },
  ];

  return (
    <main className="mx-auto flex max-w-6xl gap-8 px-6 py-10">
      <div className="flex-1">
        {displayedResource ? (
          <iframe
            key={displayedResource.resource_id}
            src={displayedResource.pdf_url}
            className="aspect-video w-full rounded-lg border border-neutral-100 bg-white"
          />
        ) : displayedLesson.video_url ? (
          <video
            key={displayedLesson.lesson_id}
            controls
            className="aspect-video w-full rounded-lg bg-neutral-900"
            src={displayedLesson.video_url}
          />
        ) : (
          <div className="flex aspect-video w-full items-center justify-center rounded-lg bg-neutral-900 text-sm text-neutral-500">
            No video available for this lesson
          </div>
        )}

        <h2 className="mt-4 text-lg text-neutral-900">{displayedLesson.title}</h2>
        {displayedLesson.estimated_duration_mins !== null && (
          <p className="mt-1 text-sm text-neutral-500">
            {displayedLesson.estimated_duration_mins} min
          </p>
        )}

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
          {activeTab === "assessments" && <AssessmentsTab courseId={courseId} />}
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
            {completedCount} of {allLessons.length} lesson{allLessons.length !== 1 ? "s" : ""} complete
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-4">
          {modules.map((module) => (
            <div key={module.module_id}>
              <h2 className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                {module.title}
              </h2>
              <div className="mt-2 flex flex-col gap-1">
                {module.lessons.map((lesson) => (
                  <button
                    key={lesson.lesson_id}
                    onClick={() => {
                      setSelectedLessonId(lesson.lesson_id);
                      setSelectedResourceId(null);
                    }}
                    className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-neutral-100"
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
          ))}
        </div>
      </aside>
    </main>
  );
}