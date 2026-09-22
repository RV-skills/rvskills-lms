import { gatewayFetch, GatewayError } from "./gateway-client";

export interface AssessmentSummary {
  assessment_id: string;
  course_id: string;
  title: string;
  passing_percentage: number;
  max_attempts: number | null;
}

export interface QuestionOption {
  option_id: string;
  text: string;
}

export interface AssessmentQuestion {
  question_id: string;
  type: "MCQ" | "MANUAL";
  prompt: string;
  points: number;
  order_index: number;
  options: QuestionOption[];
}

export interface AssessmentDetail {
  assessment_id: string;
  course_id: string;
  title: string;
  passing_percentage: number;
  max_attempts: number | null;
  questions: AssessmentQuestion[];
}

export interface Attempt {
  attempt_id: string;
  assessment_id: string;
  attempt_number: number;
  status: "IN_PROGRESS" | "SUBMITTED" | "PENDING_REVIEW" | "GRADED";
  score_percentage: number | null;
  passed: boolean | null;
}

export async function listAssessmentsForCourse(courseId: string): Promise<AssessmentSummary[]> {
  return gatewayFetch<AssessmentSummary[]>(`/api/v1/assessments/course/${courseId}`);
}

export async function getAssessment(assessmentId: string): Promise<AssessmentDetail> {
  return gatewayFetch<AssessmentDetail>(`/api/v1/assessments/${assessmentId}`);
}

export async function startAttempt(assessmentId: string): Promise<Attempt> {
  try {
    return await gatewayFetch<Attempt>(`/api/v1/assessments/${assessmentId}/attempts`, {
      method: "POST",
    });
  } catch (err) {
    if (err instanceof GatewayError) {
      throw err; // let the caller read err.message (e.g. "not enrolled", "max attempts used")
    }
    throw err;
  }
}

export async function submitAnswer(
  attemptId: string,
  data: { question_id: string; selected_option_id?: string; text_response?: string }
): Promise<void> {
  await gatewayFetch(`/api/v1/assessments/attempts/${attemptId}/answers`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function submitAttempt(attemptId: string): Promise<Attempt> {
  return gatewayFetch<Attempt>(`/api/v1/assessments/attempts/${attemptId}/submit`, {
    method: "POST",
  });
}