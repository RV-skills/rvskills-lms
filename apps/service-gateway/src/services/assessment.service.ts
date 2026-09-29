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

  listAssessmentsForCourse: (course_id: string, accessToken: string) =>
    forward(`/api/v1/assessments/course/${course_id}`, "GET", accessToken),

  getAssessment: (assessment_id: string, accessToken: string) =>
    forward(`/api/v1/assessments/${assessment_id}`, "GET", accessToken),

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

  gradeAnswer: (answer_id: string, data: unknown, accessToken: string) =>
    forward(`/api/v1/assessments/attempts/answers/${answer_id}/grade`, "PATCH", accessToken, data),

  getMyAttempts: (assessment_id: string, accessToken: string) =>
    forward(`/api/v1/assessments/${assessment_id}/attempts/mine`, "GET", accessToken),
};