"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "@/lib/user-session";
import { GatewayError } from "@/lib/gateway-client";
import { FacultySidebarNav } from "@/components/faculty-sidebar-nav";
import {
  getFacultyCourseDetail,
  createModule,
  updateModule,
  deleteModule,
  createLesson,
  updateLesson,
  deleteLesson,
  type FacultyCourseDetail,
  type FacultyModule,
  type FacultyLesson,
} from "@/lib/faculty";

type Selection =
  | { kind: "module"; moduleId: string }
  | { kind: "lesson"; moduleId: string; lessonId: string }
  | null;

export default function FacultyCourseEditorPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;
  const { user, loading: sessionLoading } = useSession({ redirectOnUnauthorized: false });
  const [course, setCourse] = useState<FacultyCourseDetail | null | undefined>(undefined);
  const [selection, setSelection] = useState<Selection>(null);

  const [moduleTitle, setModuleTitle] = useState("");
  const [moduleDescription, setModuleDescription] = useState("");
  const [moduleLocked, setModuleLocked] = useState(false);
  const [savingModule, setSavingModule] = useState(false);

  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonDescription, setLessonDescription] = useState("");
  const [lessonPreview, setLessonPreview] = useState(false);
  const [lessonDuration, setLessonDuration] = useState("");
  const [savingLesson, setSavingLesson] = useState(false);

  const [addingModule, setAddingModule] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState("");

  const [addingLessonTo, setAddingLessonTo] = useState<string | null>(null);
  const [newLessonTitle, setNewLessonTitle] = useState("");

  useEffect(() => {
    if (!sessionLoading && !user) {
      router.push("/login");
    }
  }, [sessionLoading, user, router]);

  const loadCourse = useCallback(() => {
    getFacultyCourseDetail(courseId)
      .then(setCourse)
      .catch((err) => {
        if (err instanceof GatewayError && (err.statusCode === 401 || err.statusCode === 403)) {
          router.push("/login");
          return;
        }
        throw err;
      });
  }, [courseId, router]);

  useEffect(() => {
    loadCourse();
  }, [loadCourse]);

  const selectedModule: FacultyModule | undefined = course?.modules.find(
    (m) => selection?.kind === "module" && m.module_id === selection.moduleId
  ) ?? course?.modules.find((m) => selection?.kind === "lesson" && m.module_id === selection.moduleId);

  const selectedLesson: FacultyLesson | undefined =
    selection?.kind === "lesson" ? selectedModule?.lessons.find((l) => l.lesson_id === selection.lessonId) : undefined;

  useEffect(() => {
    if (selection?.kind === "module" && selectedModule) {
      setModuleTitle(selectedModule.title);
      setModuleDescription(selectedModule.description ?? "");
      setModuleLocked(selectedModule.is_locked);
    }
  }, [selection, selectedModule]);

  useEffect(() => {
    if (selection?.kind === "lesson" && selectedLesson) {
      setLessonTitle(selectedLesson.title);
      setLessonDescription(selectedLesson.description ?? "");
      setLessonPreview(selectedLesson.is_preview);
      setLessonDuration(selectedLesson.estimated_duration_mins?.toString() ?? "");
    }
  }, [selection, selectedLesson]);

  async function handleCreateModule(e: React.FormEvent) {
    e.preventDefault();
    const created = await createModule(courseId, { title: newModuleTitle });
    setNewModuleTitle("");
    setAddingModule(false);
    await loadCourse();
    setSelection({ kind: "module", moduleId: created.module_id });
  }

  async function handleSaveModule() {
    if (selection?.kind !== "module") return;
    setSavingModule(true);
    try {
      await updateModule(courseId, selection.moduleId, {
        title: moduleTitle,
        description: moduleDescription || undefined,
        is_locked: moduleLocked,
      });
      loadCourse();
    } finally {
      setSavingModule(false);
    }
  }

  async function handleDeleteModule() {
    if (selection?.kind !== "module") return;
    if (!confirm("Delete this module and everything in it?")) return;
    await deleteModule(courseId, selection.moduleId);
    setSelection(null);
    loadCourse();
  }

  async function handleCreateLesson(e: React.FormEvent, moduleId: string) {
    e.preventDefault();
    const created = await createLesson(courseId, moduleId, { title: newLessonTitle, content_type: "VIDEO" });
    setNewLessonTitle("");
    setAddingLessonTo(null);
    await loadCourse();
    setSelection({ kind: "lesson", moduleId, lessonId: created.lesson_id });
  }

  async function handleSaveLesson() {
    if (selection?.kind !== "lesson") return;
    setSavingLesson(true);
    try {
      await updateLesson(courseId, selection.moduleId, selection.lessonId, {
        title: lessonTitle,
        description: lessonDescription || undefined,
        is_preview: lessonPreview,
        estimated_duration_mins: lessonDuration ? parseInt(lessonDuration, 10) : undefined,
      });
      loadCourse();
    } finally {
      setSavingLesson(false);
    }
  }

  async function handleDeleteLesson() {
    if (selection?.kind !== "lesson") return;
    if (!confirm("Delete this lesson?")) return;
    await deleteLesson(courseId, selection.moduleId, selection.lessonId);
    setSelection(null);
    loadCourse();
  }

  if (sessionLoading || !user) {
    return <main className="p-10 text-sm text-neutral-500">Loading...</main>;
  }

  return (
    <div className="flex min-h-screen">
      <FacultySidebarNav />
      {course === undefined ? (
        <main className="flex-1 p-10 text-sm text-neutral-500">Loading...</main>
      ) : course === null ? (
        <main className="flex-1 p-10 text-sm text-neutral-500">Course not found.</main>
      ) : (
        <>
          {/* Outline panel */}
          <div className="flex w-80 flex-shrink-0 flex-col border-r border-neutral-100 px-6 py-10">
            <p className="text-xs text-neutral-500">Editing</p>
            <h1 className="mt-1 text-lg text-neutral-900">{course.title}</h1>
            <span
              className={`mt-2 self-start rounded-full px-2.5 py-1 text-xs ${
                course.is_published ? "bg-success/10 text-success" : "bg-neutral-100 text-neutral-500"
              }`}
            >
              {course.status}
            </span>

            <div className="mt-8 flex flex-col gap-1">
              {course.modules.map((module) => (
                <div key={module.module_id}>
                  <button
                    onClick={() => setSelection({ kind: "module", moduleId: module.module_id })}
                    className={`w-full rounded-md px-3 py-2 text-left text-sm ${
                      selection?.moduleId === module.module_id && selection.kind === "module"
                        ? "bg-primary-100 text-primary-700"
                        : "text-neutral-900 hover:bg-neutral-50"
                    }`}
                  >
                    {module.title}
                  </button>
                  <div className="ml-3 flex flex-col gap-0.5 border-l border-neutral-100 pl-3">
                    {module.lessons.map((lesson) => (
                      <button
                        key={lesson.lesson_id}
                        onClick={() =>
                          setSelection({ kind: "lesson", moduleId: module.module_id, lessonId: lesson.lesson_id })
                        }
                        className={`w-full rounded-md px-3 py-1.5 text-left text-xs ${
                          selection?.kind === "lesson" && selection.lessonId === lesson.lesson_id
                            ? "bg-primary-100 text-primary-700"
                            : "text-neutral-500 hover:bg-neutral-50"
                        }`}
                      >
                        {lesson.title}
                      </button>
                    ))}
                    {addingLessonTo === module.module_id ? (
                      <form
                        onSubmit={(e) => handleCreateLesson(e, module.module_id)}
                        className="mt-1 flex flex-col gap-1"
                      >
                        <input
                          autoFocus
                          required
                          placeholder="Lesson title"
                          value={newLessonTitle}
                          onChange={(e) => setNewLessonTitle(e.target.value)}
                          onBlur={() => !newLessonTitle && setAddingLessonTo(null)}
                          className="rounded-md border border-neutral-100 px-2 py-1 text-xs"
                        />
                      </form>
                    ) : (
                      <button
                        onClick={() => setAddingLessonTo(module.module_id)}
                        className="px-3 py-1.5 text-left text-xs text-neutral-500 hover:text-primary-700"
                      >
                        + Lesson
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {addingModule ? (
                <form onSubmit={handleCreateModule}>
                  <input
                    autoFocus
                    required
                    placeholder="Module title"
                    value={newModuleTitle}
                    onChange={(e) => setNewModuleTitle(e.target.value)}
                    onBlur={() => !newModuleTitle && setAddingModule(false)}
                    className="w-full rounded-md border border-neutral-100 px-3 py-2 text-sm"
                  />
                </form>
              ) : (
                <button
                  onClick={() => setAddingModule(true)}
                  className="mt-2 rounded-md px-3 py-2 text-left text-sm text-primary-700 hover:bg-neutral-50"
                >
                  + Module
                </button>
              )}
            </div>
          </div>

          {/* Detail panel */}
          <main className="flex-1 overflow-x-hidden px-10 py-12">
            {selection === null && (
              <p className="text-sm text-neutral-500">Select a module or lesson to edit, or add a new one.</p>
            )}

            {selection?.kind === "module" && selectedModule && (
              <div className="max-w-lg">
                <p className="text-sm text-neutral-500">Module</p>
                <div className="mt-4 flex flex-col gap-4">
                  <div>
                    <label className="text-xs text-neutral-500">Title</label>
                    <input
                      value={moduleTitle}
                      onChange={(e) => setModuleTitle(e.target.value)}
                      className="mt-1 block w-full rounded-md border border-neutral-100 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-neutral-500">Description</label>
                    <textarea
                      value={moduleDescription}
                      onChange={(e) => setModuleDescription(e.target.value)}
                      rows={3}
                      className="mt-1 block w-full rounded-md border border-neutral-100 px-3 py-2 text-sm"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-neutral-900">
                    <input
                      type="checkbox"
                      checked={moduleLocked}
                      onChange={(e) => setModuleLocked(e.target.checked)}
                      className="accent-primary-500"
                    />
                    Locked
                  </label>
                  <div className="flex gap-3">
                    <button
                      onClick={handleSaveModule}
                      disabled={savingModule}
                      className="rounded-md bg-primary-500 px-4 py-2 text-sm text-white disabled:opacity-50"
                    >
                      {savingModule ? "Saving..." : "Save"}
                    </button>
                    <button onClick={handleDeleteModule} className="text-sm text-danger">
                      Delete module
                    </button>
                  </div>
                </div>
              </div>
            )}

            {selection?.kind === "lesson" && selectedLesson && (
              <div className="max-w-lg">
                <p className="text-sm text-neutral-500">Lesson</p>
                <div className="mt-4 flex flex-col gap-4">
                  <div>
                    <label className="text-xs text-neutral-500">Title</label>
                    <input
                      value={lessonTitle}
                      onChange={(e) => setLessonTitle(e.target.value)}
                      className="mt-1 block w-full rounded-md border border-neutral-100 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-neutral-500">Description</label>
                    <textarea
                      value={lessonDescription}
                      onChange={(e) => setLessonDescription(e.target.value)}
                      rows={4}
                      className="mt-1 block w-full rounded-md border border-neutral-100 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-neutral-500">Estimated duration (minutes)</label>
                    <input
                      type="number"
                      value={lessonDuration}
                      onChange={(e) => setLessonDuration(e.target.value)}
                      className="mt-1 block w-32 rounded-md border border-neutral-100 px-3 py-2 text-sm"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-neutral-900">
                    <input
                      type="checkbox"
                      checked={lessonPreview}
                      onChange={(e) => setLessonPreview(e.target.checked)}
                      className="accent-primary-500"
                    />
                    Free preview (visible without enrolling)
                  </label>
                  <p className="text-xs text-neutral-500">
                    Video and downloadable resources aren&apos;t editable here yet.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={handleSaveLesson}
                      disabled={savingLesson}
                      className="rounded-md bg-primary-500 px-4 py-2 text-sm text-white disabled:opacity-50"
                    >
                      {savingLesson ? "Saving..." : "Save"}
                    </button>
                    <button onClick={handleDeleteLesson} className="text-sm text-danger">
                      Delete lesson
                    </button>
                  </div>
                </div>
              </div>
            )}
          </main>
        </>
      )}
    </div>
  );
}