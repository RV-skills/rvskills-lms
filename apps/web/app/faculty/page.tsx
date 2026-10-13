"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/user-session";
import { GatewayError } from "@/lib/gateway-client";
import { FacultySidebarNav } from "@/components/faculty-sidebar-nav";
import { listMyCourses, type MyCourse } from "@/lib/faculty";

export default function FacultyMyCoursesPage() {
  const router = useRouter();
  const { user, loading: sessionLoading } = useSession({ redirectOnUnauthorized: false });
  const [courses, setCourses] = useState<MyCourse[] | undefined>(undefined);

  useEffect(() => {
    if (!sessionLoading && !user) {
      router.push("/login");
    }
  }, [sessionLoading, user, router]);

  const loadCourses = useCallback(() => {
    listMyCourses()
      .then(setCourses)
      .catch((err) => {
        if (err instanceof GatewayError && (err.statusCode === 401 || err.statusCode === 403)) {
          router.push("/login");
          return;
        }
        throw err;
      });
  }, [router]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  if (sessionLoading || !user) {
    return <main className="p-10 text-sm text-neutral-500">Loading...</main>;
  }

  return (
    <div className="flex min-h-screen">
      <FacultySidebarNav />
      <main className="flex-1 overflow-x-hidden px-10 py-12">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-neutral-500">Teach</p>
            <h1 className="mt-1 text-2xl text-neutral-900">My Courses</h1>
          </div>
          <Link
            href="/faculty/courses/new"
            className="rounded-md bg-primary-500 px-4 py-2 text-sm text-white"
          >
            New course
          </Link>
        </div>

        {courses === undefined ? (
          <p className="mt-8 text-sm text-neutral-500">Loading...</p>
        ) : courses.length === 0 ? (
          <p className="mt-8 text-sm text-neutral-500">
            You don&apos;t teach any courses yet. Create one to get started.
          </p>
        ) : (
          <div className="mt-8 flex flex-col gap-3">
            {courses.map((course) => (
              <Link
                key={course.course_id}
                href={`/faculty/courses/${course.course_id}`}
                className="flex items-center justify-between rounded-md border border-neutral-100 px-4 py-3 hover:bg-neutral-50"
              >
                <div>
                  <p className="text-sm text-neutral-900">{course.title}</p>
                  <p className="mt-0.5 text-xs text-neutral-500">{course.difficulty}</p>
                </div>
                <span
                  className={
                    course.is_published
                      ? "rounded-full bg-success/10 px-2.5 py-1 text-xs text-success"
                      : "rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-500"
                  }
                >
                  {course.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}