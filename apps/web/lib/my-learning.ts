import type { CourseListItem } from "./courses";

export interface MyLearningCourse extends CourseListItem {
    progress: number;
}

const MY_COURSES: MyLearningCourse[] = [
  { course_id: "1", title: "Intro to System Design", description: null, thumbnail_url: null, difficulty: "intermediate", instructorName: "Arpit Bhayani", progress: 62 },
  { course_id: "2", title: "Database Internals", description: null, thumbnail_url: null, difficulty: "advanced", instructorName: "Alex Petrov", progress: 24 },
  { course_id: "4", title: "Foundations of Distributed Systems", description: null, thumbnail_url: null, difficulty: "beginner", instructorName: "Martin Kleppmann", progress: 100 },
];

export async function getMyLearning(): Promise<{ inProgress: MyLearningCourse[]; completed: MyLearningCourse[] }> {
    return {
        inProgress: MY_COURSES.filter((c) => c.progress < 100),
        completed: MY_COURSES.filter((c) => c.progress === 100),
    };
}