import { serverConfig } from "../config";
import { fetchWithTimeout, correlationHeaders } from "../utils/http-client.util";
import {
  BadGatewayError,
  ValidationError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
} from "@rv-lms/shared-utils";

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
    const message = responseBody.message ?? `service-assessment returned ${res.status}`;
    switch (res.status) {
      case 400:
        throw new ValidationError(message);
      case 403:
        throw new ForbiddenError(message);
      case 404:
        throw new NotFoundError(message);
      case 409:
        throw new ConflictError(message);
      default:
        throw new BadGatewayError(message);
    }
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
};