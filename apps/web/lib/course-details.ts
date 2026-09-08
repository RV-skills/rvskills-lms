import { gatewayFetch, GatewayError } from "./gateway-client";

export interface LessonDetail {
  lesson_id: string;
  title: string;
  is_preview: boolean;
  estimated_duration_mins: number | null;
}

export interface ModuleDetail {
  module_id: string;
  title: string;
  is_locked: boolean;
  lessons: LessonDetail[];
}

export interface CourseDetail {
  course_id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  difficulty: string;
  instructorName: string;
  modules: ModuleDetail[];
}

export async function getCourseDetail(courseId: string): Promise<CourseDetail | null> {
  try {
    return await gatewayFetch<CourseDetail>(`/api/v1/courses/${courseId}`);
  } catch (err) {
    if (err instanceof GatewayError && err.statusCode === 404) {
      return null;
    }
    throw err;
  }
}

export function moduleDurationMins(module: ModuleDetail): number | null {
  const known = module.lessons
    .map((l) => l.estimated_duration_mins)
    .filter((mins): mins is number => mins !== null);
  return known.length > 0 ? known.reduce((sum, mins) => sum + mins, 0) : null;
}