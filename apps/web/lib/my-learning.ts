import { gatewayFetch } from "./gateway-client";

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

export async function getMyLearning(): Promise<DashboardData> {
  return gatewayFetch<DashboardData>("/api/v1/dashboard/my-learning");
}