"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/user-session";
import { GatewayError, errorMessageFor } from "@/lib/gateway-client";
import { FacultySidebarNav } from "@/components/faculty-sidebar-nav";
import { Button } from "@/components/ui/button";
import { gradeAnswer, listPendingReview, type PendingAnswer, type PendingAttempt } from "@/lib/grading";

export default function FacultyGradingPage() {
  const router = useRouter();
  const { user, loading: sessionLoading } = useSession({ redirectOnUnauthorized: false });
  const [attempts, setAttempts] = useState<PendingAttempt[] | undefined>(undefined);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionLoading && !user) router.push("/login");
  }, [sessionLoading, user, router]);

  const load = useCallback(() => {
    setLoadError(null);
    listPendingReview()
      .then(setAttempts)
      .catch((err) => {
        if (err instanceof GatewayError && (err.statusCode === 401 || err.statusCode === 403)) {
          router.push("/login");
          return;
        }
        setLoadError(errorMessageFor(err, "Couldn't load the grading queue."));
      });
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="flex">
      <FacultySidebarNav />
      <main className="flex-1 px-10 py-12">
        <p className="text-sm text-neutral-500">Teach</p>
        <h1 className="text-3xl text-neutral-900">Grading</h1>
        <p className="mt-2 text-sm text-neutral-500">
          Written answers waiting for a mark, oldest first. An attempt leaves this list once every written answer is marked.
        </p>

        <div className="mt-8 flex flex-col gap-6">
          {loadError && (
            <div className="rounded-md bg-danger/10 px-4 py-3 text-sm text-danger">
              {loadError}{" "}
              <button onClick={load} className="underline">Try again</button>
            </div>
          )}
          {!loadError && attempts === undefined && <p className="text-sm text-neutral-500">Loading...</p>}
          {attempts?.length === 0 && <p className="text-sm text-neutral-500">Nothing to grade right now.</p>}
          {attempts?.map((attempt) => (
            <AttemptCard key={attempt.attempt_id} attempt={attempt} onGraded={load} />
          ))}
        </div>
      </main>
    </div>
  );
}

function AttemptCard({ attempt, onGraded }: { attempt: PendingAttempt; onGraded: () => void }) {
  const written = attempt.answers.filter((a) => a.question.type === "MANUAL");
  const submitted = attempt.submitted_at ? new Date(attempt.submitted_at).toLocaleString() : "Not recorded";

  return (
    <section className="rounded-lg border border-neutral-100 bg-white p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg text-neutral-900">{attempt.assessment.title}</h2>
        <span className="text-xs text-neutral-500">Submitted {submitted}</span>
      </div>
      <p className="mt-1 text-sm text-neutral-500">
        {attempt.student_name} · attempt {attempt.attempt_number}
      </p>

      <div className="mt-5 flex flex-col gap-5">
        {written.map((answer) => (
          <AnswerGrader key={answer.answer_id} answer={answer} onGraded={onGraded} />
        ))}
      </div>
    </section>
  );
}

function AnswerGrader({ answer, onGraded }: { answer: PendingAnswer; onGraded: () => void }) {
  const max = answer.question.points;
  const [points, setPoints] = useState<string>(answer.points_awarded?.toString() ?? "");
  const [correct, setCorrect] = useState<boolean>(answer.is_correct ?? false);
  const [feedback, setFeedback] = useState<string>(answer.feedback ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const alreadyGraded = answer.points_awarded !== null;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(points);
    if (points === "" || !Number.isInteger(value) || value < 0 || value > max) {
      setError(`Enter a whole number from 0 to ${max}.`);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await gradeAnswer(answer.answer_id, {
        is_correct: correct,
        points_awarded: value,
        feedback: feedback.trim() || null,
      });
      onGraded();
    } catch (err) {
      setError(errorMessageFor(err, "Couldn't save this mark."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="border-t border-neutral-100 pt-4">
      <p className="text-sm text-neutral-900">{answer.question.prompt}</p>
      <div className="mt-2 whitespace-pre-wrap rounded-md bg-neutral-50 px-4 py-3 text-sm text-neutral-900">
        {answer.text_response?.trim() || <span className="text-neutral-500">No answer given.</span>}
      </div>

      <label className="mt-3 flex flex-col gap-1 text-sm text-neutral-900">
        Feedback for the student <span className="text-xs text-neutral-500">(optional, shown once the attempt is fully marked)</span>
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          rows={2}
          maxLength={2000}
          className="rounded-md border border-neutral-100 px-3 py-2 text-sm"
        />
      </label>

      <div className="mt-3 flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-neutral-900">
          Points
          <input
            type="number"
            min={0}
            max={max}
            step={1}
            value={points}
            onChange={(e) => {
              setPoints(e.target.value);
              setCorrect(Number(e.target.value) === max);
            }}
            className="w-20 rounded-md border border-neutral-100 px-2 py-1 text-sm"
          />
          <span className="text-neutral-500">/ {max}</span>
        </label>
        <label className="flex items-center gap-2 text-sm text-neutral-900">
          <input type="checkbox" checked={correct} onChange={(e) => setCorrect(e.target.checked)} />
          Counts as correct
        </label>
        <Button size="sm" type="submit" loading={saving}>
          {alreadyGraded ? "Update mark" : "Save mark"}
        </Button>
        {alreadyGraded && <span className="text-xs text-success">Marked {answer.points_awarded}/{max}</span>}
      </div>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </form>
  );
}
