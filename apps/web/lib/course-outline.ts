import { createCourse, createModule, createLesson } from "./faculty";
import type { LessonContentType } from "./course-player";

// A course as the faculty member is planning it, before anything is saved.
// `key` is a local id so React lists and the resume logic can tell items apart.
export interface DraftLesson {
  key: string;
  title: string;
  content_type: LessonContentType;
  duration: string; // minutes, as typed; blank means unknown
}

export interface DraftModule {
  key: string;
  title: string;
  lessons: DraftLesson[];
}

export interface DraftCourse {
  title: string;
  description: string;
  difficulty: string;
  modules: DraftModule[];
}

export const CONTENT_TYPE_LABEL: Record<LessonContentType, string> = {
  VIDEO: "Video",
  PDF: "PDF",
  SLIDE: "Slides",
  LINK: "Link",
  QUIZ: "Quiz",
  OTHER: "Other",
};

let keyCounter = 0;
export function newKey(prefix: string): string {
  keyCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${keyCounter}`;
}

export function emptyDraft(): DraftCourse {
  return { title: "", description: "", difficulty: "beginner", modules: [] };
}

export function newModule(title = ""): DraftModule {
  return { key: newKey("m"), title, lessons: [] };
}

export function newLesson(title = ""): DraftLesson {
  return { key: newKey("l"), title, content_type: "VIDEO", duration: "" };
}

// Blank is fine (unknown). Anything else must be a whole number above zero,
// which is what the courses service accepts.
export function parseDuration(value: string): number | null | "invalid" {
  const v = value.trim();
  if (v === "") return null;
  if (!/^\d+$/.test(v)) return "invalid";
  const n = parseInt(v, 10);
  return n > 0 ? n : "invalid";
}

export function formatMinutes(total: number): string {
  if (total < 60) return `${total} min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

export interface OutlineStats {
  modules: number;
  lessons: number;
  totalMins: number;
  lessonsWithoutDuration: number;
  byType: Partial<Record<LessonContentType, number>>;
}

export function outlineStats(draft: DraftCourse): OutlineStats {
  const stats: OutlineStats = { modules: draft.modules.length, lessons: 0, totalMins: 0, lessonsWithoutDuration: 0, byType: {} };
  for (const m of draft.modules) {
    for (const l of m.lessons) {
      stats.lessons += 1;
      stats.byType[l.content_type] = (stats.byType[l.content_type] ?? 0) + 1;
      const d = parseDuration(l.duration);
      if (typeof d === "number") stats.totalMins += d;
      else stats.lessonsWithoutDuration += 1;
    }
  }
  return stats;
}

export function moduleMinutes(module: DraftModule): number {
  return module.lessons.reduce((sum, l) => {
    const d = parseDuration(l.duration);
    return typeof d === "number" ? sum + d : sum;
  }, 0);
}

export interface OutlineIssue {
  level: "error" | "warning";
  message: string;
}

// Errors stop the course from being created (the backend would refuse them).
// Warnings are things a student would notice, but the course can still be saved.
export function outlineIssues(draft: DraftCourse): OutlineIssue[] {
  const issues: OutlineIssue[] = [];
  const title = draft.title.trim();
  if (title.length < 3) issues.push({ level: "error", message: "Course title needs at least 3 characters." });
  if (title.length > 200) issues.push({ level: "error", message: "Course title is longer than 200 characters." });
  if (draft.description.length > 2000) issues.push({ level: "error", message: "Description is longer than 2000 characters." });

  if (draft.modules.length === 0) {
    issues.push({ level: "warning", message: "No modules yet. Students will see an empty syllabus." });
  }

  draft.modules.forEach((m, mi) => {
    const label = `Module ${mi + 1}`;
    if (m.title.trim() === "") issues.push({ level: "error", message: `${label} has no title.` });
    if (m.title.length > 200) issues.push({ level: "error", message: `${label} title is longer than 200 characters.` });
    if (m.lessons.length === 0) issues.push({ level: "warning", message: `${label}${m.title.trim() ? ` "${m.title.trim()}"` : ""} has no lessons.` });

    m.lessons.forEach((l, li) => {
      const lLabel = `Lesson ${mi + 1}.${li + 1}`;
      if (l.title.trim() === "") issues.push({ level: "error", message: `${lLabel} has no title.` });
      if (l.title.length > 200) issues.push({ level: "error", message: `${lLabel} title is longer than 200 characters.` });
      if (parseDuration(l.duration) === "invalid") {
        issues.push({ level: "error", message: `${lLabel} duration must be a whole number of minutes.` });
      }
    });
  });

  const stats = outlineStats(draft);
  if (stats.lessons > 0 && stats.lessonsWithoutDuration === stats.lessons) {
    issues.push({ level: "warning", message: "No lesson has a duration, so students won't see how long the course takes." });
  }
  return issues;
}

export function hasErrors(issues: OutlineIssue[]): boolean {
  return issues.some((i) => i.level === "error");
}

// Moves an item one place up or down. Out-of-range moves return the list unchanged.
export function move<T>(list: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (index < 0 || index >= list.length || target < 0 || target >= list.length) return list;
  const copy = [...list];
  [copy[index], copy[target]] = [copy[target], copy[index]];
  return copy;
}

// What has already been saved, so a failed run can carry on from where it stopped
// instead of creating the course (or a module) twice.
export interface CreationState {
  courseId: string | null;
  moduleIds: Record<string, string>; // draft module key -> real module_id
  createdLessons: Record<string, true>; // draft lesson keys already saved
}

export function emptyCreationState(): CreationState {
  return { courseId: null, moduleIds: {}, createdLessons: {} };
}

export interface CreationProgress {
  done: number;
  total: number;
  label: string;
}

export function creationSteps(draft: DraftCourse): number {
  return 1 + draft.modules.length + draft.modules.reduce((n, m) => n + m.lessons.length, 0);
}

// Saves the course, then each module and its lessons in order. The services add
// new modules and lessons at the end, so creating them in sequence keeps the order.
// `state` is updated as it goes; on failure the caller keeps it and passes it back to resume.
export async function createCourseFromDraft(
  draft: DraftCourse,
  state: CreationState,
  onProgress: (p: CreationProgress) => void
): Promise<string> {
  const total = creationSteps(draft);
  let done = 0;
  const step = (label: string) => onProgress({ done, total, label });

  if (!state.courseId) {
    step("Creating the course");
    const course = await createCourse({
      title: draft.title.trim(),
      description: draft.description.trim() || undefined,
      difficulty: draft.difficulty,
    });
    state.courseId = course.course_id;
  }
  done += 1;
  const courseId = state.courseId;

  for (const [mi, m] of draft.modules.entries()) {
    if (!state.moduleIds[m.key]) {
      step(`Creating module ${mi + 1}: ${m.title.trim()}`);
      const created = await createModule(courseId, { title: m.title.trim() });
      state.moduleIds[m.key] = created.module_id;
    }
    done += 1;
    const moduleId = state.moduleIds[m.key];

    for (const [li, l] of m.lessons.entries()) {
      if (!state.createdLessons[l.key]) {
        step(`Creating lesson ${mi + 1}.${li + 1}: ${l.title.trim()}`);
        const d = parseDuration(l.duration);
        await createLesson(courseId, moduleId, {
          title: l.title.trim(),
          content_type: l.content_type,
          ...(typeof d === "number" ? { estimated_duration_mins: d } : {}),
        });
        state.createdLessons[l.key] = true;
      }
      done += 1;
    }
  }

  onProgress({ done: total, total, label: "Done" });
  return courseId;
}
