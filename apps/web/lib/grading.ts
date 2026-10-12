import { gatewayFetch } from "./gateway-client";

export interface PendingAnswer {
  answer_id: string;
  text_response: string | null;
  selected_option_id: string | null;
  points_awarded: number | null;
  is_correct: boolean | null;
  question: { question_id: string; prompt: string; type: "MCQ" | "MANUAL" | string; points: number };
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

export function listPendingReview(): Promise<PendingAttempt[]> {
  return gatewayFetch<PendingAttempt[]>("/api/v1/assessments/attempts/pending-review");
}

export function gradeAnswer(answerId: string, grade: { is_correct: boolean; points_awarded: number }): Promise<unknown> {
  return gatewayFetch(`/api/v1/assessments/attempts/answers/${answerId}/grade`, {
    method: "PATCH",
    body: JSON.stringify(grade),
  });
}
