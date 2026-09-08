"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getCourseDetail, moduleDurationMins, type CourseDetail } from "@/lib/course-details";

function difficultyToTone(difficulty: string): BadgeTone {
  switch (difficulty.toLowerCase()) {
    case "beginner":
      return "success";
    case "intermediate":
      return "warning";
    case "advanced":
      return "danger";
    default:
      return "neutral";
  }
}

export default function CourseDetailPage() {
  const params = useParams();
  const courseId = params.id as string;
  const [course, setCourse] = useState<CourseDetail | null | undefined>(undefined);

  useEffect(() => {
    getCourseDetail(courseId).then(setCourse);
  }, [courseId]);

  if (course === undefined) {
    return <main className="p-10 text-sm text-neutral-500">Loading...</main>;
  }

  if (course === null) {
    return (
      <main className="p-10 text-center">
        <h1 className="text-xl text-neutral-900">Course not found</h1>
        <p className="mt-2 text-sm text-neutral-500">
          This course may have been removed or is no longer available.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="flex flex-col gap-6 sm:flex-row">
        <div className="h-48 flex-1 rounded-lg bg-neutral-100" />
        <div className="flex flex-1 flex-col gap-3">
          <Badge tone={difficultyToTone(course.difficulty)} className="self-start">
            {course.difficulty}
          </Badge>
          <h1 className="text-2xl text-neutral-900">{course.title}</h1>
          {course.description && (
            <p className="text-sm text-neutral-500">{course.description}</p>
          )}
          <div className="flex items-center gap-2">
            <Avatar name={course.instructorName} size="sm" />
            <span className="text-sm text-neutral-900">{course.instructorName}</span>
          </div>
        </div>
      </div>

      <h2 className="mt-10 text-xl text-neutral-900">Syllabus</h2>
      <div className="mt-4 flex flex-col gap-2">
        {course.modules.map((module) => {
          const duration = moduleDurationMins(module);
          return (
            <div
              key={module.module_id}
              className="flex items-center justify-between rounded-md bg-neutral-50 px-4 py-3"
            >
              <span className="text-sm text-neutral-900">
                {module.title}
                {module.is_locked && (
                  <span className="ml-2 text-xs text-neutral-500">(locked)</span>
                )}
              </span>
              <span className="text-xs text-neutral-500">
                {module.lessons.length} lesson{module.lessons.length !== 1 ? "s" : ""}
                {duration !== null && ` \u00b7 ${duration} min`}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-8 flex justify-end border-t border-neutral-100 pt-6">
        <Button>Enroll now</Button>
      </div>
    </main>
  );
}