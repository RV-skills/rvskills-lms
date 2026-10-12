import { gatewayFetch } from "./gateway-client";

export interface AuthoringOption {
  option_id: string;
  text: string;
  is_correct: boolean;
}

export interface AuthoringQuestion {
  question_id: string;
  type: "MCQ" | "MANUAL";
  prompt: string;
  points: number;
  order_index: number;
  is_locked: boolean;
  options: AuthoringOption[];
}

export interface AuthoringAssessment {
  assessment_id: string;
  course_id: string;
  title: string;
  passing_percentage: number;
  max_attempts: number | null;
  questions: AuthoringQuestion[];
}

export interface NewQuestion {
  type: "MCQ" | "MANUAL";
  prompt: string;
  points: number;
  options: { text: string; is_correct: boolean }[];
}

// Includes the correct answers, so the backend only returns it to the course's own faculty.
export function getAssessmentFull(assessmentId: string): Promise<AuthoringAssessment> {
  return gatewayFetch<AuthoringAssessment>(`/api/v1/assessments/${assessmentId}/full`);
}

export function createAssessment(input: {
  course_id: string;
  title: string;
  passing_percentage: number;
  max_attempts: number | null;
}): Promise<{ assessment_id: string }> {
  return gatewayFetch(`/api/v1/assessments`, { method: "POST", body: JSON.stringify(input) });
}

export function addQuestion(assessmentId: string, question: NewQuestion): Promise<AuthoringQuestion> {
  return gatewayFetch(`/api/v1/assessments/${assessmentId}/questions`, {
    method: "POST",
    body: JSON.stringify(question),
  });
}

export function updateQuestion(questionId: string, change: { prompt?: string; points?: number }): Promise<AuthoringQuestion> {
  return gatewayFetch(`/api/v1/assessments/questions/${questionId}`, {
    method: "PATCH",
    body: JSON.stringify(change),
  });
}
