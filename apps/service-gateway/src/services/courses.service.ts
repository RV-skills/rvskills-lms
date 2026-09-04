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
    };
  });
}