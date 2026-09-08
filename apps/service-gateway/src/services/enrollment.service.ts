import { serverConfig } from "../config";
import { fetchWithTimeout, correlationHeaders } from "../utils/http-client.util";
import { BadGatewayError } from "@rv-lms/shared-utils";

export interface EnrollmentRecord {
  enrollment_id: string;
  student_id: string;
  course_id: string;
  status: "ACTIVE" | "COMPLETED" | "DROPPED";
  enrolled_at: string;
  completedCount: number;
  totalLessons: number;
}

export async function getMyEnrollments(accessToken: string): Promise<EnrollmentRecord[]> {
  const res = await fetchWithTimeout(`${serverConfig.SERVICE_ENROLLMENT_URL}/api/v1/enrollments/my-enrollments`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...correlationHeaders(),
    },
  });

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