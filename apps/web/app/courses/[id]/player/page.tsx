"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getCoursePlayerData,
  type CoursePlayerResult,
  type PlayerLesson,
} from "@/lib/course-player";
import { enrollInCourse } from "@/lib/enrollment";

function lessonStatusTone(status: PlayerLesson["status"]): BadgeTone {
  switch (status) {
    case "completed":
      return "success";
    case "current":
      return "warning";
    default:
      return "neutral";
  }
}

export default function CoursePlayerPage() {
  const params = useParams();
  const courseId = params.id as string;
  const [result, setResult] = useState<CoursePlayerResult | undefined>(undefined);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollError, setEnrollError] = useState<string | null>(null);

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
      // "ok" and "already_enrolled" both mean the student has an active
      // enrollment now — refetch player data either way.
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
        {enrollError && (
          <p className="mt-4 text-sm text-red-600">{enrollError}</p>
        )}
        <Button className="mt-6" onClick={handleEnroll} disabled={enrolling}>
          {enrolling ? "Enrolling..." : "Enroll now"}
        </Button>
      </main>
    );
  }

  const { courseTitle, modules, currentLesson } = result.data;

  return (
    <main className="mx-auto flex max-w-6xl gap-8 px-6 py-10">
      <aside className="w-72 flex-shrink-0">
        <h1 className="text-lg text-neutral-900">{courseTitle}</h1>
        <div className="mt-6 flex flex-col gap-4">
          {modules.map((module) => (
            <div key={module.module_id}>
              <h2 className="text-sm text-neutral-900">{module.title}</h2>
              <div className="mt-2 flex flex-col gap-1">
                {module.lessons.map((lesson) => (
                  <div
                    key={lesson.lesson_id}
                    className="flex items-center justify-between rounded-md px-3 py-2 text-sm"
                  >
                    <span
                      className={
                        lesson.lesson_id === currentLesson.lesson_id
                          ? "text-neutral-900"
                          : "text-neutral-500"
                      }
                    >
                      {lesson.title}
                    </span>
                    <Badge tone={lessonStatusTone(lesson.status)}>{lesson.status}</Badge>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </aside>

      <section className="flex-1">
        <div className="aspect-video w-full rounded-lg bg-neutral-900" />
        <h2 className="mt-4 text-lg text-neutral-900">{currentLesson.title}</h2>
        {currentLesson.estimated_duration_mins !== null && (
          <p className="mt-1 text-sm text-neutral-500">
            {currentLesson.estimated_duration_mins} min
          </p>
        )}
      </section>
    </main>
  );
}