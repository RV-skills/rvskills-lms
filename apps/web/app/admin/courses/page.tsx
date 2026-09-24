"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/user-session";
import { GatewayError } from "@/lib/gateway-client";
import { AdminSidebarNav } from "@/components/admin-sidebar-nav";
import {
  listCoursesForAdmin,
  publishCourse,
  unpublishCourse,
  type AdminCourse,
} from "@/lib/admin";

export default function AdminCoursesPage() {
  const router = useRouter();
  const { user, loading: sessionLoading } = useSession({ redirectOnUnauthorized: false });
  const [courses, setCourses] = useState<AdminCourse[] | undefined>(undefined);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionLoading && !user) {
      router.push("/login");
    }
  }, [sessionLoading, user, router]);

  const loadCourses = useCallback(() => {
    listCoursesForAdmin()
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

  async function handleTogglePublish(course: AdminCourse) {
    setUpdatingId(course.course_id);
    try {
      if (course.is_published) {
        await unpublishCourse(course.course_id);
      } else {
        await publishCourse(course.course_id);
      }
      loadCourses();
    } finally {
      setUpdatingId(null);
    }
  }

  if (sessionLoading || !user) {
    return <main className="p-10 text-sm text-neutral-500">Loading...</main>;
  }

  return (
    <div className="flex min-h-screen">
      <AdminSidebarNav />
      <main className="flex-1 overflow-x-hidden px-8 py-10">
        <h1 className="text-2xl text-neutral-900">Courses</h1>

        {courses === undefined ? (
          <p className="mt-6 text-sm text-neutral-500">Loading...</p>
        ) : (
          <div className="mt-6 overflow-x-auto rounded-lg border border-neutral-100">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-neutral-100 bg-neutral-50">
                <tr>
                  <th className="px-4 py-3 font-medium text-neutral-500">Title</th>
                  <th className="px-4 py-3 font-medium text-neutral-500">Difficulty</th>
                  <th className="px-4 py-3 font-medium text-neutral-500">Instructor</th>
                  <th className="px-4 py-3 font-medium text-neutral-500">Status</th>
                  <th className="px-4 py-3 font-medium text-neutral-500"></th>
                </tr>
              </thead>
              <tbody>
                {courses.map((course) => (
                  <tr key={course.course_id} className="border-b border-neutral-100 last:border-0">
                    <td className="px-4 py-3 text-neutral-900">{course.title}</td>
                    <td className="px-4 py-3 text-neutral-500">{course.difficulty}</td>
                    <td className="px-4 py-3 text-neutral-500">{course.instructorName}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          course.is_published
                            ? "rounded-full bg-success/10 px-2.5 py-1 text-xs text-success"
                            : "rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-500"
                        }
                      >
                        {course.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleTogglePublish(course)}
                        disabled={updatingId === course.course_id}
                        className="rounded-md border border-neutral-500 px-3 py-1.5 text-xs text-neutral-900 disabled:opacity-50"
                      >
                        {course.is_published ? "Unpublish" : "Publish"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}