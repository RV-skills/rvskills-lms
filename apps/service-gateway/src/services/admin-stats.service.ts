import { listAllUsers } from "./users.service";
import { listCoursesForAdmin } from "./courses.service";

export interface PlatformStats {
  totalUsers: number;
  usersByRole: { role_name: string; count: number }[];
  totalCourses: number;
  publishedCourses: number;
  draftCourses: number;
  coursesWithNoFaculty: number;
  totalEnrollments: number;
}

export async function getPlatformStats(accessToken: string): Promise<PlatformStats> {
  const [usersResult, courses] = await Promise.all([
    listAllUsers(accessToken, undefined, { pageSize: 10000 }),
    listCoursesForAdmin(accessToken),
  ]);
  const users = usersResult.users;

  const roleCounts = new Map<string, number>();
  for (const user of users) {
    for (const ur of user.user_roles) {
      roleCounts.set(ur.role.role_name, (roleCounts.get(ur.role.role_name) ?? 0) + 1);
    }
  }

  const totalEnrollments = courses.reduce((sum, c) => sum + c.enrollmentCount, 0);

  return {
    totalUsers: users.length,
    usersByRole: Array.from(roleCounts.entries()).map(([role_name, count]) => ({ role_name, count })),
    totalCourses: courses.length,
    publishedCourses: courses.filter((c) => c.is_published).length,
    draftCourses: courses.filter((c) => !c.is_published).length,
    coursesWithNoFaculty: courses.filter((c) => c.facultyCount === 0).length,
    totalEnrollments,
  };
}