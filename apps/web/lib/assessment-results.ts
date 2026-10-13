import { gatewayFetch } from "./gateway-client";

export type StudentStatus = "PASSED" | "NOT_PASSED" | "WAITING" | "IN_PROGRESS";

export interface AssessmentResults {
  assessment: {
    assessment_id: string;
    course_id: string;
    title: string;
    passing_percentage: number;
    max_attempts: number | null;
  };
  summary: {
    students_attempted: number;
    students_marked: number;
    waiting: number;
    average_best_score: number | null;
    pass_rate: number | null;
  };
  students: {
    student_id: string;
    student_name: string;
    attempts_used: number;
    best_score: number | null;
    status: StudentStatus;
    last_submitted_at: string | null;
  }[];
  questions: {
    question_id: string;
    prompt: string;
    type: "MCQ" | "MANUAL" | string;
    points: number;
    order_index: number;
    average_percentage: number | null;
  }[];
}

// Only the course's own faculty (or an admin) can read this.
export function getAssessmentResults(assessmentId: string): Promise<AssessmentResults> {
  return gatewayFetch<AssessmentResults>(`/api/v1/assessments/${assessmentId}/results`);
}

export const STATUS_LABEL: Record<StudentStatus, string> = {
  PASSED: "Passed",
  NOT_PASSED: "Not passed",
  WAITING: "Waiting for marking",
  IN_PROGRESS: "Not submitted",
};

function csvCell(value: string | number | null) {
  const s = value === null ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function resultsToCsv(r: AssessmentResults): string {
  const header = ["Student", "Attempts used", "Best score (%)", "Result", "Last submitted"];
  const rows = r.students.map((s) => [
    s.student_name,
    s.attempts_used,
    s.best_score,
    STATUS_LABEL[s.status],
    s.last_submitted_at ? new Date(s.last_submitted_at).toLocaleString() : null,
  ]);
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}
