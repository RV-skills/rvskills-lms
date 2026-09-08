import { getCourseDetail } from "./courses.service";
import { getCompletedLessonIds } from "./enrollment.service";
import { NotFoundError } from "@rv-lms/shared-utils";

export interface PlayerLesson {
  lesson_id: string;
  title: string;
  estimated_duration_mins: number | null;
  status: "completed" | "current" | "upcoming";
}

export interface PlayerModule {
  module_id: string;
  title: string;
  lessons: PlayerLesson[];
}

export interface CoursePlayerData {
  courseTitle: string;
  modules: PlayerModule[];
  currentLesson: PlayerLesson;
}

export async function getCoursePlayerData(
  course_id: string,
  enrollment_id: string,
  accessToken: string
): Promise<CoursePlayerData | null> {
  const [course, completedIds] = await Promise.all([
    getCourseDetail(course_id, accessToken),
    getCompletedLessonIds(enrollment_id, accessToken),
  ]);

  if (!course) {
    return null;
  }

  const completedSet = new Set(completedIds);
  let foundCurrent = false;

  const modules: PlayerModule[] = course.modules.map((module) => ({
    module_id: module.module_id,
    title: module.title,
    lessons: module.lessons.map((lesson) => {
      const isCompleted = completedSet.has(lesson.lesson_id);
      let status: PlayerLesson["status"];

      if (isCompleted) {
        status = "completed";
      } else if (!foundCurrent) {
        status = "current";
        foundCurrent = true;
      } else {
        status = "upcoming";
      }

      return {
        lesson_id: lesson.lesson_id,
        title: lesson.title,
        estimated_duration_mins: lesson.estimated_duration_mins,
        status,
      };
    }),
  }));

  const allLessons = modules.flatMap((m) => m.lessons);
  const currentLesson = allLessons.find((l) => l.status === "current") ?? allLessons[0];

  if (!currentLesson) {
    throw new NotFoundError("This course has no lessons yet");
  }

  return { courseTitle: course.title, modules, currentLesson };
}