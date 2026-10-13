"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, X } from "lucide-react";
import { useSession } from "@/lib/user-session";
import { errorMessageFor } from "@/lib/gateway-client";
import { FacultySidebarNav } from "@/components/faculty-sidebar-nav";
import { OutlineTree } from "@/components/faculty/outline-tree";
import type { LessonContentType } from "@/lib/course-player";
import {
  CONTENT_TYPE_LABEL,
  createCourseFromDraft,
  emptyCreationState,
  emptyDraft,
  formatMinutes,
  hasErrors,
  move,
  newLesson,
  newModule,
  outlineIssues,
  outlineStats,
  type CreationProgress,
  type CreationState,
  type DraftCourse,
  type DraftLesson,
  type DraftModule,
} from "@/lib/course-outline";

type Step = "details" | "structure" | "review";

const STEPS: { key: Step; label: string }[] = [
  { key: "details", label: "1. Details" },
  { key: "structure", label: "2. Modules & lessons" },
  { key: "review", label: "3. Review & create" },
];

// The draft survives a page refresh in this browser. Storage can be missing or
// blocked, so every access is guarded and the page works without it.
const DRAFT_KEY = "rv-lms:new-course-draft";

function loadDraft(): DraftCourse {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DraftCourse;
      if (parsed && Array.isArray(parsed.modules)) return parsed;
    }
  } catch {
    // ignore and start fresh
  }
  return emptyDraft();
}

function saveDraft(draft: DraftCourse) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // not fatal
  }
}

function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // not fatal
  }
}

const inputClass = "rounded-md border border-neutral-100 px-3 py-2 text-sm";
const iconButton = "rounded p-1 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-30";

export default function NewCoursePage() {
  const router = useRouter();
  const { user, loading: sessionLoading } = useSession({ redirectOnUnauthorized: false });
  const [draft, setDraft] = useState<DraftCourse>(emptyDraft);
  const [loaded, setLoaded] = useState(false);
  const [step, setStep] = useState<Step>("details");

  const [creating, setCreating] = useState(false);
  const [progress, setProgress] = useState<CreationProgress | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [creation, setCreation] = useState<CreationState>(emptyCreationState);

  useEffect(() => {
    if (!sessionLoading && !user) router.push("/login");
  }, [sessionLoading, user, router]);

  useEffect(() => {
    setDraft(loadDraft());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) saveDraft(draft);
  }, [draft, loaded]);

  // Once the course exists, the plan can't change any more: going back and
  // editing would make the saved course and the plan disagree.
  const started = creation.courseId !== null;

  const issues = useMemo(() => outlineIssues(draft), [draft]);
  const stats = useMemo(() => outlineStats(draft), [draft]);
  const blocked = hasErrors(issues);

  function update(change: Partial<DraftCourse>) {
    setDraft((d) => ({ ...d, ...change }));
  }

  function updateModule(key: string, change: (m: DraftModule) => DraftModule) {
    setDraft((d) => ({ ...d, modules: d.modules.map((m) => (m.key === key ? change(m) : m)) }));
  }

  function updateLesson(moduleKey: string, lessonKey: string, change: Partial<DraftLesson>) {
    updateModule(moduleKey, (m) => ({
      ...m,
      lessons: m.lessons.map((l) => (l.key === lessonKey ? { ...l, ...change } : l)),
    }));
  }

  function handleStartOver() {
    if (!confirm("Clear this draft and start again?")) return;
    clearDraft();
    setDraft(emptyDraft());
    setStep("details");
  }

  async function handleCreate() {
    setCreating(true);
    setCreateError(null);
    // Work on a copy so React sees each change; the copy is kept if something fails.
    const state: CreationState = {
      courseId: creation.courseId,
      moduleIds: { ...creation.moduleIds },
      createdLessons: { ...creation.createdLessons },
    };
    try {
      const courseId = await createCourseFromDraft(draft, state, setProgress);
      clearDraft();
      router.push(`/faculty/courses/${courseId}`);
    } catch (err) {
      setCreateError(errorMessageFor(err, "Something went wrong while saving."));
    } finally {
      setCreation(state);
      setCreating(false);
    }
  }

  if (sessionLoading || !user || !loaded) {
    return <main className="p-10 text-sm text-neutral-500">Loading...</main>;
  }

  const canLeaveDetails = draft.title.trim().length >= 3;

  return (
    <div className="flex min-h-screen">
      <FacultySidebarNav />
      <main className="flex-1 overflow-x-hidden px-10 py-12">
        <div className="flex items-center justify-between">
          <div>
            <Link href="/faculty" className="text-sm text-neutral-500 hover:text-neutral-900">
              ← My Courses
            </Link>
            <h1 className="mt-1 text-2xl text-neutral-900">New course</h1>
          </div>
          {!started && (
            <button onClick={handleStartOver} className="text-sm text-neutral-500 hover:text-danger">
              Start over
            </button>
          )}
        </div>

        <div className="mt-6 flex gap-2 border-b border-neutral-100">
          {STEPS.map((s) => {
            const disabled = started || (s.key !== "details" && !canLeaveDetails);
            return (
              <button
                key={s.key}
                onClick={() => !disabled && setStep(s.key)}
                disabled={disabled && s.key !== step}
                className={`-mb-px border-b-2 px-1 pb-3 text-sm ${
                  step === s.key
                    ? "border-primary-500 text-primary-700"
                    : "border-transparent text-neutral-500 hover:text-neutral-900 disabled:hover:text-neutral-500"
                }`}
              >
                {s.label}
              </button>
            );
          })}
        </div>

        <div className="mt-8 flex gap-10">
          <div className="min-w-0 flex-1">
            {step === "details" && (
              <div className="flex max-w-lg flex-col gap-4">
                <div>
                  <label className="text-xs text-neutral-500">Title</label>
                  <input
                    value={draft.title}
                    onChange={(e) => update({ title: e.target.value })}
                    maxLength={200}
                    className={`mt-1 block w-full ${inputClass}`}
                  />
                </div>
                <div>
                  <label className="text-xs text-neutral-500">Description</label>
                  <textarea
                    value={draft.description}
                    onChange={(e) => update({ description: e.target.value })}
                    rows={4}
                    maxLength={2000}
                    className={`mt-1 block w-full ${inputClass}`}
                  />
                </div>
                <div>
                  <label className="text-xs text-neutral-500">Difficulty</label>
                  <select
                    value={draft.difficulty}
                    onChange={(e) => update({ difficulty: e.target.value })}
                    className={`mt-1 block ${inputClass}`}
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setStep("structure")}
                    disabled={!canLeaveDetails}
                    className="rounded-md bg-primary-500 px-4 py-2 text-sm text-white disabled:opacity-50"
                  >
                    Next: modules & lessons
                  </button>
                  {!canLeaveDetails && <span className="text-xs text-neutral-500">The title needs at least 3 characters.</span>}
                </div>
              </div>
            )}

            {step === "structure" && (
              <div className="flex max-w-2xl flex-col gap-4">
                <p className="text-sm text-neutral-500">
                  Plan the modules and lessons. Videos, files and the assessment are added in the course editor after the course is created.
                </p>

                {draft.modules.map((m, mi) => (
                  <div key={m.key} className="rounded-lg border border-neutral-100 p-4">
                    <div className="flex items-center gap-2">
                      <span className="w-6 text-sm text-neutral-500">{mi + 1}.</span>
                      <input
                        value={m.title}
                        onChange={(e) => updateModule(m.key, (x) => ({ ...x, title: e.target.value }))}
                        placeholder="Module title"
                        maxLength={200}
                        className={`flex-1 ${inputClass}`}
                      />
                      <button
                        aria-label="Move module up"
                        onClick={() => update({ modules: move(draft.modules, mi, -1) })}
                        disabled={mi === 0}
                        className={iconButton}
                      >
                        <ArrowUp size={16} />
                      </button>
                      <button
                        aria-label="Move module down"
                        onClick={() => update({ modules: move(draft.modules, mi, 1) })}
                        disabled={mi === draft.modules.length - 1}
                        className={iconButton}
                      >
                        <ArrowDown size={16} />
                      </button>
                      <button
                        aria-label="Remove module"
                        onClick={() => {
                          if (m.lessons.length > 0 && !confirm("Remove this module and its lessons?")) return;
                          update({ modules: draft.modules.filter((x) => x.key !== m.key) });
                        }}
                        className={iconButton}
                      >
                        <X size={16} />
                      </button>
                    </div>

                    <div className="ml-8 mt-3 flex flex-col gap-2">
                      {m.lessons.map((l, li) => (
                        <div key={l.key} className="flex items-center gap-2">
                          <span className="w-8 text-xs text-neutral-500">
                            {mi + 1}.{li + 1}
                          </span>
                          <input
                            value={l.title}
                            onChange={(e) => updateLesson(m.key, l.key, { title: e.target.value })}
                            placeholder="Lesson title"
                            maxLength={200}
                            className={`min-w-0 flex-1 ${inputClass}`}
                          />
                          <select
                            value={l.content_type}
                            onChange={(e) => updateLesson(m.key, l.key, { content_type: e.target.value as LessonContentType })}
                            className={inputClass}
                            aria-label="Lesson type"
                          >
                            {(Object.keys(CONTENT_TYPE_LABEL) as LessonContentType[]).map((t) => (
                              <option key={t} value={t}>
                                {CONTENT_TYPE_LABEL[t]}
                              </option>
                            ))}
                          </select>
                          <input
                            value={l.duration}
                            onChange={(e) => updateLesson(m.key, l.key, { duration: e.target.value })}
                            placeholder="min"
                            inputMode="numeric"
                            aria-label="Duration in minutes"
                            className={`w-16 ${inputClass}`}
                          />
                          <button
                            aria-label="Move lesson up"
                            onClick={() => updateModule(m.key, (x) => ({ ...x, lessons: move(x.lessons, li, -1) }))}
                            disabled={li === 0}
                            className={iconButton}
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button
                            aria-label="Move lesson down"
                            onClick={() => updateModule(m.key, (x) => ({ ...x, lessons: move(x.lessons, li, 1) }))}
                            disabled={li === m.lessons.length - 1}
                            className={iconButton}
                          >
                            <ArrowDown size={14} />
                          </button>
                          <button
                            aria-label="Remove lesson"
                            onClick={() => updateModule(m.key, (x) => ({ ...x, lessons: x.lessons.filter((y) => y.key !== l.key) }))}
                            className={iconButton}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => updateModule(m.key, (x) => ({ ...x, lessons: [...x.lessons, newLesson()] }))}
                        className="self-start text-xs text-primary-700 hover:underline"
                      >
                        + Lesson
                      </button>
                    </div>
                  </div>
                ))}

                <button
                  onClick={() => update({ modules: [...draft.modules, newModule()] })}
                  className="self-start rounded-md border border-dashed border-neutral-500 px-4 py-2 text-sm text-primary-700 hover:bg-neutral-50"
                >
                  + Module
                </button>

                <div className="mt-4 flex gap-3">
                  <button onClick={() => setStep("details")} className="rounded-md border border-neutral-100 px-4 py-2 text-sm text-neutral-900">
                    Back
                  </button>
                  <button onClick={() => setStep("review")} className="rounded-md bg-primary-500 px-4 py-2 text-sm text-white">
                    Next: review
                  </button>
                </div>
              </div>
            )}

            {step === "review" && (
              <div className="flex max-w-2xl flex-col gap-6">
                <div className="flex flex-wrap gap-3">
                  {[
                    [`${stats.modules}`, stats.modules === 1 ? "module" : "modules"],
                    [`${stats.lessons}`, stats.lessons === 1 ? "lesson" : "lessons"],
                    [stats.totalMins > 0 ? formatMinutes(stats.totalMins) : "—", "total length"],
                  ].map(([value, label]) => (
                    <div key={label} className="rounded-lg bg-neutral-50 px-4 py-3">
                      <p className="text-lg text-neutral-900">{value}</p>
                      <p className="text-xs text-neutral-500">{label}</p>
                    </div>
                  ))}
                  {stats.lessons > 0 && (
                    <div className="rounded-lg bg-neutral-50 px-4 py-3">
                      <p className="text-sm text-neutral-900">
                        {(Object.entries(stats.byType) as [LessonContentType, number][])
                          .map(([t, n]) => `${n} ${CONTENT_TYPE_LABEL[t]}`)
                          .join(" · ")}
                      </p>
                      <p className="text-xs text-neutral-500">by type</p>
                    </div>
                  )}
                </div>

                {issues.length > 0 && (
                  <div className="flex flex-col gap-1 rounded-lg border border-neutral-100 px-4 py-3">
                    {issues.map((i, n) => (
                      <p key={n} className={`text-sm ${i.level === "error" ? "text-danger" : "text-neutral-500"}`}>
                        {i.level === "error" ? "Fix: " : "Note: "}
                        {i.message}
                      </p>
                    ))}
                  </div>
                )}

                <div className="rounded-lg border border-neutral-100 p-6">
                  <OutlineTree draft={draft} size="lg" />
                </div>

                <p className="text-xs text-neutral-500">
                  The course is saved as a draft. Students can&apos;t see it until an administrator publishes it.
                </p>

                {progress && (creating || createError) && (
                  <div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
                      <div
                        className="h-full rounded-full bg-primary-500 transition-all"
                        style={{ width: `${(progress.done / progress.total) * 100}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-neutral-500">
                      {progress.label} ({progress.done} of {progress.total})
                    </p>
                  </div>
                )}

                {createError && (
                  <div className="rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">
                    <p>Stopped part way: {createError}</p>
                    <p className="mt-1 text-xs">
                      Everything before this point is saved. Retry to carry on from here
                      {creation.courseId ? ", or open the course and finish it in the editor." : "."}
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  {!started && (
                    <button
                      onClick={() => setStep("structure")}
                      disabled={creating}
                      className="rounded-md border border-neutral-100 px-4 py-2 text-sm text-neutral-900 disabled:opacity-50"
                    >
                      Back to edit
                    </button>
                  )}
                  <button
                    onClick={handleCreate}
                    disabled={creating || blocked}
                    className="rounded-md bg-primary-500 px-4 py-2 text-sm text-white disabled:opacity-50"
                  >
                    {creating ? "Creating..." : createError ? "Retry" : "Confirm & create course"}
                  </button>
                  {creation.courseId && !creating && (
                    <Link href={`/faculty/courses/${creation.courseId}`} className="text-sm text-primary-700 hover:underline">
                      Open course
                    </Link>
                  )}
                  {blocked && <span className="text-xs text-danger">Fix the items above first.</span>}
                </div>
              </div>
            )}
          </div>

          {/* Live hierarchy preview */}
          {step !== "review" && (
            <aside className="sticky top-6 w-80 flex-shrink-0 self-start rounded-lg border border-neutral-100 p-5">
              <p className="text-xs uppercase tracking-wide text-neutral-500">Course outline</p>
              <div className="mt-3">
                <OutlineTree draft={draft} />
              </div>
              <p className="mt-4 border-t border-neutral-100 pt-3 text-xs text-neutral-500">
                {stats.modules} module{stats.modules !== 1 ? "s" : ""} · {stats.lessons} lesson{stats.lessons !== 1 ? "s" : ""}
                {stats.totalMins > 0 && ` · ${formatMinutes(stats.totalMins)}`}
              </p>
            </aside>
          )}
        </div>
      </main>
    </div>
  );
}
