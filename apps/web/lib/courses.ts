import { gatewayFetch } from "./gateway-client";

export interface CourseListItem {
  course_id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  difficulty: string;
  instructorName: string;
}

export interface CourseFilters {
  search?: string;
  difficulty?: string;
}

export async function getCourses(filters: CourseFilters = {}): Promise<CourseListItem[]> {
  const allCourses = await gatewayFetch<CourseListItem[]>("/api/v1/courses");

  let results = allCourses;

  const trimmedSearch = filters.search?.trim();
  if (trimmedSearch) {
    const q = trimmedSearch.toLowerCase();
    results = results.filter((c) => c.title.toLowerCase().includes(q));
  }

  if (filters.difficulty) {
    results = results.filter((c) => c.difficulty === filters.difficulty);
  }

  return results;
}