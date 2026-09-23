import { gatewayFetch, GatewayError } from "./gateway-client";

export interface CourseRating {
  rating_id: string;
  enrollment_id: string;
  course_id: string;
  stars: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
}

export interface AverageRating {
  average: number | null;
  count: number;
}

export async function getCourseRatings(courseId: string): Promise<CourseRating[]> {
  return gatewayFetch<CourseRating[]>(`/api/v1/courses/${courseId}/ratings`);
}

export async function getAverageRating(courseId: string): Promise<AverageRating> {
  return gatewayFetch<AverageRating>(`/api/v1/courses/${courseId}/ratings/average`);
}

export type SubmitRatingResult =
  | { status: "ok"; data: CourseRating }
  | { status: "not_available"; message: string };

export async function submitRating(
  courseId: string,
  data: { stars: number; comment?: string }
): Promise<SubmitRatingResult> {
  try {
    const result = await gatewayFetch<CourseRating>(`/api/v1/courses/${courseId}/ratings`, {
      method: "POST",
      body: JSON.stringify(data),
    });
    return { status: "ok", data: result };
  } catch (err) {
    if (err instanceof GatewayError) {
      return { status: "not_available", message: err.message };
    }
    throw err;
  }
}