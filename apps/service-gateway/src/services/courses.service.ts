import { serverConfig } from "../config";
import { fetchWithTimeout, correlationHeaders } from "../utils/http-client.util";
import { BadGatewayError } from "@rv-lms/shared-utils";
import type { CourseDTO } from "@rv-lms/shared-types";
import { getUsersByIds } from "./users.service";

export interface AggregatedCourse {
  course_id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  difficulty: string;
  instructorName: string;
  total_lessons: number;
  total_duration_mins: number | null;
}

export interface CourseDetail {
  course_id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  difficulty: string;
  instructorName: string;
  modules: {
    module_id: string;
    title: string;
    is_locked: boolean;
    lessons: {
      lesson_id: string;
      title: string;
      is_preview: boolean;
      estimated_duration_mins: number | null;
      video_url: string | null;
      description: string | null;
      resources: { resource_id: string; title: string; pdf_url: string }[];
    }[];
  }[];
}

export interface AdminCourse {
  course_id: string;
  title: string;
  difficulty: string;
  status: string;
  is_published: boolean;
  instructorName: string;
  facultyCount: number;
}

export interface CourseFacultyRecord {
  course_id: string;
  faculty_id: string;
  tenant_id: string;
  role: string;
}

async function fetchCoursesFromService(accessToken?: string): Promise<CourseDTO[]> {
  const res = await fetchWithTimeout(`${serverConfig.SERVICE_COURSES_URL}/api/v1/courses`, {
    method: "GET",
     headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...correlationHeaders(),
    },
  });

  if (!res.ok) {
    throw new BadGatewayError(`service-courses returned ${res.status} for course list`);
  }

  const body = (await res.json()) as { success: boolean; data: CourseDTO[] };
  return body.data;
}

export async function listCourses(accessToken?: string): Promise<AggregatedCourse[]> {
  const courses = await fetchCoursesFromService(accessToken);

  const facultyIds = courses
    .flatMap((c) => c.faculty ?? [])
    .map((f) => f.faculty_id);

  const users = accessToken && facultyIds.length > 0
    ? await getUsersByIds(facultyIds, accessToken)
    : [];

  const nameById = new Map(users.map((u) => [u.user_id, `${u.first_name} ${u.last_name}`]));

  return courses.map((course) => {
    const firstFacultyId = course.faculty?.[0]?.faculty_id;
    const instructorName = firstFacultyId ? nameById.get(firstFacultyId) : undefined;

    return {
      course_id: course.course_id,
      title: course.title,
      description: course.description,
      thumbnail_url: course.thumbnail_url,
      difficulty: course.difficulty,
      instructorName: instructorName ?? "Unknown instructor",
      total_lessons: course.total_lessons ?? 0,
      total_duration_mins: course.total_duration_mins ?? null,
    };
  });
}

export async function getCourseDetail(course_id: string, accessToken?: string): Promise<CourseDetail | null> {
  const res = await fetchWithTimeout(`${serverConfig.SERVICE_COURSES_URL}/api/v1/courses/${course_id}`, {
    method: "GET",
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...correlationHeaders(),
    },
  });

  if (res.status === 404) {
    return null;
  }
  if (!res.ok) {
    throw new BadGatewayError(`service-courses returned ${res.status} for course detail`);
  }

  const body = (await res.json()) as { success: boolean; data: CourseDTO };
  const course = body.data;

  const facultyIds = (course.faculty ?? []).map((f) => f.faculty_id);
  const users = accessToken && facultyIds.length > 0
    ? await getUsersByIds(facultyIds, accessToken)
    : [];
  const nameById = new Map(users.map((u) => [u.user_id, `${u.first_name} ${u.last_name}`]));
  const firstFacultyId = course.faculty?.[0]?.faculty_id;
  const instructorName = firstFacultyId ? nameById.get(firstFacultyId) : undefined;

  return {
    course_id: course.course_id,
    title: course.title,
    description: course.description,
    thumbnail_url: course.thumbnail_url,
    difficulty: course.difficulty,
    instructorName: instructorName ?? "Unknown instructor",
    modules: (course.modules ?? []).map((m) => ({
      module_id: m.module_id,
      title: m.title,
      is_locked: m.is_locked,
         lessons: m.lessons.map((l) => ({
        lesson_id: l.lesson_id,
        title: l.title,
        is_preview: l.is_preview,
        estimated_duration_mins: l.estimated_duration_mins,
        video_url: l.content_metadata?.video_url ?? null,
        description: l.description,
        resources: (l.resources ?? []).map((r) => ({
          resource_id: r.resource_id,
          title: r.title,
          pdf_url: r.pdf_url,
        })),
      })),
    })),
  };
}

export async function listCoursesForAdmin(accessToken: string): Promise<AdminCourse[]> {
  const courses = await fetchCoursesFromService(accessToken);

  const facultyIds = courses.flatMap((c) => c.faculty ?? []).map((f) => f.faculty_id);
  const users = facultyIds.length > 0 ? await getUsersByIds(facultyIds, accessToken) : [];
  const nameById = new Map(users.map((u) => [u.user_id, `${u.first_name} ${u.last_name}`]));

  return courses.map((course) => {
    const facultyList = course.faculty ?? [];
    const firstFacultyId = facultyList[0]?.faculty_id;
    const instructorName = firstFacultyId ? nameById.get(firstFacultyId) : undefined;

    return {
      course_id: course.course_id,
      title: course.title,
      difficulty: course.difficulty,
      status: course.status,
      is_published: course.is_published,
      instructorName: instructorName ?? "Unassigned",
      facultyCount: facultyList.length,
    };
  });
}

export async function publishCourse(course_id: string, accessToken: string): Promise<void> {
  const res = await fetchWithTimeout(`${serverConfig.SERVICE_COURSES_URL}/api/v1/courses/${course_id}/publish`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...correlationHeaders(),
    },
  });

  if (!res.ok) {
    throw new BadGatewayError(`service-courses returned ${res.status} for publish`);
  }
}

export async function unpublishCourse(course_id: string, accessToken: string): Promise<void> {
  const res = await fetchWithTimeout(`${serverConfig.SERVICE_COURSES_URL}/api/v1/courses/${course_id}/unpublish`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...correlationHeaders(),
    },
  });

  if (!res.ok) {
    throw new BadGatewayError(`service-courses returned ${res.status} for unpublish`);
  }
}

export async function listCourseFaculty(course_id: string, accessToken: string): Promise<CourseFacultyRecord[]> {
  const res = await fetchWithTimeout(`${serverConfig.SERVICE_COURSES_URL}/api/v1/courses/${course_id}/faculty`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...correlationHeaders(),
    },
  });

  if (!res.ok) {
    throw new BadGatewayError(`service-courses returned ${res.status} for list faculty`);
  }

  const body = (await res.json()) as { success: boolean; data: CourseFacultyRecord[] };
  return body.data;
}

export async function assignCourseFaculty(
  course_id: string,
  faculty_id: string,
  accessToken: string
): Promise<void> {
  const res = await fetchWithTimeout(`${serverConfig.SERVICE_COURSES_URL}/api/v1/courses/${course_id}/faculty`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...correlationHeaders(),
    },
    body: JSON.stringify({ faculty_id }),
  });

  if (!res.ok) {
    throw new BadGatewayError(`service-courses returned ${res.status} for assign faculty`);
  }
}

export async function removeCourseFaculty(
  course_id: string,
  faculty_id: string,
  accessToken: string
): Promise<void> {
  const res = await fetchWithTimeout(
    `${serverConfig.SERVICE_COURSES_URL}/api/v1/courses/${course_id}/faculty/${faculty_id}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...correlationHeaders(),
      },
    }
  );

  if (!res.ok) {
    throw new BadGatewayError(`service-courses returned ${res.status} for remove faculty`);
  }
}