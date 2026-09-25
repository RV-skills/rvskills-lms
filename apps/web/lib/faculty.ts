import { gatewayFetch, GatewayError } from "./gateway-client";

export interface MyCourse {
  course_id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  difficulty: string;
  status: string;
  is_published: boolean;
}

export interface FacultyLesson {
  lesson_id: string;
  module_id: string;
  title: string;
  description: string | null;
  content_type: string;
  order_index: number;
  is_preview: boolean;
  estimated_duration_mins: number | null;
}

export interface FacultyModule {
  module_id: string;
  course_id: string;
  title: string;
  description: string | null;
  order_index: number;
  is_locked: boolean;
  lessons: FacultyLesson[];
}

export interface FacultyCourseDetail {
  course_id: string;
  title: string;
  description: string | null;
  difficulty: string;
  is_published: boolean;
  status: string;
  modules: FacultyModule[];
}


export async function listMyCourses(): Promise<MyCourse[]> {
  return gatewayFetch<MyCourse[]>("/api/v1/courses/mine");
}

export async function createCourse(data: {
  title: string;
  description?: string;
  difficulty?: string;
}): Promise<MyCourse> {
  return gatewayFetch<MyCourse>("/api/v1/courses", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getFacultyCourseDetail(courseId: string): Promise<FacultyCourseDetail | null> {
  try {
    return await gatewayFetch<FacultyCourseDetail>(`/api/v1/courses/${courseId}`);
  } catch (err) {
    if (err instanceof GatewayError && err.statusCode === 404) {
      return null;
    }
    throw err;
  }
}

export async function createModule(courseId: string, data: { title: string; description?: string }): Promise<FacultyModule> {
  return gatewayFetch<FacultyModule>(`/api/v1/courses/${courseId}/modules`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateModule(courseId: string, moduleId: string, data: { title?: string; description?: string; is_locked?: boolean }): Promise<FacultyModule> {
  return gatewayFetch<FacultyModule>(`/api/v1/courses/${courseId}/modules/${moduleId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteModule(courseId: string, moduleId: string): Promise<void> {
  await gatewayFetch(`/api/v1/courses/${courseId}/modules/${moduleId}`, { method: "DELETE" });
}

export async function createLesson(
  courseId: string,
  moduleId: string,
  data: { title: string; description?: string; content_type: string; is_preview?: boolean; estimated_duration_mins?: number }
): Promise<FacultyLesson> {
  return gatewayFetch<FacultyLesson>(`/api/v1/courses/${courseId}/modules/${moduleId}/lessons`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateLesson(
  courseId: string,
  moduleId: string,
  lessonId: string,
  data: { title?: string; description?: string; content_type?: string; is_preview?: boolean; estimated_duration_mins?: number }
): Promise<FacultyLesson> {
  return gatewayFetch<FacultyLesson>(`/api/v1/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteLesson(courseId: string, moduleId: string, lessonId: string): Promise<void> {
  await gatewayFetch(`/api/v1/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}`, { method: "DELETE" });
}