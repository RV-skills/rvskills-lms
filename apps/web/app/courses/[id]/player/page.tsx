"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  getCoursePlayerData,
  markLessonComplete,
  type CoursePlayerResult,
} from "@/lib/course-player";
import { enrollInCourse } from "@/lib/enrollment";
import { PlayerView } from "@/components/course-player/player-view";

export default function CoursePlayerPage() {
  const params = useParams();
  const courseId = params.id as string;
  const router = useRouter();
  const [result, setResult] = useState<CoursePlayerResult | undefined>(undefined);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollError, setEnrollError] = useState<string | null>(null);

  const load = useCallback(() => {
    getCoursePlayerData(courseId).then(setResult);
  }, [courseId]);

  useEffect(() => {
    load();
  }, [load]);

  // Not logged in: go to login, then come back to this course afterwards.
  useEffect(() => {
    if (result?.status === "unauthenticated") {
      router.replace(`/login?redirect=${encodeURIComponent(`/courses/${courseId}/player`)}`);
    }
  }, [result, router, courseId]);

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

  if (result.status === "unauthenticated") {
    return <main className="p-10 text-sm text-neutral-500">Taking you to login...</main>;
  }

  if (result.status === "error") {
    return (
      <main className="p-10 text-center">
        <h1 className="text-xl text-neutral-900">Something went wrong</h1>
        <p className="mt-2 text-sm text-neutral-500">
          We couldn&apos;t load this course just now. Please try again.
        </p>
        <Button
          className="mt-6"
          onClick={() => {
            setResult(undefined);
            load();
          }}
        >
          Try again
        </Button>
      </main>
    );
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

  return (
    <main>
      <PlayerView
        courseId={courseId}
        data={result.data}
        onMarkComplete={async (lessonId) => {
          await markLessonComplete(courseId, lessonId);
          load();
        }}
      />
    </main>
  );
}