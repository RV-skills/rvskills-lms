"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "@/lib/user-session";
import { GatewayError, errorMessageFor } from "@/lib/gateway-client";
import { FacultySidebarNav } from "@/components/faculty-sidebar-nav";
import { Button } from "@/components/ui/button";
import {
  STATUS_LABEL,
  getAssessmentResults,
  resultsToCsv,
  type AssessmentResults,
  type StudentStatus,
} from "@/lib/assessment-results";

type SortKey = "name" | "score" | "submitted";

const STATUS_STYLE: Record<StudentStatus, string> = {
  PASSED: "text-success",
  NOT_PASSED: "text-danger",
  WAITING: "text-neutral-900",
  IN_PROGRESS: "text-neutral-500",
};

export default function AssessmentResultsPage() {
  const params = useParams();
  const courseId = params.id as string;
  const assessmentId = params.assessmentId as string;
  const router = useRouter();
  const { user, loading: sessionLoading } = useSession({ redirectOnUnauthorized: false });
  const [results, setResults] = useState<AssessmentResults | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("name");
  const [filter, setFilter] = useState<StudentStatus | "ALL">("ALL");

  useEffect(() => {
    if (!sessionLoading && !user) router.push("/login");
  }, [sessionLoading, user, router]);

  useEffect(() => {
    getAssessmentResults(assessmentId)
      .then(setResults)
      .catch((err) => {
        if (err instanceof GatewayError && err.statusCode === 401) {
          router.push("/login");
          return;
        }
        setError(errorMessageFor(err, "Couldn't load the results."));
      });
  }, [assessmentId, router]);

  const rows = useMemo(() => {
    const list = (results?.students ?? []).filter((s) => filter === "ALL" || s.status === filter);
    return [...list].sort((a, b) => {
      if (sort === "score") return (b.best_score ?? -1) - (a.best_score ?? -1);
      if (sort === "submitted") return (b.last_submitted_at ?? "").localeCompare(a.last_submitted_at ?? "");
      return a.student_name.localeCompare(b.student_name);
    });
  }, [results, sort, filter]);

  function downloadCsv() {
    if (!results) return;
    const blob = new Blob([resultsToCsv(results)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${results.assessment.title.replace(/[^\w-]+/g, "_")}-results.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex">
      <FacultySidebarNav />
      <main className="min-w-0 flex-1 px-6 py-10 lg:px-10">
        <Link href={`/faculty/courses/${courseId}/assessments`} className="text-sm text-primary-700 hover:underline">
          ← Back to assessments
        </Link>

        {error && <p className="mt-6 text-sm text-danger">{error}</p>}
        {!error && !results && <p className="mt-6 text-sm text-neutral-500">Loading...</p>}

        {results && (
          <>
            <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h1 className="text-3xl text-neutral-900">{results.assessment.title}</h1>
                <p className="mt-1 text-sm text-neutral-500">
                  Results · pass mark {results.assessment.passing_percentage}%
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={downloadCsv} disabled={results.students.length === 0}>
                Download CSV
              </Button>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
              <Stat label="Students attempted" value={String(results.summary.students_attempted)} />
              <Stat
                label="Average best score"
                value={results.summary.average_best_score === null ? "–" : `${results.summary.average_best_score}%`}
              />
              <Stat label="Pass rate" value={results.summary.pass_rate === null ? "–" : `${results.summary.pass_rate}%`} />
              <Stat
                label="Waiting for marking"
                value={String(results.summary.waiting)}
                href={results.summary.waiting > 0 ? "/faculty/grading" : undefined}
              />
            </div>

            {results.students.length === 0 ? (
              <p className="mt-8 rounded-lg border border-neutral-100 bg-white p-6 text-sm text-neutral-500">
                No student has attempted this assessment yet.
              </p>
            ) : (
              <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                <section className="min-w-0 rounded-lg border border-neutral-100 bg-white">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 px-5 py-3">
                    <h2 className="text-sm text-neutral-900">Students</h2>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-500">
                      <label className="flex items-center gap-1">
                        Show
                        <select
                          value={filter}
                          onChange={(e) => setFilter(e.target.value as StudentStatus | "ALL")}
                          className="rounded-md border border-neutral-100 px-2 py-1 text-xs"
                        >
                          <option value="ALL">Everyone</option>
                          {(Object.keys(STATUS_LABEL) as StudentStatus[]).map((s) => (
                            <option key={s} value={s}>
                              {STATUS_LABEL[s]}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="flex items-center gap-1">
                        Sort by
                        <select
                          value={sort}
                          onChange={(e) => setSort(e.target.value as SortKey)}
                          className="rounded-md border border-neutral-100 px-2 py-1 text-xs"
                        >
                          <option value="name">Name</option>
                          <option value="score">Best score</option>
                          <option value="submitted">Last submitted</option>
                        </select>
                      </label>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="text-xs text-neutral-500">
                        <tr className="border-b border-neutral-100">
                          <th className="px-5 py-2 font-normal">Student</th>
                          <th className="px-5 py-2 font-normal">Attempts</th>
                          <th className="px-5 py-2 font-normal">Best score</th>
                          <th className="px-5 py-2 font-normal">Result</th>
                          <th className="px-5 py-2 font-normal">Last submitted</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((s) => (
                          <tr key={s.student_id} className="border-b border-neutral-100 last:border-0">
                            <td className="px-5 py-3 text-neutral-900">{s.student_name}</td>
                            <td className="px-5 py-3 text-neutral-500">
                              {s.attempts_used}
                              {results.assessment.max_attempts !== null ? ` / ${results.assessment.max_attempts}` : ""}
                            </td>
                            <td className="px-5 py-3 text-neutral-900">{s.best_score === null ? "–" : `${s.best_score}%`}</td>
                            <td className={`px-5 py-3 ${STATUS_STYLE[s.status]}`}>{STATUS_LABEL[s.status]}</td>
                            <td className="px-5 py-3 text-neutral-500">
                              {s.last_submitted_at ? new Date(s.last_submitted_at).toLocaleDateString() : "–"}
                            </td>
                          </tr>
                        ))}
                        {rows.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-5 py-4 text-sm text-neutral-500">
                              No students match this filter.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="rounded-lg border border-neutral-100 bg-white">
                  <h2 className="border-b border-neutral-100 px-5 py-3 text-sm text-neutral-900">
                    Questions, hardest first
                  </h2>
                  <ol className="flex flex-col">
                    {results.questions.map((q) => (
                      <li key={q.question_id} className="border-b border-neutral-100 px-5 py-3 last:border-0">
                        <p className="text-sm text-neutral-900">
                          <span className="text-neutral-500">Q{q.order_index + 1}. </span>
                          {q.prompt}
                        </p>
                        <div className="mt-2 flex items-center gap-3">
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-50">
                            <div
                              className={`h-full rounded-full ${
                                q.average_percentage !== null && q.average_percentage < results.assessment.passing_percentage
                                  ? "bg-danger"
                                  : "bg-primary-700"
                              }`}
                              style={{ width: `${q.average_percentage ?? 0}%` }}
                            />
                          </div>
                          <span className="w-24 text-right text-xs text-neutral-500">
                            {q.average_percentage === null ? "Not marked yet" : `${q.average_percentage}% avg`}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-neutral-500">
                          {q.type === "MCQ" ? "Multiple choice" : "Written"} · {q.points} pt{q.points === 1 ? "" : "s"}
                        </p>
                      </li>
                    ))}
                  </ol>
                </section>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value, href }: { label: string; value: string; href?: string }) {
  const body = (
    <>
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-1 text-2xl text-neutral-900">{value}</p>
    </>
  );
  return href ? (
    <Link href={href} className="rounded-lg border border-neutral-100 bg-white px-4 py-3 hover:border-primary-700">
      {body}
    </Link>
  ) : (
    <div className="rounded-lg border border-neutral-100 bg-white px-4 py-3">{body}</div>
  );
}
