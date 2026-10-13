"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Eye } from "lucide-react";
import { useSession } from "@/lib/user-session";
import { GatewayError } from "@/lib/gateway-client";
import { Button } from "@/components/ui/button";
import { CourseHeader, SyllabusList } from "@/components/course-detail/course-summary";
import { PlayerView } from "@/components/course-player/player-view";
import { getPreviewCourse, previewChecks, toPreviewPlayer, type PreviewCourse } from "@/lib/course-preview";

type View = "page" | "player";

// The course exactly as students see it, for the faculty who manage it. Read-only:
// no enrolment, no progress, no assessment attempts. Works for draft courses too.
export default function CoursePreviewPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;
  const { user, loading: sessionLoading } = useSession({ redirectOnUnauthorized: false });
  const [course, setCourse] = useState<PreviewCourse | null | undefined>(undefined);
  const [failed, setFailed] = useState(false);
  const [view, setView] = useState<View>("page");
  const [syllabusTab, setSyllabusTab] = useState<"syllabus" | "reviews">("syllabus");
  const [showChecks, setShowChecks] = useState(true);

  useEffect(() => {
    if (!sessionLoading && !user) router.push("/login");
  }, [sessionLoading, user, router]);

  useEffect(() => {
    getPreviewCourse(courseId)
      .then(setCourse)
      .catch((err) => {
        if (err instanceof GatewayError && (err.statusCode === 401 || err.statusCode === 403)) {
          router.push("/login");
          return;
        }
        setFailed(true);
      });
  }, [courseId, router]);

  if (sessionLoading || !user || (course === undefined && !failed)) {
    return <main className="p-10 text-sm text-neutral-500">Loading...</main>;
  }

  if (failed) {
    return <main className="p-10 text-sm text-neutral-500">Couldn&apos;t load the preview. Please refresh the page.</main>;
  }

  if (!course) {
    return <main className="p-10 text-sm text-neutral-500">Course not found.</main>;
  }

  const playerData = toPreviewPlayer(course);
  const checks = previewChecks(course);
  const warnings = checks.filter((c) => c.level === "warning");

  return (
    <div className="min-h-screen bg-white">
      {/* Preview banner: stays on top so this is never mistaken for the real student view */}
      <div className="sticky top-0 z-20 border-b border-primary-500/30 bg-primary-100">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-6 py-3">
          <p className="flex items-center gap-2 text-sm text-primary-700">
            <Eye size={16} />
            Preview mode: this is what students see. Nothing here is saved.
          </p>
          <div className="flex rounded-md bg-white p-0.5 text-sm">
            {(
              [
                ["page", "Course page"],
                ["player", "Course player"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setView(key)}
                className={`rounded px-3 py-1 ${view === key ? "bg-primary-500 text-white" : "text-neutral-500 hover:text-neutral-900"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <Link href={`/faculty/courses/${courseId}`} className="ml-auto text-sm text-primary-700 hover:underline">
            ← Back to editor
          </Link>
        </div>
      </div>

      {showChecks && warnings.length > 0 && (
        <div className="mx-auto mt-6 max-w-6xl px-6">
          <div className="rounded-lg border border-neutral-100 bg-neutral-50 px-4 py-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-neutral-900">
                {warnings.length} thing{warnings.length !== 1 ? "s" : ""} students might notice
              </p>
              <button onClick={() => setShowChecks(false)} className="text-xs text-neutral-500 hover:text-neutral-900">
                Hide
              </button>
            </div>
            <ul className="mt-2 flex flex-col gap-1">
              {checks.map((c, i) => (
                <li key={i} className={`text-xs ${c.level === "warning" ? "text-neutral-900" : "text-neutral-500"}`}>
                  {c.level === "warning" ? "• " : "ℹ "}
                  {c.message}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {view === "page" ? (
        <main className="mx-auto max-w-4xl px-6 py-10">
          <CourseHeader course={course} average={null} />

          <div className="mt-10 flex gap-6 border-b border-neutral-100">
            {(["syllabus", "reviews"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setSyllabusTab(t)}
                className={`-mb-px border-b-2 pb-3 text-sm capitalize ${
                  syllabusTab === t
                    ? "border-primary-500 text-primary-700"
                    : "border-transparent text-neutral-500 hover:text-neutral-900"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {syllabusTab === "syllabus" ? (
            course.modules.length === 0 ? (
              <p className="mt-6 text-sm text-neutral-500">No modules yet.</p>
            ) : (
              <SyllabusList modules={course.modules} />
            )
          ) : (
            <p className="mt-6 text-sm text-neutral-500">
              Student reviews appear here once people complete the course.
            </p>
          )}

          <div className="mt-10 flex items-center justify-between rounded-lg border border-neutral-100 px-6 py-4">
            <div>
              <p className="text-xs text-neutral-500">Price</p>
              <p className="text-lg text-neutral-900">Free</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-neutral-500">Enrolling is off in preview.</span>
              <Button disabled>Enroll now</Button>
            </div>
          </div>
        </main>
      ) : playerData ? (
        <main>
          <PlayerView courseId={courseId} data={playerData} preview />
        </main>
      ) : (
        <main className="p-10 text-center">
          <h1 className="text-xl text-neutral-900">No lessons yet</h1>
          <p className="mt-2 text-sm text-neutral-500">
            Students would see this message. Add a lesson in the editor to preview the player.
          </p>
        </main>
      )}
    </div>
  );
}
