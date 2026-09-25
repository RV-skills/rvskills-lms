"use client";

import React from "react";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/user-session";
import { GatewayError } from "@/lib/gateway-client";
import { AdminSidebarNav } from "@/components/admin-sidebar-nav";
import {
  listCoursesForAdmin,
  publishCourse,
  unpublishCourse,
  listAllUsers,
  listCourseFaculty,
  assignCourseFaculty,
  removeCourseFaculty,
  type AdminCourse,
  type AdminUser,
  type CourseFacultyRecord,
} from "@/lib/admin";

export default function AdminCoursesPage() {
  const router = useRouter();
  const { user, loading: sessionLoading } = useSession({ redirectOnUnauthorized: false });
  const [courses, setCourses] = useState<AdminCourse[] | undefined>(undefined);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);
  const [facultyUsers, setFacultyUsers] = useState<AdminUser[]>([]);
  const [courseFaculty, setCourseFaculty] = useState<CourseFacultyRecord[]>([]);
  const [selectedFacultyId, setSelectedFacultyId] = useState("");
  const [facultyUpdating, setFacultyUpdating] = useState(false);

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

  function handleAuthError(err: unknown): boolean {
    if (err instanceof GatewayError && (err.statusCode === 401 || err.statusCode === 403)) {
      router.push("/login");
      return true;
    }
    return false;
  }

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  useEffect(() => {
    listAllUsers({ role_id: "role-faculty", pageSize: 1000 }).then((res) => setFacultyUsers(res.users));
  }, []);

  async function handleTogglePublish(course: AdminCourse) {
    setUpdatingId(course.course_id);
    try {
      if (course.is_published) {
        await unpublishCourse(course.course_id);
      } else {
        await publishCourse(course.course_id);
      }
      loadCourses();
    } catch (err) {
      if (!handleAuthError(err)) throw err;
    } finally {
      setUpdatingId(null);
    }
  }
 
  async function handleExpand(courseId: string) {
    if (expandedCourseId === courseId) {
      setExpandedCourseId(null);
      return;
    }
    setExpandedCourseId(courseId);
    setSelectedFacultyId("");
    try {
      const faculty = await listCourseFaculty(courseId);
      setCourseFaculty(faculty);
    } catch (err) {
      if (!handleAuthError(err)) throw err;
    }
  }

  async function handleAssignFaculty(courseId: string) {
    if (!selectedFacultyId) return;
    setFacultyUpdating(true);
    try {
      await assignCourseFaculty(courseId, selectedFacultyId);
      const faculty = await listCourseFaculty(courseId);
      setCourseFaculty(faculty);
      setSelectedFacultyId("");
      loadCourses();
    } catch (err) {
      if (!handleAuthError(err)) throw err;
    } finally {
      setFacultyUpdating(false);
    }
  }

  async function handleRemoveFaculty(courseId: string, facultyId: string) {
    setFacultyUpdating(true);
    try {
      await removeCourseFaculty(courseId, facultyId);
      const faculty = await listCourseFaculty(courseId);
      setCourseFaculty(faculty);
      loadCourses();
    } catch (err) {
      if (!handleAuthError(err)) throw err;
    } finally {
      setFacultyUpdating(false);
    }
  }
  function facultyName(facultyId: string): string {
    const match = facultyUsers.find((u) => u.user_id === facultyId);
    return match ? `${match.first_name} ${match.last_name}` : facultyId;
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
                  <th className="px-4 py-3 font-medium text-neutral-500"></th>
                </tr>
              </thead>
              <tbody>
                {courses.map((course) => (
                  <React.Fragment key={course.course_id}>
                    <tr className="border-b border-neutral-100">
                      <td className="px-4 py-3 text-neutral-900">{course.title}</td>
                      <td className="px-4 py-3 text-neutral-500">{course.difficulty}</td>
                                            <td className="px-4 py-3 text-neutral-500">
                        {course.instructorName}
                        {course.facultyCount > 1 && (
                          <span className="ml-1 text-xs text-neutral-500">
                            (+{course.facultyCount - 1} more)
                          </span>
                        )}
                      </td>
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
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleExpand(course.course_id)}
                          className="text-xs text-primary-700 underline"
                        >
                          {expandedCourseId === course.course_id ? "Hide faculty" : "Manage faculty"}
                        </button>
                      </td>
                    </tr>
                    {expandedCourseId === course.course_id && (
                      <tr className="border-b border-neutral-100 bg-neutral-50">
                        <td colSpan={6} className="px-4 py-4">
                          <div className="flex flex-col gap-3">
                            <p className="text-xs font-medium text-neutral-500">Assigned faculty</p>
                            {courseFaculty.length === 0 ? (
                              <p className="text-sm text-neutral-500">No faculty assigned.</p>
                            ) : (
                              <ul className="flex flex-col gap-1">
                                {courseFaculty.map((cf) => (
                                  <li key={cf.faculty_id} className="flex items-center justify-between text-sm">
                                    <span>
                                      {facultyName(cf.faculty_id)}{" "}
                                      <span className="text-xs text-neutral-500">({cf.role})</span>
                                    </span>
                                    <button
                                      onClick={() => handleRemoveFaculty(course.course_id, cf.faculty_id)}
                                      disabled={facultyUpdating}
                                      className="text-xs text-danger disabled:opacity-50"
                                    >
                                      Remove
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            )}

                            <div className="flex items-center gap-2">
                              <select
                                value={selectedFacultyId}
                                onChange={(e) => setSelectedFacultyId(e.target.value)}
                                className="rounded-md border border-neutral-100 px-3 py-2 text-sm"
                              >
                                <option value="">Select a faculty member</option>
                                {facultyUsers
                                  .filter((u) => !courseFaculty.some((cf) => cf.faculty_id === u.user_id))
                                  .map((u) => (
                                    <option key={u.user_id} value={u.user_id}>
                                      {u.first_name} {u.last_name} ({u.email})
                                    </option>
                                  ))}
                              </select>
                              <button
                                onClick={() => handleAssignFaculty(course.course_id)}
                                disabled={!selectedFacultyId || facultyUpdating}
                                className="rounded-md bg-primary-500 px-3 py-2 text-sm text-white disabled:opacity-50"
                              >
                                Assign
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                    </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}