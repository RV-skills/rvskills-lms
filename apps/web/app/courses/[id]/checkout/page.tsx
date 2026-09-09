"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getCourseDetail, type CourseDetail } from "@/lib/course-details";
import { enrollInCourse } from "@/lib/enrollment";

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

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;
  const [course, setCourse] = useState<CourseDetail | null | undefined>(undefined);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCourseDetail(courseId).then(setCourse);
  }, [courseId]);

  async function handleConfirm() {
    setConfirming(true);
    setError(null);
    try {
      const result = await enrollInCourse(courseId);
      if (result.status === "not_available") {
        setError(result.message);
        return;
      }
      // "ok" and "already_enrolled" both mean the student is enrolled now.
      router.push(`/courses/${courseId}/player`);
    } finally {
      setConfirming(false);
    }
  }

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
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl text-neutral-900">Confirm enrollment</h1>

      <div className="mt-6 flex flex-col gap-4 rounded-lg bg-neutral-50 p-6">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 flex-shrink-0 rounded-md bg-neutral-100" />
          <div>
            <Badge tone={difficultyToTone(course.difficulty)}>{course.difficulty}</Badge>
            <h2 className="mt-1 text-lg text-neutral-900">{course.title}</h2>
          </div>
        </div>

        <div className="flex items-center gap-2 border-t border-neutral-100 pt-4">
          <Avatar name={course.instructorName} size="sm" />
          <span className="text-sm text-neutral-900">{course.instructorName}</span>
        </div>

        <div className="flex items-center justify-between border-t border-neutral-100 pt-4">
          <span className="text-sm text-neutral-500">Price</span>
          <span className="text-sm text-neutral-900">Free</span>
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-6 flex justify-end">
        <Button onClick={handleConfirm} disabled={confirming}>
          {confirming ? "Enrolling..." : "Confirm enrollment"}
        </Button>
      </div>
    </main>
  );
}