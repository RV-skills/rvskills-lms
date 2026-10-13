import { gatewayFetch } from "./gateway-client";

export interface PendingAnswer {
  answer_id: string;
  text_response: string | null;
  selected_option_id: string | null;
  points_awarded: number | null;
  is_correct: boolean | null;
  feedback: string | null;
  question: { question_id: string; prompt: string; type: "MCQ" | "MANUAL" | string; points: number; order_index?: number };
}

export interface PendingAttempt {
  attempt_id: string;
  student_id: string;
  student_name: string;
  attempt_number: number;
  submitted_at: string | null;
  assessment: { assessment_id: string; title: string; course_id: string };
  answers: PendingAnswer[];
}

export interface PendingSummary {
  assessment_id: string;
  title: string;
  course_id: string | null;
  waiting: number;
  oldest_submitted_at: string | null;
}

export const PAGE_SIZE = 20;

// One row per assessment that has attempts waiting, longest-waiting first.
export function getPendingSummary(): Promise<PendingSummary[]> {
  return gatewayFetch<PendingSummary[]>("/api/v1/assessments/attempts/pending-review/summary");
}

// One page of a single assessment's queue, oldest submission first.
export function listPendingForAssessment(assessmentId: string, offset = 0, limit = PAGE_SIZE): Promise<PendingAttempt[]> {
  const q = new URLSearchParams({ assessment_id: assessmentId, offset: String(offset), limit: String(limit) });
  return gatewayFetch<PendingAttempt[]>(`/api/v1/assessments/attempts/pending-review?${q}`);
}

// Every waiting attempt across all assessments (older callers).
export function listPendingReview(): Promise<PendingAttempt[]> {
  return gatewayFetch<PendingAttempt[]>("/api/v1/assessments/attempts/pending-review");
}

export function gradeAnswer(
  answerId: string,
  grade: { is_correct: boolean; points_awarded: number; feedback?: string | null }
): Promise<unknown> {
  return gatewayFetch(`/api/v1/assessments/attempts/answers/${answerId}/grade`, {
    method: "PATCH",
    body: JSON.stringify(grade),
  });
}
