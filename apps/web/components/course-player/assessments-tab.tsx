"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  listAssessmentsForCourse,
  getAssessment,
  startAttempt,
  getMyAttempts,
  submitAnswer,
  submitAttempt,
  type AssessmentSummary,
  type AssessmentDetail,
  type Attempt,
} from "@/lib/assessment";
import { GatewayError } from "@/lib/gateway-client";

type ViewState =
  | { view: "list" }
  | { view: "taking"; assessment: AssessmentDetail; attempt: Attempt }
  | { view: "result"; attempt: Attempt; assessmentTitle: string };

export function AssessmentsTab({ courseId }: { courseId: string }) {
  const [assessments, setAssessments] = useState<AssessmentSummary[] | undefined>(undefined);
  const [state, setState] = useState<ViewState>({ view: "list" });
  const [startError, setStartError] = useState<string | null>(null);
  const [startingId, setStartingId] = useState<string | null>(null);

  const [myAttempts, setMyAttempts] = useState<Record<string, Attempt[]>>({});

  const loadList = useCallback(() => {
    listAssessmentsForCourse(courseId).then(async (list) => {
      setAssessments(list);
      // Each assessment's own attempts, so the list can show results. One failing
      // lookup just shows that assessment without history.
      const entries = await Promise.all(
        list.map(async (a) => [a.assessment_id, await getMyAttempts(a.assessment_id).catch(() => [] as Attempt[])] as const)
      );
      setMyAttempts(Object.fromEntries(entries));
    });
  }, [courseId]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  async function handleStart(assessment_id: string) {
    setStartingId(assessment_id);
    setStartError(null);
    try {
      const [assessment, attempt] = await Promise.all([
        getAssessment(assessment_id),
        startAttempt(assessment_id),
      ]);
      setState({ view: "taking", assessment, attempt });
    } catch (err) {
      setStartError(err instanceof GatewayError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setStartingId(null);
    }
  }

  function handleSubmitted(attempt: Attempt, assessmentTitle: string) {
    setState({ view: "result", attempt, assessmentTitle });
    loadList();
  }

  function handleBackToList() {
    setState({ view: "list" });
    loadList();
  }

  if (state.view === "taking") {
    return (
      <QuizForm
        assessment={state.assessment}
        attempt={state.attempt}
        onSubmitted={(attempt) => handleSubmitted(attempt, state.assessment.title)}
        onCancel={handleBackToList}
      />
    );
  }

  if (state.view === "result") {
    return (
      <div className="rounded-lg bg-neutral-50 p-6 text-center">
        <h3 className="text-lg text-neutral-900">{state.assessmentTitle}</h3>
        {state.attempt.status === "PENDING_REVIEW" ? (
          <p className="mt-2 text-sm text-neutral-500">
            Submitted. Some questions need manual grading — check back later for your final score.
          </p>
        ) : (
          <>
            <p className="mt-4 text-3xl text-neutral-900">{state.attempt.score_percentage}%</p>
            <Badge tone={state.attempt.passed ? "success" : "danger"} className="mt-2">
              {state.attempt.passed ? "Passed" : "Not passed"}
            </Badge>
          </>
        )}
        <Button variant="secondary" className="mt-6" onClick={handleBackToList}>
          Back to assessments
        </Button>
      </div>
    );
  }

  if (assessments === undefined) {
    return <p className="text-sm text-neutral-500">Loading assessments...</p>;
  }

  if (assessments.length === 0) {
    return (
      <p className="text-sm text-neutral-500">
        No assessments have been added for this course yet.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {assessments.map((assessment) => {
        const s = summarise(assessment, myAttempts[assessment.assessment_id] ?? []);
        const label = s.inProgress ? "Resume" : s.used > 0 ? "Retake" : "Start";
        const canStart = Boolean(s.inProgress) || s.left === null || s.left > 0;
        return (
          <div
            key={assessment.assessment_id}
            className="flex items-center justify-between gap-4 rounded-md bg-neutral-50 px-4 py-3"
          >
            <div>
              <p className="text-sm text-neutral-900">{assessment.title}</p>
              <p className="text-xs text-neutral-500">
                Passing score: {assessment.passing_percentage}%
                {assessment.max_attempts !== null && ` \u00b7 ${s.used} of ${assessment.max_attempts} attempts used`}
              </p>
              {s.best && (
                <p className="mt-1 flex items-center gap-2 text-xs text-neutral-900">
                  Best score: {s.best.score_percentage}%
                  <Badge tone={s.passed ? "success" : "danger"}>{s.passed ? "Passed" : "Not passed yet"}</Badge>
                </p>
              )}
              {s.waiting && <p className="mt-1 text-xs text-neutral-500">Submitted, waiting for marking.</p>}
            </div>
            {canStart ? (
              <Button
                size="sm"
                variant={s.passed && !s.inProgress ? "secondary" : undefined}
                onClick={() => handleStart(assessment.assessment_id)}
                loading={startingId === assessment.assessment_id}
              >
                {label}
              </Button>
            ) : (
              <span className="text-xs text-neutral-500">No attempts left</span>
            )}
          </div>
        );
      })}
      {startError && <p className="text-sm text-danger">{startError}</p>}
    </div>
  );
}

function QuizForm({
  assessment,
  attempt,
  onSubmitted,
  onCancel,
}: {
  assessment: AssessmentDetail;
  attempt: Attempt;
  onSubmitted: (attempt: Attempt) => void;
  onCancel: () => void;
}) {
  const [answers, setAnswers] = useState<Record<string, { selected_option_id?: string; text_response?: string }>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setMcqAnswer(question_id: string, selected_option_id: string) {
    setAnswers((prev) => ({ ...prev, [question_id]: { selected_option_id } }));
  }

  function setTextAnswer(question_id: string, text_response: string) {
    setAnswers((prev) => ({ ...prev, [question_id]: { text_response } }));
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      await Promise.all(
        Object.entries(answers).map(([question_id, data]) =>
          submitAnswer(attempt.attempt_id, { question_id, ...data })
        )
      );
      const result = await submitAttempt(attempt.attempt_id);
      onSubmitted(result);
    } catch (err) {
      setError(err instanceof GatewayError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h3 className="text-lg text-neutral-900">{assessment.title}</h3>

      {assessment.questions.map((question, i) => (
        <div key={question.question_id}>
          <p className="text-sm text-neutral-900">
            {i + 1}. {question.prompt}
          </p>
          {question.type === "MCQ" ? (
            <div className="mt-3 flex flex-col gap-2">
              {question.options.map((option) => (
                <label key={option.option_id} className="flex items-center gap-2 text-sm text-neutral-900">
                  <input
                    type="radio"
                    name={question.question_id}
                    checked={answers[question.question_id]?.selected_option_id === option.option_id}
                    onChange={() => setMcqAnswer(question.question_id, option.option_id)}
                  />
                  {option.text}
                </label>
              ))}
            </div>
          ) : (
            <textarea
              className="mt-3 w-full rounded-md border border-neutral-100 p-3 text-sm"
              rows={4}
              value={answers[question.question_id]?.text_response ?? ""}
              onChange={(e) => setTextAnswer(question.question_id, e.target.value)}
            />
          )}
        </div>
      ))}

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} loading={submitting}>
          Submit
        </Button>
      </div>
    </div>
  );
}
// What the list shows for one assessment, worked out from the student's own attempts.
function summarise(assessment: AssessmentSummary, attempts: Attempt[]) {
  const inProgress = attempts.find((a) => a.status === "IN_PROGRESS") ?? null;
  const graded = attempts.filter((a) => a.status === "GRADED");
  const best = graded.reduce<Attempt | null>(
    (top, a) => (top === null || (a.score_percentage ?? 0) > (top.score_percentage ?? 0) ? a : top),
    null
  );
  return {
    inProgress,
    best,
    passed: graded.some((a) => a.passed),
    waiting: attempts.some((a) => a.status === "PENDING_REVIEW" || a.status === "SUBMITTED"),
    used: attempts.length,
    left: assessment.max_attempts === null ? null : Math.max(assessment.max_attempts - attempts.length, 0),
  };
}
