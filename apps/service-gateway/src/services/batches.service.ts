import { serverConfig } from "../config";
import { fetchWithTimeout, correlationHeaders, throwForFailedResponse } from "../utils/http-client.util";
import { NotFoundError } from "@rv-lms/shared-utils";
import { getCourseDetail } from "./courses.service";
import { getUsersByIds } from "./users.service";
import { isOpen, moduleUnlockDate, type BatchSchedule } from "../utils/release-schedule";

export interface BatchRecord extends BatchSchedule {
  course_id: string;
  student_count: number;
}

interface RosterRow {
  enrollment_id: string;
  student_id: string;
  batch_id: string | null;
  status: string;
  enrolled_at: string;
}

export interface CourseSchedule {
  course_id: string;
  courseTitle: string;
  modules: { module_id: string; title: string; unlock_after_days: number }[];
  batches: (BatchRecord & {
    modules: { module_id: string; unlock_date: string; overridden: boolean; is_open: boolean }[];
  })[];
  students: {
    enrollment_id: string;
    student_id: string;
    name: string;
    username: string | null;
    batch_id: string | null;
    enrolled_at: string;
  }[];
}

async function enrollmentRequest<T>(path: string, method: string, accessToken: string, body?: object): Promise<T> {
  const res = await fetchWithTimeout(`${serverConfig.SERVICE_ENROLLMENT_URL}/api/v1/enrollments/courses${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...correlationHeaders(),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const parsed = (await res.json().catch(() => undefined)) as
    | { success: boolean; message?: string; errors?: unknown; data?: T }
    | undefined;

  if (!res.ok) {
    await throwForFailedResponse(res, `service-enrollment returned ${res.status} for ${method} ${path}`, parsed);
  }

  return parsed?.data as T;
}

// Everything the schedule page needs in one call: the course's modules and their day
// offsets, each batch with the real date of every module, and who is in which batch.
export async function getCourseSchedule(course_id: string, accessToken: string): Promise<CourseSchedule> {
  // The batch call checks the caller may manage this course, so it fails first for anyone else.
  const [batches, roster, course] = await Promise.all([
    enrollmentRequest<BatchRecord[]>(`/${course_id}/batches`, "GET", accessToken),
    enrollmentRequest<RosterRow[]>(`/${course_id}/roster`, "GET", accessToken),
    getCourseDetail(course_id, accessToken),
  ]);

  if (!course) {
    throw new NotFoundError("Course not found");
  }

  const users = await getUsersByIds(
    roster.map((r) => r.student_id),
    accessToken
  );
  const userById = new Map(users.map((u) => [u.user_id, u]));
  const now = new Date();

  return {
    course_id,
    courseTitle: course.title,
    modules: course.modules.map((m) => ({
      module_id: m.module_id,
      title: m.title,
      unlock_after_days: m.unlock_after_days,
    })),
    batches: batches.map((b) => ({
      ...b,
      modules: course.modules.map((m) => {
        const { date, overridden } = moduleUnlockDate(b, m.module_id, m.unlock_after_days);
        return { module_id: m.module_id, unlock_date: date, overridden, is_open: isOpen(date, now) };
      }),
    })),
    students: roster.map((r) => {
      const u = userById.get(r.student_id) as
        | { first_name: string; last_name: string; username?: string }
        | undefined;
      return {
        enrollment_id: r.enrollment_id,
        student_id: r.student_id,
        name: u ? `${u.first_name} ${u.last_name}` : "Unknown student",
        username: u?.username ?? null,
        batch_id: r.batch_id,
        enrolled_at: r.enrolled_at,
      };
    }),
  };
}

export function createBatch(course_id: string, data: object, accessToken: string) {
  return enrollmentRequest<BatchRecord>(`/${course_id}/batches`, "POST", accessToken, data);
}

export function updateBatch(course_id: string, batch_id: string, data: object, accessToken: string) {
  return enrollmentRequest<BatchRecord>(`/${course_id}/batches/${batch_id}`, "PATCH", accessToken, data);
}

export async function deleteBatch(course_id: string, batch_id: string, accessToken: string): Promise<void> {
  await enrollmentRequest<void>(`/${course_id}/batches/${batch_id}`, "DELETE", accessToken);
}

export function setBatchModuleDate(
  course_id: string,
  batch_id: string,
  module_id: string,
  unlock_date: string,
  accessToken: string
) {
  return enrollmentRequest<BatchRecord>(`/${course_id}/batches/${batch_id}/modules/${module_id}`, "PUT", accessToken, {
    unlock_date,
  });
}

export function clearBatchModuleDate(course_id: string, batch_id: string, module_id: string, accessToken: string) {
  return enrollmentRequest<BatchRecord>(`/${course_id}/batches/${batch_id}/modules/${module_id}`, "DELETE", accessToken);
}

export function setStudentBatch(course_id: string, enrollment_id: string, batch_id: string | null, accessToken: string) {
  return enrollmentRequest<{ enrollment_id: string; batch_id: string | null }>(
    `/${course_id}/enrollments/${enrollment_id}/batch`,
    "PATCH",
    accessToken,
    { batch_id }
  );
}
