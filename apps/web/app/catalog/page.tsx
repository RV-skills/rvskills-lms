"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getCourses, type CourseListItem } from "@/lib/courses";
import { CourseCard } from "@/components/ui/course-card";
import { FilterBar } from "@/components/catalog/filter-bar";
import { useSession } from "@/lib/user-session";
import { getMyEnrollments } from "@/lib/enrollment";

export default function CatalogPage() {
  const searchParams = useSearchParams();
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useSession({ redirectOnUnauthorized: false });
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    getMyEnrollments().then((enrollments) => {
      setEnrolledCourseIds(new Set(enrollments.map((e) => e.course_id)));
    });
  }, [user]);

  useEffect(() => {
    setLoading(true);
    getCourses({
      search: searchParams.get("search") ?? undefined,
      difficulty: searchParams.get("difficulty") ?? undefined,
    })
      .then(setCourses)
      .finally(() => setLoading(false));
  }, [searchParams]);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-2xl text-neutral-900">Course catalog</h1>

      <div className="mt-6">
        <FilterBar />
      </div>

      {loading ? (
        <p className="mt-16 text-center text-sm text-neutral-500">Loading courses...</p>
      ) : courses.length === 0 ? (
        <div className="mt-16 flex flex-col items-center text-center">
          <p className="text-lg text-neutral-900">No courses match your filters</p>
          <p className="mt-1 text-sm text-neutral-500">
            Try adjusting your search or clearing a filter.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
              footer={
                enrolledCourseIds.has(course.course_id)
                  ? { kind: "continue" }
                  : { kind: "enroll" }
              }
            />
          ))}
        </div>
      )}
    </main>
  );
}