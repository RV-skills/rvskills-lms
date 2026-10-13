import { serverConfig } from "../config";
import { fetchWithTimeout, correlationHeaders, throwForFailedResponse } from "../utils/http-client.util";

async function forward<T>(
  path: string,
  method: string,
  accessToken: string,
  body?: unknown
): Promise<T> {
  const res = await fetchWithTimeout(`${serverConfig.SERVICE_ASSESSMENT_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...correlationHeaders(),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const responseBody = (await res.json()) as { success: boolean; message?: string; data?: T };

  if (!res.ok) {
    await throwForFailedResponse(res, `service-assessment returned ${res.status}`, responseBody);
  }

  return responseBody.data as T;
}

export const assessmentService = {
  createAssessment: (data: unknown, accessToken: string) =>
    forward("/api/v1/assessments", "POST", accessToken, data),

  addQuestion: (assessment_id: string, data: unknown, accessToken: string) =>
    forward(`/api/v1/assessments/${assessment_id}/questions`, "POST", accessToken, data),

  updateQuestion: (question_id: string, data: unknown, accessToken: string) =>
    forward(`/api/v1/assessments/questions/${question_id}`, "PATCH", accessToken, data),

  updateAssessment: (assessment_id: string, data: unknown, accessToken: string) =>
    forward(`/api/v1/assessments/${assessment_id}`, "PATCH", accessToken, data),

  deleteQuestion: (question_id: string, accessToken: string) =>
    forward(`/api/v1/assessments/questions/${question_id}`, "DELETE", accessToken),

  listAssessmentsForCourse: (course_id: string, accessToken: string) =>
    forward(`/api/v1/assessments/course/${course_id}`, "GET", accessToken),

  getAssessment: (assessment_id: string, accessToken: string) =>
    forward(`/api/v1/assessments/${assessment_id}`, "GET", accessToken),

  getResults: (assessment_id: string, accessToken: string) =>
    forward(`/api/v1/assessments/${assessment_id}/results`, "GET", accessToken),

  getAssessmentFull: (assessment_id: string, accessToken: string) =>
    forward(`/api/v1/assessments/${assessment_id}/full`, "GET", accessToken),

  startAttempt: (assessment_id: string, accessToken: string) =>
    forward(`/api/v1/assessments/${assessment_id}/attempts`, "POST", accessToken),

  submitAnswer: (attempt_id: string, data: unknown, accessToken: string) =>
    forward(`/api/v1/assessments/attempts/${attempt_id}/answers`, "POST", accessToken, data),

  submitAttempt: (attempt_id: string, accessToken: string) =>
    forward(`/api/v1/assessments/attempts/${attempt_id}/submit`, "POST", accessToken),

  listPendingReview: (accessToken: string) =>
    forward("/api/v1/assessments/attempts/pending-review", "GET", accessToken),

  pendingReviewSummary: (accessToken: string) =>
    forward("/api/v1/assessments/attempts/pending-review/summary", "GET", accessToken),

  listPendingReviewPage: (query: { assessment_id: string; offset: number; limit: number }, accessToken: string) =>
    forward(
      `/api/v1/assessments/attempts/pending-review?${new URLSearchParams({
        assessment_id: query.assessment_id,
        offset: String(query.offset),
        limit: String(query.limit),
      })}`,
      "GET",
      accessToken
    ),

  gradeAnswer: (answer_id: string, data: unknown, accessToken: string) =>
    forward(`/api/v1/assessments/attempts/answers/${answer_id}/grade`, "PATCH", accessToken, data),

  getMyAttempts: (assessment_id: string, accessToken: string) =>
    forward(`/api/v1/assessments/${assessment_id}/attempts/mine`, "GET", accessToken),
};