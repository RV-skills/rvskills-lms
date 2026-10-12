"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "@/lib/user-session";
import { GatewayError, errorMessageFor } from "@/lib/gateway-client";
import { FacultySidebarNav } from "@/components/faculty-sidebar-nav";
import { Button } from "@/components/ui/button";
import { listAssessmentsForCourse, type AssessmentSummary } from "@/lib/assessment";
import {
  addQuestion,
  createAssessment,
  getAssessmentFull,
  updateQuestion,
  type AuthoringAssessment,
  type AuthoringQuestion,
  type NewQuestion,
} from "@/lib/assessment-authoring";

const input = "rounded-md border border-neutral-100 px-3 py-2 text-sm";

export default function FacultyAssessmentsPage() {
  const params = useParams();
  const courseId = params.id as string;
  const router = useRouter();
  const { user, loading: sessionLoading } = useSession({ redirectOnUnauthorized: false });
  const [assessments, setAssessments] = useState<AssessmentSummary[] | undefined>(undefined);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionLoading && !user) router.push("/login");
  }, [sessionLoading, user, router]);

  const load = useCallback(() => {
    setLoadError(null);
    listAssessmentsForCourse(courseId)
      .then(setAssessments)
      .catch((err) => {
        if (err instanceof GatewayError && err.statusCode === 401) {
          router.push("/login");
          return;
        }
        setLoadError(errorMessageFor(err, "Couldn't load this course's assessments."));
      });
  }, [courseId, router]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="flex">
      <FacultySidebarNav />
      <main className="flex-1 px-10 py-12">
        <Link href={`/faculty/courses/${courseId}`} className="text-sm text-primary-700 hover:underline">
          ← Back to course
        </Link>
        <h1 className="mt-2 text-3xl text-neutral-900">Assessments</h1>
        <p className="mt-2 text-sm text-neutral-500">
          Questions can be added and edited until the first student starts an attempt. After that they're locked, so every student is marked on the same questions.
        </p>

        <div className="mt-8 flex flex-col gap-6">
          {loadError && <p className="text-sm text-danger">{loadError}</p>}
          {!loadError && assessments === undefined && <p className="text-sm text-neutral-500">Loading...</p>}
          {assessments?.length === 0 && <p className="text-sm text-neutral-500">No assessments yet. Create one below.</p>}
          {assessments?.map((a) => <AssessmentEditor key={a.assessment_id} assessmentId={a.assessment_id} />)}
          <NewAssessmentForm courseId={courseId} onCreated={load} />
        </div>
      </main>
    </div>
  );
}

function NewAssessmentForm({ courseId, onCreated }: { courseId: string; onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [pass, setPass] = useState("50");
  const [limit, setLimit] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const passing = Number(pass);
    const maxAttempts = limit === "" ? null : Number(limit);
    if (!title.trim()) return setError("Give the assessment a title.");
    if (!Number.isInteger(passing) || passing < 0 || passing > 100) return setError("Pass mark must be a whole number from 0 to 100.");
    if (maxAttempts !== null && (!Number.isInteger(maxAttempts) || maxAttempts < 1)) return setError("Attempts allowed must be 1 or more, or left empty for unlimited.");

    setSaving(true);
    setError(null);
    try {
      await createAssessment({ course_id: courseId, title: title.trim(), passing_percentage: passing, max_attempts: maxAttempts });
      setTitle("");
      setPass("50");
      setLimit("");
      onCreated();
    } catch (err) {
      setError(errorMessageFor(err, "Couldn't create the assessment."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-dashed border-neutral-100 p-6">
      <h2 className="text-lg text-neutral-900">New assessment</h2>
      <div className="mt-4 flex flex-wrap items-end gap-4">
        <label className="flex flex-1 flex-col gap-1 text-sm text-neutral-900">
          Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} className={input} />
        </label>
        <label className="flex w-32 flex-col gap-1 text-sm text-neutral-900">
          Pass mark (%)
          <input type="number" min={0} max={100} step={1} value={pass} onChange={(e) => setPass(e.target.value)} className={input} />
        </label>
        <label className="flex w-40 flex-col gap-1 text-sm text-neutral-900">
          Attempts allowed
          <input type="number" min={1} step={1} placeholder="Unlimited" value={limit} onChange={(e) => setLimit(e.target.value)} className={input} />
        </label>
        <Button type="submit" loading={saving}>Create</Button>
      </div>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </form>
  );
}

function AssessmentEditor({ assessmentId }: { assessmentId: string }) {
  const [assessment, setAssessment] = useState<AuthoringAssessment | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    getAssessmentFull(assessmentId)
      .then(setAssessment)
      .catch((err) => setError(errorMessageFor(err, "Couldn't load this assessment.")));
  }, [assessmentId]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <section className="rounded-lg border border-neutral-100 bg-white p-6 text-sm text-danger">{error}</section>;
  if (!assessment) return <section className="rounded-lg border border-neutral-100 bg-white p-6 text-sm text-neutral-500">Loading...</section>;

  const locked = assessment.questions.some((q) => q.is_locked);
  const totalPoints = assessment.questions.reduce((sum, q) => sum + q.points, 0);

  return (
    <section className="rounded-lg border border-neutral-100 bg-white p-6">
      <h2 className="text-lg text-neutral-900">{assessment.title}</h2>
      <p className="mt-1 text-sm text-neutral-500">
        Pass mark {assessment.passing_percentage}% ·{" "}
        {assessment.max_attempts === null ? "unlimited attempts" : `${assessment.max_attempts} attempts allowed`} ·{" "}
        {assessment.questions.length} question{assessment.questions.length === 1 ? "" : "s"}, {totalPoints} points
      </p>
      {locked && (
        <p className="mt-3 rounded-md bg-neutral-50 px-4 py-2 text-xs text-neutral-500">
          Students have started this assessment, so its questions are locked.
        </p>
      )}

      <ol className="mt-5 flex flex-col gap-4">
        {assessment.questions.map((q, i) => (
          <QuestionRow key={q.question_id} index={i} question={q} onSaved={load} />
        ))}
      </ol>

      {!locked && <QuestionForm assessmentId={assessment.assessment_id} onAdded={load} />}
    </section>
  );
}

function QuestionRow({ index, question, onSaved }: { index: number; question: AuthoringQuestion; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [prompt, setPrompt] = useState(question.prompt);
  const [points, setPoints] = useState(String(question.points));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const p = Number(points);
    if (!prompt.trim()) return setError("The question needs some text.");
    if (!Number.isInteger(p) || p < 1 || p > 100) return setError("Points must be a whole number from 1 to 100.");
    setSaving(true);
    setError(null);
    try {
      await updateQuestion(question.question_id, { prompt: prompt.trim(), points: p });
      setEditing(false);
      onSaved();
    } catch (err) {
      setError(errorMessageFor(err, "Couldn't save the question."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <li className="border-t border-neutral-100 pt-4">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-neutral-900">
          <span className="text-neutral-500">{index + 1}. </span>
          {question.prompt}
        </p>
        <span className="whitespace-nowrap text-xs text-neutral-500">
          {question.type === "MCQ" ? "Multiple choice" : "Written"} · {question.points} pt{question.points === 1 ? "" : "s"}
        </span>
      </div>

      {question.type === "MCQ" && (
        <ul className="mt-2 flex flex-col gap-1 pl-4">
          {question.options.map((o) => (
            <li key={o.option_id} className={`text-sm ${o.is_correct ? "text-success" : "text-neutral-500"}`}>
              {o.is_correct ? "✓ " : "· "}
              {o.text}
            </li>
          ))}
        </ul>
      )}

      {!question.is_locked && !editing && (
        <button onClick={() => setEditing(true)} className="mt-2 text-xs text-primary-700 underline">
          Edit wording or points
        </button>
      )}

      {editing && (
        <form onSubmit={handleSave} className="mt-3 flex flex-col gap-2">
          <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={2} maxLength={2000} className={input} />
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-neutral-900">
              Points
              <input type="number" min={1} max={100} step={1} value={points} onChange={(e) => setPoints(e.target.value)} className={`${input} w-20`} />
            </label>
            <Button size="sm" type="submit" loading={saving}>Save</Button>
            <button type="button" onClick={() => setEditing(false)} className="text-xs text-neutral-500 underline">
              Cancel
            </button>
          </div>
          {error && <p className="text-xs text-danger">{error}</p>}
        </form>
      )}
    </li>
  );
}

function QuestionForm({ assessmentId, onAdded }: { assessmentId: string; onAdded: () => void }) {
  const [type, setType] = useState<NewQuestion["type"]>("MCQ");
  const [prompt, setPrompt] = useState("");
  const [points, setPoints] = useState("1");
  const [options, setOptions] = useState([{ text: "", is_correct: true }, { text: "", is_correct: false }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setOptionText(i: number, text: string) {
    setOptions((list) => list.map((o, j) => (j === i ? { ...o, text } : o)));
  }
  function markCorrect(i: number) {
    setOptions((list) => list.map((o, j) => ({ ...o, is_correct: j === i })));
  }
  function removeOption(i: number) {
    setOptions((list) => {
      const next = list.filter((_, j) => j !== i);
      return next.some((o) => o.is_correct) ? next : next.map((o, j) => ({ ...o, is_correct: j === 0 }));
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const p = Number(points);
    if (!prompt.trim()) return setError("The question needs some text.");
    if (!Number.isInteger(p) || p < 1 || p > 100) return setError("Points must be a whole number from 1 to 100.");
    const filled = options.map((o) => ({ ...o, text: o.text.trim() }));
    if (type === "MCQ") {
      if (filled.some((o) => !o.text)) return setError("Fill in every option, or remove the empty ones.");
      if (filled.length < 2) return setError("Multiple-choice questions need at least 2 options.");
    }

    setSaving(true);
    setError(null);
    try {
      await addQuestion(assessmentId, { type, prompt: prompt.trim(), points: p, options: type === "MCQ" ? filled : [] });
      setPrompt("");
      setPoints("1");
      setOptions([{ text: "", is_correct: true }, { text: "", is_correct: false }]);
      onAdded();
    } catch (err) {
      setError(errorMessageFor(err, "Couldn't add the question."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3 rounded-md bg-neutral-50 p-4">
      <p className="text-sm text-neutral-900">Add a question</p>
      <div className="flex flex-wrap gap-3">
        <select value={type} onChange={(e) => setType(e.target.value as NewQuestion["type"])} className={input}>
          <option value="MCQ">Multiple choice (marked automatically)</option>
          <option value="MANUAL">Written answer (marked by you)</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-neutral-900">
          Points
          <input type="number" min={1} max={100} step={1} value={points} onChange={(e) => setPoints(e.target.value)} className={`${input} w-20`} />
        </label>
      </div>
      <textarea placeholder="Question" value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={2} maxLength={2000} className={input} />

      {type === "MCQ" && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-neutral-500">Pick the correct answer with the circle on the left.</p>
          {options.map((o, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="radio"
                name={`correct-${assessmentId}`}
                checked={o.is_correct}
                onChange={() => markCorrect(i)}
                aria-label={`Option ${i + 1} is correct`}
              />
              <input
                value={o.text}
                onChange={(e) => setOptionText(i, e.target.value)}
                placeholder={`Option ${i + 1}`}
                maxLength={500}
                className={`${input} flex-1`}
              />
              {options.length > 2 && (
                <button type="button" onClick={() => removeOption(i)} className="text-xs text-danger underline">
                  Remove
                </button>
              )}
            </div>
          ))}
          {options.length < 10 && (
            <button
              type="button"
              onClick={() => setOptions((list) => [...list, { text: "", is_correct: false }])}
              className="self-start text-xs text-primary-700 underline"
            >
              + Add option
            </button>
          )}
        </div>
      )}

      <Button size="sm" type="submit" loading={saving} className="self-start">
        Add question
      </Button>
      {error && <p className="text-xs text-danger">{error}</p>}
    </form>
  );
}
