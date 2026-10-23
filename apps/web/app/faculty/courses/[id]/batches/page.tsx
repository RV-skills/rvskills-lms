"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "@/lib/user-session";
import { FacultySidebarNav } from "@/components/faculty-sidebar-nav";
import { ScheduleManager } from "@/components/batches/schedule-manager";

export default function FacultyCourseBatchesPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;
  const { user, loading: sessionLoading } = useSession({ redirectOnUnauthorized: false });

  useEffect(() => {
    if (!sessionLoading && !user) router.push("/login");
  }, [sessionLoading, user, router]);

  if (sessionLoading || !user) {
    return <main className="p-10 text-sm text-neutral-500">Loading...</main>;
  }

  return (
    <div className="flex min-h-screen">
      <FacultySidebarNav />
      <main className="flex-1 overflow-x-hidden px-8 py-10">
        <Link href={`/faculty/courses/${courseId}`} className="text-sm text-primary-700 hover:underline">
          ← Back to course
        </Link>
        <div className="mt-4">
          <ScheduleManager courseId={courseId} />
        </div>
      </main>
    </div>
  );
}
