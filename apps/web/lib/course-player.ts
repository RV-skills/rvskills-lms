import type { LessonDTO, ModuleDTO } from "@rv-lms/shared-types";

export type PlayerLesson = Pick<LessonDTO, "lesson_id" | "title" | "estimated_duration_mins"> & {
  status: "completed" | "current" | "upcoming";
};

export type PlayerModule = Pick<ModuleDTO, "module_id" | "title"> & {
  lessons: PlayerLesson[];
};

export interface CoursePlayerData {
  courseTitle: string;
  modules: PlayerModule[];
  currentLesson: PlayerLesson;
}

const MODULES: PlayerModule[] = [
  {
    module_id: "m1",
    title: "Component composition",
    lessons: [
      { lesson_id: "l1", title: "Composing with children", estimated_duration_mins: 10, status: "completed" },
      { lesson_id: "l2", title: "Slots vs props", estimated_duration_mins: 14, status: "completed" },
    ],
  },
  {
    module_id: "m2",
    title: "Scaling patterns",
    lessons: [
      { lesson_id: "l3", title: "Load balancing strategies", estimated_duration_mins: 12, status: "current" },
      { lesson_id: "l4", title: "Caching patterns", estimated_duration_mins: 15, status: "upcoming" },
    ],
  },
];

export async function getCoursePlayerData(courseId: string): Promise<CoursePlayerData | null> {
  if (courseId !== "1") return null;

  const allLessons = MODULES.flatMap((m) => m.lessons);
  const currentLesson = allLessons.find((l) => l.status === "current") ?? allLessons[0];

  return {
    courseTitle: "Intro to System Design",
    modules: MODULES,
    currentLesson,
  };
}