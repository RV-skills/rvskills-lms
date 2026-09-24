import { serverConfig } from "../config";
import { fetchWithTimeout, correlationHeaders } from "../utils/http-client.util";
import { BadGatewayError, ConflictError, NotFoundError, ValidationError } from "@rv-lms/shared-utils";

export interface EnrollmentRecord {
  enrollment_id: string;
  student_id: string;
  course_id: string;
  status: "ACTIVE" | "COMPLETED" | "DROPPED";
  enrolled_at: string;
  completedCount: number;
  totalLessons: number;
}

export interface EnrollCourseInput {
  course_id: string;
}

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

export async function enrollInCourse(course_id: string, accessToken: string): Promise<EnrollmentRecord> {
  const res = await fetchWithTimeout(`${serverConfig.SERVICE_ENROLLMENT_URL}/api/v1/enrollments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...correlationHeaders(),
    },
    body: JSON.stringify({ course_id }),
  });

  const body = (await res.json()) as { success: boolean; message?: string; data?: EnrollmentRecord };

  if (!res.ok) {
    if (res.status === 409) {
      throw new ConflictError(body.message ?? "You are already enrolled in this course");
    }
    if (res.status === 400) {
      throw new ValidationError(body.message ?? "Unable to enroll in this course");
    }
    throw new BadGatewayError(`service-enrollment returned ${res.status} for enroll`);
  }

  return body.data as EnrollmentRecord;
}

export async function getMyEnrollments(accessToken: string): Promise<EnrollmentRecord[]> {
  const res = await fetchWithTimeout(`${serverConfig.SERVICE_ENROLLMENT_URL}/api/v1/enrollments/my-enrollments`, 
    {
        method: "GET",
        headers: {
        Authorization: `Bearer ${accessToken}`,
        ...correlationHeaders(),
        },
    }
  );

  if (!res.ok) {
    throw new BadGatewayError(`service-enrollment returned ${res.status} for my-enrollments`);
  }

  const body = (await res.json()) as { success: boolean; data: EnrollmentRecord[] };
  return body.data;
}

export async function getCompletedLessonIds(enrollment_id: string, accessToken: string): Promise<string[]> {
  const res = await fetchWithTimeout(
    `${serverConfig.SERVICE_ENROLLMENT_URL}/api/v1/enrollments/${enrollment_id}/completed-lessons`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...correlationHeaders(),
      },
    }
  );

  if (!res.ok) {
    throw new BadGatewayError(`service-enrollment returned ${res.status} for completed lessons`);
  }

  const body = (await res.json()) as { success: boolean; data: string[] };
  return body.data;
}

export async function listCourseRatings(course_id: string): Promise<CourseRating[]> {
  const res = await fetchWithTimeout(
    `${serverConfig.SERVICE_ENROLLMENT_URL}/api/v1/enrollments/courses/${course_id}/ratings`,
    { method: "GET", headers: { ...correlationHeaders() } }
  );

  if (!res.ok) {
    throw new BadGatewayError(`service-enrollment returned ${res.status} for course ratings`);
  }

  const body = (await res.json()) as { success: boolean; data: CourseRating[] };
  return body.data;
}

export async function getAverageRating(course_id: string): Promise<AverageRating> {
  const res = await fetchWithTimeout(
    `${serverConfig.SERVICE_ENROLLMENT_URL}/api/v1/enrollments/courses/${course_id}/ratings/average`,
    { method: "GET", headers: { ...correlationHeaders() } }
  );

  if (!res.ok) {
    throw new BadGatewayError(`service-enrollment returned ${res.status} for average rating`);
  }

  const body = (await res.json()) as { success: boolean; data: AverageRating };
  return body.data;
}

export async function submitRating(
  course_id: string,
  data: { stars: number; comment?: string },
  accessToken: string
): Promise<CourseRating> {
  const enrollments = await getMyEnrollments(accessToken);
  const enrollment = enrollments.find((e) => e.course_id === course_id);
  if (!enrollment) {
    throw new ValidationError("You must be enrolled in this course to rate it");
  }

  const res = await fetchWithTimeout(
    `${serverConfig.SERVICE_ENROLLMENT_URL}/api/v1/enrollments/${enrollment.enrollment_id}/rating`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        ...correlationHeaders(),
      },
      body: JSON.stringify(data),
    }
  );

  const body = (await res.json()) as { success: boolean; message?: string; data?: CourseRating };

  if (!res.ok) {
    if (res.status === 409) {
      throw new ConflictError(body.message ?? "You have already rated this course");
    }
    if (res.status === 400) {
      throw new ValidationError(body.message ?? "Unable to submit rating");
    }
    throw new BadGatewayError(`service-enrollment returned ${res.status} for rating submission`);
  }

  return body.data as CourseRating;
}

export async function updateRating(
  course_id: string,
  data: { stars?: number; comment?: string },
  accessToken: string
): Promise<CourseRating> {
  const enrollments = await getMyEnrollments(accessToken);
  const enrollment = enrollments.find((e) => e.course_id === course_id);
  if (!enrollment) {
    throw new ValidationError("You must be enrolled in this course to rate it");
  }

  const res = await fetchWithTimeout(
    `${serverConfig.SERVICE_ENROLLMENT_URL}/api/v1/enrollments/${enrollment.enrollment_id}/rating`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        ...correlationHeaders(),
      },
      body: JSON.stringify(data),
    }
  );

  const body = (await res.json()) as { success: boolean; message?: string; data?: CourseRating };

  if (!res.ok) {
    if (res.status === 404) {
      throw new NotFoundError(body.message ?? "Rating not found");
    }
    if (res.status === 400) {
      throw new ValidationError(body.message ?? "Unable to update rating");
    }
    throw new BadGatewayError(`service-enrollment returned ${res.status} for rating update`);
  }

  return body.data as CourseRating;
}

export async function markLessonComplete(
  course_id: string,
  lesson_id: string,
  accessToken: string
): Promise<void> {
  const enrollments = await getMyEnrollments(accessToken);
  const enrollment = enrollments.find((e) => e.course_id === course_id);
  if (!enrollment) {
    throw new ValidationError("You are not enrolled in this course");
  }

  const res = await fetchWithTimeout(
    `${serverConfig.SERVICE_ENROLLMENT_URL}/api/v1/enrollments/${enrollment.enrollment_id}/lessons/${lesson_id}/complete`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...correlationHeaders(),
      },
    }
  );

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    if (res.status === 400) {
      throw new ValidationError(body.message ?? "Unable to mark this lesson complete");
    }
    throw new BadGatewayError(`service-enrollment returned ${res.status} for mark-complete`);
  }
}