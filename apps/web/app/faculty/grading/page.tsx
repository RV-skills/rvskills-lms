"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/user-session";
import { GatewayError, errorMessageFor } from "@/lib/gateway-client";
import { FacultySidebarNav } from "@/components/faculty-sidebar-nav";
import { Button } from "@/components/ui/button";
import {
  PAGE_SIZE,
  getPendingSummary,
  gradeAnswer,
  listPendingForAssessment,
  type PendingAnswer,
  type PendingAttempt,
  type PendingSummary,
} from "@/lib/grading";

// Anything waiting longer than this is shown as overdue.
const OVERDUE_DAYS = 3;
function isOverdue(iso: string | null) {
  return iso !== null && Date.now() - new Date(iso).getTime() > OVERDUE_DAYS * 24 * 60 * 60 * 1000;
}

export default function FacultyGradingPage() {
  const router = useRouter();
  const { user, loading: sessionLoading } = useSession({ redirectOnUnauthorized: false });

  const [summary, setSummary] = useState<PendingSummary[] | undefined>(undefined);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [assessmentId, setAssessmentId] = useState<string | null>(null);

  const [attempts, setAttempts] = useState<PendingAttempt[] | undefined>(undefined);
  const [listError, setListError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!sessionLoading && !user) router.push("/login");
  }, [sessionLoading, user, router]);

  const handleAuthError = useCallback(
    (err: unknown) => {
      if (err instanceof GatewayError && (err.statusCode === 401 || err.statusCode === 403)) {
        router.push("/login");
        return true;
      }
      return false;
    },
    [router]
  );

  const loadSummary = useCallback(() => {
    setSummaryError(null);
    getPendingSummary()
      .then((s) => {
        setSummary(s);
        // Keep the current assessment if it still has work; otherwise open the longest-waiting one.
        setAssessmentId((current) => (current && s.some((x) => x.assessment_id === current) ? current : s[0]?.assessment_id ?? null));
      })
      .catch((err) => {
        if (!handleAuthError(err)) setSummaryError(errorMessageFor(err, "Couldn't load the grading queue."));
      });
  }, [handleAuthError]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  // A new assessment picked: load its first page and open the first student.
  useEffect(() => {
    if (!assessmentId) {
      setAttempts(undefined);
      return;
    }
    setAttempts(undefined);
    setListError(null);
    listPendingForAssessment(assessmentId, 0)
      .then((page) => {
        setAttempts(page);
        setSelectedId(page[0]?.attempt_id ?? null);
      })
      .catch((err) => {
        if (!handleAuthError(err)) setListError(errorMessageFor(err, "Couldn't load these attempts."));
      });
  }, [assessmentId, reloadKey, handleAuthError]);

  const current = summary?.find((s) => s.assessment_id === assessmentId) ?? null;
  const selected = attempts?.find((a) => a.attempt_id === selectedId) ?? null;
  const hasMore = Boolean(current && attempts && attempts.length < current.waiting);

  async function loadMore() {
    if (!assessmentId || !attempts) return;
    setLoadingMore(true);
    try {
      const page = await listPendingForAssessment(assessmentId, attempts.length);
      setAttempts((list) => [...(list ?? []), ...page.filter((p) => !list?.some((a) => a.attempt_id === p.attempt_id))]);
    } catch (err) {
      setListError(errorMessageFor(err, "Couldn't load more attempts."));
    } finally {
      setLoadingMore(false);
    }
  }

  // Every written answer in this attempt is marked: drop it, move to the next student,
  // and update the counts without reloading the whole page.
  function handleAttemptDone(attemptId: string) {
    window.dispatchEvent(new Event("grading-changed"));
    const list = attempts ?? [];
    const index = list.findIndex((a) => a.attempt_id === attemptId);
    const remaining = list.filter((a) => a.attempt_id !== attemptId);
    setAttempts(remaining);
    setSelectedId(remaining[Math.min(index, remaining.length - 1)]?.attempt_id ?? null);

    const left = (current?.waiting ?? 1) - 1;
    setSummary((s) =>
      (s ?? []).map((x) => (x.assessment_id === assessmentId ? { ...x, waiting: left } : x)).filter((x) => x.waiting > 0)
    );
    if (left <= 0) {
      loadSummary(); // this assessment is finished; move on to the next one
    } else if (remaining.length === 0) {
      setReloadKey((k) => k + 1); // more waiting on the server than loaded here: fetch the next page
    }
  }

  const totalWaiting = summary?.reduce((n, s) => n + s.waiting, 0) ?? 0;

  return (
    <div className="flex">
      <FacultySidebarNav />
      <main className="min-w-0 flex-1 px-6 py-10 lg:px-10">
        <p className="text-sm text-neutral-500">Teach</p>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-3xl text-neutral-900">Grading</h1>
          {summary && summary.length > 0 && (
            <p className="text-sm text-neutral-500">
              {totalWaiting} attempt{totalWaiting === 1 ? "" : "s"} waiting across {summary.length} assessment
              {summary.length === 1 ? "" : "s"}
            </p>
          )}
        </div>
        <p className="mt-2 text-sm text-neutral-500">
          Pick an assessment, then mark each student in turn. Multiple-choice answers are already marked; only written answers need you.
        </p>

        {summaryError && (
          <div className="mt-6 rounded-md bg-danger/10 px-4 py-3 text-sm text-danger">
            {summaryError}{" "}
            <button onClick={loadSummary} className="underline">Try again</button>
          </div>
        )}
        {!summaryError && summary === undefined && <p className="mt-8 text-sm text-neutral-500">Loading...</p>}
        {summary?.length === 0 && (
          <div className="mt-8 rounded-lg border border-neutral-100 bg-white p-10 text-center">
            <p className="text-lg text-neutral-900">All caught up</p>
            <p className="mt-1 text-sm text-neutral-500">No written answers are waiting to be marked.</p>
          </div>
        )}

        {summary && summary.length > 0 && (
          <>
            <AssessmentPicker summary={summary} selectedId={assessmentId} onSelect={setAssessmentId} />

            <div className="mt-6 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
              <StudentList
                attempts={attempts}
                error={listError}
                selectedId={selectedId}
                onSelect={setSelectedId}
                total={current?.waiting ?? 0}
                hasMore={hasMore}
                loadingMore={loadingMore}
                onLoadMore={loadMore}
              />
              <div className="min-w-0">
                {selected ? (
                  <AttemptGrader
                    key={selected.attempt_id}
                    attempt={selected}
                    position={(attempts?.indexOf(selected) ?? 0) + 1}
                    total={current?.waiting ?? 0}
                    onDone={() => handleAttemptDone(selected.attempt_id)}
                  />
                ) : (
                  attempts && (
                    <p className="rounded-lg border border-neutral-100 bg-white p-6 text-sm text-neutral-500">
                      Pick a student on the left.
                    </p>
                  )
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function AssessmentPicker({
  summary,
  selectedId,
  onSelect,
}: {
  summary: PendingSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="mt-6 flex gap-3 overflow-x-auto pb-1">
      {summary.map((s) => {
        const active = s.assessment_id === selectedId;
        const late = isOverdue(s.oldest_submitted_at);
        return (
          <button
            key={s.assessment_id}
            onClick={() => onSelect(s.assessment_id)}
            className={`min-w-[200px] rounded-lg border px-4 py-3 text-left transition-colors ${
              active ? "border-primary-700 bg-white" : "border-neutral-100 bg-white hover:border-neutral-500"
            }`}
          >
            <p className="truncate text-sm text-neutral-900">{s.title}</p>
            <p className="mt-1 text-xs text-neutral-500">
              <span className={`mr-1 inline-block rounded-full px-2 py-0.5 ${active ? "bg-primary-700 text-white" : "bg-neutral-50 text-neutral-900"}`}>
                {s.waiting}
              </span>
              waiting
              {s.oldest_submitted_at && (
                <span className={late ? "text-danger" : ""}> · oldest {timeAgo(s.oldest_submitted_at)}</span>
              )}
            </p>
            {late && <p className="mt-1 text-xs text-danger">Overdue: waiting more than {OVERDUE_DAYS} days</p>}
          </button>
        );
      })}
    </div>
  );
}

function StudentList({
  attempts,
  error,
  selectedId,
  onSelect,
  total,
  hasMore,
  loadingMore,
  onLoadMore,
}: {
  attempts: PendingAttempt[] | undefined;
  error: string | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  total: number;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
}) {
  return (
    <aside className="rounded-lg border border-neutral-100 bg-white lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
      <p className="border-b border-neutral-100 px-4 py-3 text-xs text-neutral-500">
        Students, oldest submission first
        {attempts && total > attempts.length ? ` · showing ${attempts.length} of ${total}` : ""}
      </p>
      {error && <p className="px-4 py-3 text-sm text-danger">{error}</p>}
      {!error && attempts === undefined && <p className="px-4 py-3 text-sm text-neutral-500">Loading...</p>}
      <ul>
        {attempts?.map((a) => {
          const active = a.attempt_id === selectedId;
          const written = a.answers.filter((x) => x.question.type === "MANUAL");
          const marked = written.filter((x) => x.points_awarded !== null).length;
          return (
            <li key={a.attempt_id}>
              <button
                onClick={() => onSelect(a.attempt_id)}
                className={`w-full border-l-2 px-4 py-3 text-left ${
                  active ? "border-primary-700 bg-neutral-50" : "border-transparent hover:bg-neutral-50"
                }`}
              >
                <p className="truncate text-sm text-neutral-900">{a.student_name}</p>
                <p className="text-xs text-neutral-500">
                  Attempt {a.attempt_number}
                  {a.submitted_at && <span className={isOverdue(a.submitted_at) ? "text-danger" : ""}> · {timeAgo(a.submitted_at)}</span>}
                  {marked > 0 ? ` · ${marked}/${written.length} marked` : ""}
                </p>
              </button>
            </li>
          );
        })}
      </ul>
      {hasMore && (
        <div className="border-t border-neutral-100 p-3">
          <Button size="sm" variant="secondary" className="w-full" loading={loadingMore} onClick={onLoadMore}>
            Load {Math.min(PAGE_SIZE, total - (attempts?.length ?? 0))} more
          </Button>
        </div>
      )}
    </aside>
  );
}

type Draft = { points: string; feedback: string };

function AttemptGrader({
  attempt,
  position,
  total,
  onDone,
}: {
  attempt: PendingAttempt;
  position: number;
  total: number;
  onDone: () => void;
}) {
  const byOrder = (x: PendingAnswer, y: PendingAnswer) => (x.question.order_index ?? 0) - (y.question.order_index ?? 0);
  const written = attempt.answers.filter((a) => a.question.type === "MANUAL").sort(byOrder);
  const auto = attempt.answers.filter((a) => a.question.type !== "MANUAL");
  const autoScored = auto.reduce((n, a) => n + (a.points_awarded ?? 0), 0);
  const autoMax = auto.reduce((n, a) => n + a.question.points, 0);

  const [drafts, setDrafts] = useState<Record<string, Draft>>(() =>
    Object.fromEntries(
      written.map((a) => [a.answer_id, { points: a.points_awarded?.toString() ?? "", feedback: a.feedback ?? "" }])
    )
  );
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  function update(answerId: string, change: Partial<Draft>) {
    setDrafts((d) => ({ ...d, [answerId]: { ...d[answerId], ...change } }));
    setErrors((e) => ({ ...e, [answerId]: "" }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const found: Record<string, string> = {};
    for (const a of written) {
      const raw = drafts[a.answer_id]?.points ?? "";
      const v = Number(raw);
      if (raw === "" || !Number.isInteger(v) || v < 0 || v > a.question.points) {
        found[a.answer_id] = `Enter a whole number from 0 to ${a.question.points}.`;
      }
    }
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setFormError("Some marks are missing or out of range.");
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      // One at a time: the last save is the one that completes the attempt.
      for (const a of written) {
        const d = drafts[a.answer_id];
        const points = Number(d.points);
        await gradeAnswer(a.answer_id, {
          points_awarded: points,
          is_correct: points === a.question.points,
          feedback: d.feedback.trim() || null,
        });
      }
      onDone();
    } catch (err) {
      setFormError(errorMessageFor(err, "Couldn't save these marks. Nothing was lost; try again."));
      setSaving(false);
    }
  }

  const draftTotal = written.reduce((n, a) => n + (Number(drafts[a.answer_id]?.points) || 0), 0);
  const writtenMax = written.reduce((n, a) => n + a.question.points, 0);

  return (
    <form onSubmit={handleSave} className="rounded-lg border border-neutral-100 bg-white">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-neutral-100 px-6 py-4">
        <div>
          <h2 className="text-lg text-neutral-900">{attempt.student_name}</h2>
          <p className="text-xs text-neutral-500">
            Attempt {attempt.attempt_number}
            {attempt.submitted_at ? ` · submitted ${new Date(attempt.submitted_at).toLocaleString()}` : ""}
          </p>
        </div>
        <p className="text-xs text-neutral-500">
          Student {position} of {total}
        </p>
      </header>

      {auto.length > 0 && (
        <p className="border-b border-neutral-100 bg-neutral-50 px-6 py-2 text-xs text-neutral-500">
          Multiple choice, marked automatically: {autoScored} / {autoMax} points
        </p>
      )}

      <ol className="flex flex-col">
        {written.map((a, i) => {
          const d = drafts[a.answer_id];
          const max = a.question.points;
          const quick = Array.from(new Set([0, Math.floor(max / 2), max]));
          return (
            <li key={a.answer_id} className="border-b border-neutral-100 px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <p className="text-sm text-neutral-900">
                  <span className="text-neutral-500">Q{i + 1}. </span>
                  {a.question.prompt}
                </p>
                <span className="whitespace-nowrap text-xs text-neutral-500">{max} pt{max === 1 ? "" : "s"}</span>
              </div>

              <div className="mt-3 max-h-72 overflow-y-auto whitespace-pre-wrap rounded-md bg-neutral-50 px-4 py-3 text-sm leading-relaxed text-neutral-900">
                {a.text_response?.trim() || <span className="text-neutral-500">No answer given.</span>}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-neutral-900">
                  Points
                  <input
                    type="number"
                    min={0}
                    max={max}
                    step={1}
                    value={d.points}
                    onChange={(e) => update(a.answer_id, { points: e.target.value })}
                    className={`w-20 rounded-md border px-2 py-1 text-sm ${errors[a.answer_id] ? "border-danger" : "border-neutral-100"}`}
                  />
                  <span className="text-neutral-500">/ {max}</span>
                </label>
                <div className="flex gap-1">
                  {quick.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => update(a.answer_id, { points: String(q) })}
                      className={`rounded-md border px-2 py-1 text-xs ${
                        d.points === String(q) ? "border-primary-700 text-primary-700" : "border-neutral-100 text-neutral-500 hover:border-neutral-500"
                      }`}
                    >
                      {q === max ? `Full (${q})` : q === 0 ? "0" : `Half (${q})`}
                    </button>
                  ))}
                </div>
              </div>
              {errors[a.answer_id] && <p className="mt-1 text-xs text-danger">{errors[a.answer_id]}</p>}

              <label className="mt-3 flex flex-col gap-1 text-sm text-neutral-900">
                <span>
                  Feedback <span className="text-xs text-neutral-500">(optional, the student sees this with their result)</span>
                </span>
                <textarea
                  value={d.feedback}
                  onChange={(e) => update(a.answer_id, { feedback: e.target.value })}
                  rows={2}
                  maxLength={2000}
                  className="rounded-md border border-neutral-100 px-3 py-2 text-sm"
                />
              </label>
            </li>
          );
        })}
      </ol>

      <footer className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
        <p className="text-sm text-neutral-500">
          Written total: <span className="text-neutral-900">{draftTotal}</span> / {writtenMax}
        </p>
        <div className="flex items-center gap-3">
          {formError && <p className="text-xs text-danger">{formError}</p>}
          <Button type="submit" loading={saving}>
            {position < total ? "Save marks & next" : "Save marks"}
          </Button>
        </div>
      </footer>
    </form>
  );
}

function timeAgo(iso: string) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}
