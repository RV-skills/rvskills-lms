import type { CourseDTO } from "@rv-lms/shared-types";

export type CourseListItem = Pick<
    CourseDTO,
    "course_id" | "title" | "thumbnail_url" | "difficulty"
> & {
    instructorName: string;
};

export interface CourseFilters {
  search?: string;
  difficulty?: string;
}

const ALL_COURSES: CourseListItem[] = [
  { course_id: "1", title: "Intro to System Design", thumbnail_url: null, difficulty: "intermediate", instructorName: "Arpit Bhayani" },
  { course_id: "2", title: "Database Internals", thumbnail_url: null, difficulty: "advanced", instructorName: "Alex Petrov" },
  { course_id: "3", title: "Foundations of Distributed Systems", thumbnail_url: null, difficulty: "beginner", instructorName: "Martin Kleppmann" },
];

export async function getCourses(filters: CourseFilters = {}): Promise<CourseListItem[]> {
    let results = ALL_COURSES;

    const trimmedSearch = filters.search?.trim();
    if(trimmedSearch) {
        const q = trimmedSearch.toLowerCase();
        results = results.filter((c) => c.title.toLowerCase().includes(q));
    }

    if (filters.difficulty) {
        results = results.filter((c) => c.difficulty === filters.difficulty);
    }

    return results;
}