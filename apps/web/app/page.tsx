"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "@/lib/user-session";
import { getCourses, type CourseListItem } from "@/lib/courses";
import { CourseCard } from "@/components/ui/course-card";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  const { user, loading } = useSession({ redirectOnUnauthorized: false });
  const [courses, setCourses] = useState<CourseListItem[]>([]);

  useEffect(() => {
    getCourses().then((all) => setCourses(all.slice(0, 3)));
  }, []);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="mx-auto flex max-w-xl flex-col items-center gap-4 text-center">
        <h1 className="text-2xl text-neutral-900">RV-Skills</h1>
        <p className="max-w-xl text-sm text-neutral-500">
          Learn real-world engineering skills through hands-on courses, quizzes, and
          instructor-led lessons.
        </p>

        {!loading && (
          <div className="mt-2 flex flex-col items-center gap-3">
            {user ? (
              <Link href="/dashboard">
                <Button size="lg">Go to Dashboard</Button>
              </Link>
            ) : (
              <Link href="/register">
                <Button size="lg">Get started</Button>
              </Link>
            )}
            <Link href="/catalog" className="text-sm text-neutral-500 hover:text-primary-700">
              Browse courses
            </Link>
          </div>
        )}
      </div>

      {courses.length > 0 && (
        <div className="mt-14">
          <h2 className="text-xl text-neutral-900">Popular courses</h2>
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <CourseCard
                key={course.course_id}
                href={`/courses/${course.course_id}`}
                title={course.title}
                thumbnailUrl={course.thumbnail_url}
                difficulty={course.difficulty}
                instructorName={course.instructorName}
                totalLessons={course.total_lessons}
                totalDurationMins={course.total_duration_mins}
                footer={{ kind: "enroll" }}
              />
            ))}
          </div>
        </div>
      )}
    </main>
  );
}