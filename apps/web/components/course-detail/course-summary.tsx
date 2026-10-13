"use client";

import { Star } from "lucide-react";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { moduleDurationMins, type CourseDetail, type ModuleDetail } from "@/lib/course-details";

// Pieces of the public course page, shared by the real page and the faculty preview.

export function difficultyToTone(difficulty: string): BadgeTone {
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

export function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          className={n <= Math.round(value) ? "fill-primary-500 text-primary-500" : "text-neutral-100"}
        />
      ))}
    </div>
  );
}

export function CourseHeader({
  course,
  average,
}: {
  course: CourseDetail;
  average: { average: number | null; count: number } | null;
}) {
  return (
    <div className="flex flex-col gap-8 sm:flex-row">
      <div className="h-64 flex-1 rounded-lg bg-neutral-100" />
      <div className="flex flex-1 flex-col gap-3">
        <Badge tone={difficultyToTone(course.difficulty)} className="self-start">
          {course.difficulty}
        </Badge>
        <h1 className="text-2xl text-neutral-900">{course.title}</h1>
        {course.description && <p className="text-sm text-neutral-500">{course.description}</p>}
        <div className="flex items-center gap-2">
          <Avatar name={course.instructorName} size="sm" />
          <span className="text-sm text-neutral-900">{course.instructorName}</span>
        </div>
        {average && average.count > 0 && (
          <div className="flex items-center gap-2">
            <Stars value={average.average ?? 0} />
            <span className="text-sm text-neutral-900">{average.average?.toFixed(1)}</span>
            <span className="text-sm text-neutral-500">
              ({average.count} review{average.count !== 1 ? "s" : ""})
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export function SyllabusList({ modules }: { modules: ModuleDetail[] }) {
  return (
    <div className="mt-6 flex flex-col gap-2">
      {modules.map((module) => {
        const duration = moduleDurationMins(module);
        return (
          <div
            key={module.module_id}
            className="flex items-center justify-between rounded-md bg-neutral-50 px-4 py-3"
          >
            <span className="text-sm text-neutral-900">
              {module.title}
              {module.is_locked && <span className="ml-2 text-xs text-neutral-500">(locked)</span>}
            </span>
            <span className="text-xs text-neutral-500">
              {module.lessons.length} lesson{module.lessons.length !== 1 ? "s" : ""}
              {duration !== null && ` · ${duration} min`}
            </span>
          </div>
        );
      })}
    </div>
  );
}
