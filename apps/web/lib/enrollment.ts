import { gatewayFetch, GatewayError } from "./gateway-client";

export interface EnrollmentRecord {
  enrollment_id: string;
  student_id: string;
  course_id: string;
  status: "ACTIVE" | "COMPLETED" | "DROPPED";
  enrolled_at: string;
}

export type EnrollResult =
  | { status: "ok"; data: EnrollmentRecord }
  | { status: "already_enrolled" }
  | { status: "not_available"; message: string };

export async function enrollInCourse(courseId: string): Promise<EnrollResult> {
  try {
    const data = await gatewayFetch<EnrollmentRecord>(`/api/v1/enrollments`, {
      method: "POST",
      body: JSON.stringify({ course_id: courseId }),
    });
    return { status: "ok", data };
  } catch (err) {
    if (err instanceof GatewayError) {
      if (err.statusCode === 409) {
        return { status: "already_enrolled" };
      }
      if (err.statusCode === 400) {
        return { status: "not_available", message: err.message };
      }
    }
    throw err;
  }
}