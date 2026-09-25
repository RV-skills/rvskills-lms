"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/user-session";
import { AdminSidebarNav } from "@/components/admin-sidebar-nav";
import { getPlatformStats, type PlatformStats } from "@/lib/admin";
import { GatewayError } from "@/lib/gateway-client";

const ROLE_COLORS: Record<string, string> = {
  Student: "bg-primary-500",
  Faculty: "bg-warning",
  Admin: "bg-neutral-900",
};

export default function AdminDashboardPage() {
  const { user, loading: sessionLoading } = useSession({ redirectOnUnauthorized: false });
  const router = useRouter();
  const [stats, setStats] = useState<PlatformStats | undefined>(undefined);

  useEffect(() => {
    if (!sessionLoading && !user) {
      router.push("/login");
    }
  }, [sessionLoading, user, router]);

  useEffect(() => {
    getPlatformStats()
      .then(setStats)
      .catch((err) => {
        if (err instanceof GatewayError && (err.statusCode === 401 || err.statusCode === 403)) {
          router.push("/login");
          return;
        }
        throw err;
      });
  }, [router]);

  if (sessionLoading || !user) {
    return <main className="p-10 text-sm text-neutral-500">Loading...</main>;
  }

  const maxRoleCount = stats ? Math.max(...stats.usersByRole.map((r) => r.count), 1) : 1;

  return (
    <div className="flex min-h-screen">
      <AdminSidebarNav />
      <main className="flex-1 overflow-x-hidden px-10 py-12">
        <p className="text-sm text-neutral-500">Overview</p>
        <h1 className="mt-1 text-2xl text-neutral-900">RV-Skills LMS</h1>

        {!stats ? (
          <p className="mt-8 text-sm text-neutral-500">Loading...</p>
        ) : (
          <>
            {/* Headline stat */}
            <div className="mt-10">
              <p className="text-7xl leading-none text-neutral-900">{stats.totalUsers}</p>
              <p className="mt-2 text-sm text-neutral-500">registered users</p>
            </div>

            {/* Secondary stats row */}
            <div className="mt-10 flex divide-x divide-neutral-100">
              <div className="pr-8">
                <p className="text-3xl text-neutral-900">{stats.totalCourses}</p>
                <p className="mt-1 text-xs text-neutral-500">
                  courses &middot; {stats.publishedCourses} published, {stats.draftCourses} draft
                </p>
              </div>
              <div className="px-8">
                <p className="text-3xl text-neutral-900">{stats.totalEnrollments}</p>
                <p className="mt-1 text-xs text-neutral-500">enrollments</p>
              </div>
            </div>

            <div className="mt-14 grid grid-cols-1 gap-12 lg:grid-cols-2">
              {/* Users by role */}
              <div>
                <p className="text-sm text-neutral-900">Users by role</p>
                <div className="mt-4 flex flex-col gap-3">
                  {stats.usersByRole.map((r) => (
                    <div key={r.role_name}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-neutral-900">{r.role_name}</span>
                        <span className="text-neutral-500">{r.count}</span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
                        <div
                          className={`h-full rounded-full ${ROLE_COLORS[r.role_name] ?? "bg-neutral-500"}`}
                          style={{ width: `${(r.count / maxRoleCount) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Needs attention */}
              <div>
                <p className="text-sm text-neutral-900">Needs attention</p>
                <div className="mt-4 flex flex-col gap-3">
                  {stats.coursesWithNoFaculty > 0 && (
                    <Link
                      href="/admin/courses"
                      className="flex items-center justify-between rounded-md border border-neutral-100 px-4 py-3 text-sm hover:bg-neutral-50"
                    >
                      <span className="text-neutral-900">
                        {stats.coursesWithNoFaculty} course{stats.coursesWithNoFaculty !== 1 ? "s" : ""} with no faculty assigned
                      </span>
                      <span className="text-primary-700">Review &rarr;</span>
                    </Link>
                  )}
                  {stats.draftCourses > 0 && (
                    <Link
                      href="/admin/courses"
                      className="flex items-center justify-between rounded-md border border-neutral-100 px-4 py-3 text-sm hover:bg-neutral-50"
                    >
                      <span className="text-neutral-900">
                        {stats.draftCourses} draft course{stats.draftCourses !== 1 ? "s" : ""} not yet published
                      </span>
                      <span className="text-primary-700">Review &rarr;</span>
                    </Link>
                  )}
                  {stats.coursesWithNoFaculty === 0 && stats.draftCourses === 0 && (
                    <p className="text-sm text-neutral-500">Nothing needs attention right now.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Quick links */}
            <div className="mt-14 flex gap-6 border-t border-neutral-100 pt-6">
              <Link href="/admin/users" className="text-sm text-primary-700 hover:underline">
                Manage users
              </Link>
              <Link href="/admin/courses" className="text-sm text-primary-700 hover:underline">
                Manage courses
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
}