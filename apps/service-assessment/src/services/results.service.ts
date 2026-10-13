import { ForbiddenError, NotFoundError } from "@rv-lms/shared-utils";
import { courseServiceClient } from "../clients/course-service.client";
import { assessmentRepository } from "../repositories/assessment.repository";
import { attemptRepository } from "../repositories/attempt.repository";
import { questionRepository } from "../repositories/question.repository";

type AttemptRow = Awaited<ReturnType<typeof attemptRepository.findAllForAssessment>>[number];

export const resultsService = {
    // One assessment's results for its own faculty: a row per student, overall
    // figures, and how well each question went (hardest first).
    async getResults(assessment_id: string, authHeader: string) {
        const assessment = await assessmentRepository.findById(assessment_id);
        if (!assessment) {
            throw new NotFoundError("Assessment not found");
        }
        const allowed = await courseServiceClient.canEditCourse(assessment.course_id, authHeader);
        if (!allowed) {
            throw new ForbiddenError("You do not teach this course, so you cannot see its results");
        }

        const [attempts, questions] = await Promise.all([
            attemptRepository.findAllForAssessment(assessment_id),
            questionRepository.findByAssessmentId(assessment_id),
        ]);
        return buildResults(assessment, questions, attempts);
    },
};

export function buildResults(
    assessment: { assessment_id: string; course_id: string; title: string; passing_percentage: number; max_attempts: number | null },
    questions: { question_id: string; prompt: string; type: string; points: number; order_index: number }[],
    attempts: AttemptRow[]
) {
    const byStudent = new Map<string, AttemptRow[]>();
    for (const a of attempts) {
        byStudent.set(a.student_id, [...(byStudent.get(a.student_id) ?? []), a]);
    }

    const students = [...byStudent.entries()].map(([student_id, list]) => {
        const graded = list.filter((a) => a.status === "GRADED");
        const best = graded.reduce<number | null>((top, a) => Math.max(top ?? 0, a.score_percentage ?? 0), null);
        const submitted = list.map((a) => a.submitted_at).filter((d): d is Date => d !== null);
        const status = graded.some((a) => a.passed)
            ? "PASSED"
            : list.some((a) => a.status === "PENDING_REVIEW")
              ? "WAITING"
              : graded.length > 0
                ? "NOT_PASSED"
                : "IN_PROGRESS";
        return {
            student_id,
            attempts_used: list.length,
            best_score: best,
            status,
            last_submitted_at: submitted.length ? new Date(Math.max(...submitted.map((d) => d.getTime()))) : null,
        };
    });

    const gradedStudents = students.filter((s) => s.best_score !== null);
    const gradedAttempts = attempts.filter((a) => a.status === "GRADED");

    const questionStats = questions
        .map((q) => {
            const awarded = gradedAttempts.reduce(
                (sum, a) => sum + (a.answers.find((x) => x.question_id === q.question_id)?.points_awarded ?? 0),
                0
            );
            const possible = gradedAttempts.length * q.points;
            return {
                question_id: q.question_id,
                prompt: q.prompt,
                type: q.type,
                points: q.points,
                order_index: q.order_index,
                average_percentage: possible > 0 ? Math.round((awarded / possible) * 100) : null,
            };
        })
        .sort((a, b) => (a.average_percentage ?? 101) - (b.average_percentage ?? 101));

    return {
        assessment: {
            assessment_id: assessment.assessment_id,
            course_id: assessment.course_id,
            title: assessment.title,
            passing_percentage: assessment.passing_percentage,
            max_attempts: assessment.max_attempts,
        },
        summary: {
            students_attempted: students.length,
            students_marked: gradedStudents.length,
            waiting: attempts.filter((a) => a.status === "PENDING_REVIEW").length,
            average_best_score: gradedStudents.length
                ? Math.round(gradedStudents.reduce((n, s) => n + (s.best_score ?? 0), 0) / gradedStudents.length)
                : null,
            pass_rate: gradedStudents.length
                ? Math.round((students.filter((s) => s.status === "PASSED").length / gradedStudents.length) * 100)
                : null,
        },
        students,
        questions: questionStats,
    };
}
