import type { CourseDTO, ModuleDTO, LessonDTO } from "@rv-lms/shared-types";

export type LessonSummary = Pick<LessonDTO, "lesson_id" | "title" | "is_preview" | "estimated_duration_mins">;

export type ModuleSummary = Pick<ModuleDTO, "module_id" | "title" | "is_locked"> & {
  lessons: LessonSummary[];
};

export type CourseDetail = Pick<
  CourseDTO,
  "course_id" | "title" | "description" | "thumbnail_url" | "difficulty"
> & {
  instructorName: string; // placeholder — same caveat as Course Card
  modules: ModuleSummary[];
};

const COURSE: CourseDetail = {
  course_id: "1",
  title: "Intro to System Design",
  description: "Master the fundamentals of scalable system architecture.",
  thumbnail_url: null,
  difficulty: "intermediate",
  instructorName: "Arpit Bhayani",
  modules: [
    {
      module_id: "m1",
      title: "Component composition",
      is_locked: false,
      lessons: [
        { lesson_id: "l1", title: "Composing with children", is_preview: true, estimated_duration_mins: 10 },
        { lesson_id: "l2", title: "Slots vs props", is_preview: false, estimated_duration_mins: 14 },
      ],
    },
    {
      module_id: "m2",
      title: "Scaling patterns",
      is_locked: true,
      lessons: [
        { lesson_id: "l3", title: "Load balancing strategies", is_preview: false, estimated_duration_mins: 12 },
      ],
    },
  ],
};

export function moduleDurationMins(module: ModuleSummary): number | null {
  const known = module.lessons
    .map((l) => l.estimated_duration_mins)
    .filter((mins): mins is number => mins !== null);
  return known.length > 0 ? known.reduce((sum, mins) => sum + mins, 0) : null;
}

export async function getCourseDetail(courseId: string): Promise<CourseDetail | null> {
  return courseId === COURSE.course_id ? COURSE : null;
}