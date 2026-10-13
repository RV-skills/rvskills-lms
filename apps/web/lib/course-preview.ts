import { gatewayFetch, GatewayError } from "./gateway-client";
import type { CourseDetail, LessonDetail, ModuleDetail } from "./course-details";
import type { CoursePlayerData, LessonContentType, PlayerModule, PlayerResource } from "./course-player";

// What GET /api/v1/courses/:id returns to someone who manages the course: the
// public detail plus every lesson's content (video and resources), drafts included.
export interface PreviewLesson extends LessonDetail {
  content_type: LessonContentType;
  video_url: string | null;
  description: string | null;
  resources: PlayerResource[];
}

export interface PreviewModule extends Omit<ModuleDetail, "lessons"> {
  lessons: PreviewLesson[];
}

export interface PreviewCourse extends Omit<CourseDetail, "modules"> {
  modules: PreviewModule[];
}

export async function getPreviewCourse(courseId: string): Promise<PreviewCourse | null> {
  try {
    return await gatewayFetch<PreviewCourse>(`/api/v1/courses/${courseId}`);
  } catch (err) {
    if (err instanceof GatewayError && err.statusCode === 404) return null;
    throw err;
  }
}

// The player as a brand-new student would find it: nothing completed, the first
// lesson is where they start, and every module after the first is locked until
// the one before it is finished (the same rule the gateway applies to real students).
// Unlike the real player, the content of locked modules is kept so faculty can still open it.
export function toPreviewPlayer(course: PreviewCourse): CoursePlayerData | null {
  let first = true;
  const modules: PlayerModule[] = course.modules.map((m, mi) => ({
    module_id: m.module_id,
    title: m.title,
    is_locked: mi > 0,
    lessons: m.lessons.map((l) => {
      const status = first ? "current" : "upcoming";
      first = false;
      return {
        lesson_id: l.lesson_id,
        title: l.title,
        content_type: l.content_type,
        estimated_duration_mins: l.estimated_duration_mins,
        video_url: l.video_url,
        description: l.description,
        resources: l.resources ?? [],
        status,
      };
    }),
  }));

  const currentLesson = modules.flatMap((m) => m.lessons)[0];
  if (!currentLesson) return null;
  return { courseTitle: course.title, modules, currentLesson };
}

export interface PreviewCheck {
  level: "warning" | "info";
  message: string;
}

// Things a student would trip over, listed on the preview so faculty can fix them first.
export function previewChecks(course: PreviewCourse): PreviewCheck[] {
  const checks: PreviewCheck[] = [];
  if (!course.description) checks.push({ level: "warning", message: "The course has no description." });
  if (course.modules.length === 0) checks.push({ level: "warning", message: "The course has no modules." });

  course.modules.forEach((m, mi) => {
    if (m.lessons.length === 0) {
      checks.push({ level: "warning", message: `Module ${mi + 1} "${m.title}" has no lessons.` });
    }
    m.lessons.forEach((l, li) => {
      const n = `Lesson ${mi + 1}.${li + 1} "${l.title}"`;
      // The lesson's own content (video, PDF, slides or link) lives in video_url;
      // quizzes point to the Assessments tab instead.
      if (l.content_type !== "QUIZ" && !l.video_url) {
        checks.push({ level: "warning", message: `${n} has no content yet. Students will see an empty screen.` });
      }
    });
  });

  if (course.modules.length > 1) {
    checks.push({
      level: "info",
      message: "Students unlock each module after finishing the one before it. In this preview you can open them all.",
    });
  }
  return checks;
}
