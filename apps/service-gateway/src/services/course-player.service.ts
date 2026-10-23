import { getCourseDetail } from "./courses.service";
import { getCompletedLessonIds, getMyEnrollments } from "./enrollment.service";
import { NotFoundError, ValidationError } from "@rv-lms/shared-utils";
import { isOpen, moduleUnlockDate } from "../utils/release-schedule";

export interface PlayerResource {
  resource_id: string;
  title: string;
  resource_type: string;
  file_url: string;
}

export interface PlayerLesson {
  lesson_id: string;
  title: string;
  content_type: string;
  estimated_duration_mins: number | null;
  video_url: string | null;
  description: string | null;
  resources: PlayerResource[];
  status: "completed" | "current" | "upcoming";
}

export interface PlayerModule {
  module_id: string;
  title: string;
  is_locked: boolean;
  // For students in a batch: the day a locked module opens ("2026-11-15"). Otherwise null.
  unlocks_on: string | null;
  lessons: PlayerLesson[];
}

export interface CoursePlayerData {
  courseTitle: string;
  modules: PlayerModule[];
  currentLesson: PlayerLesson;
}

export async function getCoursePlayerData(
  course_id: string,
  accessToken: string
): Promise<CoursePlayerData | null> {
  const [course, enrollments] = await Promise.all([
    getCourseDetail(course_id, accessToken),
    getMyEnrollments(accessToken),
  ]);

  if (!course) {
    return null;
  }

  const enrollment = enrollments.find((e) => e.course_id === course_id);
  if (!enrollment) {
    throw new ValidationError("You are not enrolled in this course");
  }

  const completedIds = await getCompletedLessonIds(enrollment.enrollment_id, accessToken);
  const completedSet = new Set(completedIds);
  const batch = enrollment.batch ?? null;
  const now = new Date();
  let foundCurrent = false;

  // Without a batch, a module opens once the previous one is finished (as before).
  // In a batch, a module opens on its date only, whatever the student has finished.
  let previousModuleComplete = true;

  const modules: PlayerModule[] = course.modules.map((module) => {
    let moduleUnlocked: boolean;
    let unlocksOn: string | null = null;
    if (batch) {
      const { date } = moduleUnlockDate(batch, module.module_id, module.unlock_after_days);
      moduleUnlocked = isOpen(date, now);
      unlocksOn = moduleUnlocked ? null : date;
    } else {
      moduleUnlocked = previousModuleComplete;
    }

    const lessons = module.lessons.map((lesson) => {
      const isCompleted = completedSet.has(lesson.lesson_id);
      let status: PlayerLesson["status"];

      if (isCompleted) {
        status = "completed";
      } else if (!foundCurrent && moduleUnlocked) {
        status = "current";
        foundCurrent = true;
      } else {
        status = "upcoming";
      }

      return {
        lesson_id: lesson.lesson_id,
        title: lesson.title,
        estimated_duration_mins: lesson.estimated_duration_mins,
        // Locked content never leaves the server: no video or file links.
        video_url: moduleUnlocked ? lesson.video_url : null,
        content_type: lesson.content_type,
        description: lesson.description,
        resources: moduleUnlocked ? lesson.resources : [],
        status,
      };
    });

    previousModuleComplete = lessons.every((l) => l.status === "completed");

    return {
      module_id: module.module_id,
      title: module.title,
      is_locked: !moduleUnlocked,
      unlocks_on: unlocksOn,
      lessons,
    };
  });

  const allLessons = modules.flatMap((m) => m.lessons);
  const openLessons = modules.filter((m) => !m.is_locked).flatMap((m) => m.lessons);
  // All open lessons done (or nothing open yet): land on the last open lesson, else the first.
  const currentLesson =
    allLessons.find((l) => l.status === "current") ?? openLessons[openLessons.length - 1] ?? allLessons[0];

  if (!currentLesson) {
    throw new NotFoundError("This course has no lessons yet");
  }

  return { courseTitle: course.title, modules, currentLesson };
}
