import { getMyEnrollments } from "./enrollment.service";
import { listCourses } from "./courses.service";

export interface DashboardCourse {
  course_id: string;
  title: string;
  thumbnail_url: string | null;
  difficulty: string;
  instructorName: string;
  status: "ACTIVE" | "COMPLETED" | "DROPPED";
  completedCount: number;
  totalLessons: number;
  progressPercent: number;
}

export interface DashboardData {
  inProgress: DashboardCourse[];
  completed: DashboardCourse[];
}

export async function getMyLearning(accessToken: string): Promise<DashboardData> {
  const [enrollments, courses] = await Promise.all([
    getMyEnrollments(accessToken),
    listCourses(accessToken),
  ]);

  const courseById = new Map(courses.map((c) => [c.course_id, c]));

  const merged: DashboardCourse[] = enrollments
    .filter((e) => e.status !== "DROPPED")
    .map((enrollment) => {
      const course = courseById.get(enrollment.course_id);
      const progressPercent =
        enrollment.totalLessons > 0
          ? Math.round((enrollment.completedCount / enrollment.totalLessons) * 100)
          : 0;

      return {
        course_id: enrollment.course_id,
        title: course?.title ?? "Course unavailable",
        thumbnail_url: course?.thumbnail_url ?? null,
        difficulty: course?.difficulty ?? "unknown",
        instructorName: course?.instructorName ?? "Unknown instructor",
        status: enrollment.status,
        completedCount: enrollment.completedCount,
        totalLessons: enrollment.totalLessons,
        progressPercent,
      };
    });

  return {
    inProgress: merged.filter((c) => c.status === "ACTIVE"),
    completed: merged.filter((c) => c.status === "COMPLETED"),
  };
}