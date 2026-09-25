import { gatewayFetch } from "./gateway-client";

export interface MyCourse {
  course_id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  difficulty: string;
  status: string;
  is_published: boolean;
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