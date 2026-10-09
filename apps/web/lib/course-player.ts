import { gatewayFetch, GatewayError } from "./gateway-client";

export type LessonContentType = "VIDEO" | "PDF" | "LINK" | "SLIDE" | "QUIZ" | "OTHER";
export type ResourceType = "VIDEO" | "PDF" | "LINK" | "SLIDE";

export interface PlayerResource {
  resource_id: string;
  title: string;
  resource_type: ResourceType;
  file_url: string;
}

export interface PlayerLesson {
  lesson_id: string;
  title: string;
  content_type: LessonContentType;
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
  | { status: "not_enrolled" }
  | { status: "unauthenticated" }
  | { status: "error" };

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
      if (err.statusCode === 401) {
        return { status: "unauthenticated" };
      }
    }
    // Gateway down, timed out, or an unexpected error: report it rather than crash the page.
    return { status: "error" };
  }
}

export async function markLessonComplete(courseId: string, lessonId: string): Promise<void> {
  await gatewayFetch(`/api/v1/courses/${courseId}/lessons/${lessonId}/complete`, {
    method: "POST",
  });
}