import { gatewayFetch, GatewayError } from "./gateway-client";

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

export type CoursePlayerResult =
  | { status: "ok"; data: CoursePlayerData }
  | { status: "not_found" }
  | { status: "no_lessons" }
  | { status: "not_enrolled" };

export async function getCoursePlayerData(courseId: string): Promise<CoursePlayerResult> {
  try {
    const data = await gatewayFetch<CoursePlayerData>(`/api/v1/courses/${courseId}/player`);
    return { status: "ok", data };
  } catch (err) {
    if (err instanceof GatewayError) {
      if (err.statusCode === 404) {
        return err.message.toLowerCase().includes("no lessons")
          ? { status: "no_lessons" }
          : { status: "not_found" };
      }
      if (err.statusCode === 400) {
        return { status: "not_enrolled" };
      }
    }
    throw err;
  }
}