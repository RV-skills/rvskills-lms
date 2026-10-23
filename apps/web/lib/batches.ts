import { gatewayFetch } from "./gateway-client";

export interface ScheduleModule {
  module_id: string;
  title: string;
  unlock_after_days: number;
}

export interface BatchModuleDate {
  module_id: string;
  unlock_date: string;
  overridden: boolean;
  is_open: boolean;
}

export interface ScheduleBatch {
  batch_id: string;
  course_id: string;
  name: string;
  start_date: string;
  end_date: string | null;
  student_count: number;
  modules: BatchModuleDate[];
}

export interface ScheduleStudent {
  enrollment_id: string;
  student_id: string;
  name: string;
  username: string | null;
  batch_id: string | null;
  enrolled_at: string;
}

export interface CourseSchedule {
  course_id: string;
  courseTitle: string;
  modules: ScheduleModule[];
  batches: ScheduleBatch[];
  students: ScheduleStudent[];
}

const base = (courseId: string) => `/api/v1/courses/${courseId}`;

export function getCourseSchedule(courseId: string): Promise<CourseSchedule> {
  return gatewayFetch<CourseSchedule>(`${base(courseId)}/schedule`);
}

export async function setModuleOffset(courseId: string, moduleId: string, unlock_after_days: number): Promise<void> {
  await gatewayFetch(`${base(courseId)}/modules/${moduleId}`, {
    method: "PATCH",
    body: JSON.stringify({ unlock_after_days }),
  });
}

export async function createBatch(
  courseId: string,
  data: { name: string; start_date: string; end_date?: string | null }
): Promise<void> {
  await gatewayFetch(`${base(courseId)}/batches`, { method: "POST", body: JSON.stringify(data) });
}

export async function updateBatch(
  courseId: string,
  batchId: string,
  data: { name?: string; start_date?: string; end_date?: string | null }
): Promise<void> {
  await gatewayFetch(`${base(courseId)}/batches/${batchId}`, { method: "PATCH", body: JSON.stringify(data) });
}

export async function deleteBatch(courseId: string, batchId: string): Promise<void> {
  await gatewayFetch(`${base(courseId)}/batches/${batchId}`, { method: "DELETE" });
}

export async function setBatchModuleDate(
  courseId: string,
  batchId: string,
  moduleId: string,
  unlock_date: string
): Promise<void> {
  await gatewayFetch(`${base(courseId)}/batches/${batchId}/modules/${moduleId}`, {
    method: "PUT",
    body: JSON.stringify({ unlock_date }),
  });
}

export async function clearBatchModuleDate(courseId: string, batchId: string, moduleId: string): Promise<void> {
  await gatewayFetch(`${base(courseId)}/batches/${batchId}/modules/${moduleId}`, { method: "DELETE" });
}

export async function setStudentBatch(courseId: string, enrollmentId: string, batchId: string | null): Promise<void> {
  await gatewayFetch(`${base(courseId)}/enrollments/${enrollmentId}/batch`, {
    method: "PATCH",
    body: JSON.stringify({ batch_id: batchId }),
  });
}

// Today's date in India, e.g. "2026-11-15". Used for "Unlock now".
export function todayInIndia(now: Date = new Date()): string {
  return new Date(now.getTime() + 330 * 60 * 1000).toISOString().slice(0, 10);
}

// "2026-11-15" -> "15 Nov 2026"
export function formatDay(day: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
