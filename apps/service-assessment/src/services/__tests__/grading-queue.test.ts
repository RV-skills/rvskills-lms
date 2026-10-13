import { beforeEach, describe, expect, it, vi } from "vitest";
import { gradingService } from "../grading.service";
import { courseServiceClient } from "../../clients/course-service.client";
import { attemptRepository } from "../../repositories/attempt.repository";
import { assessmentRepository } from "../../repositories/assessment.repository";
import { PendingPageQuerySchema } from "../../validators/grading.validator";

vi.mock("../../clients/course-service.client", () => ({
  courseServiceClient: { listMyCourseIds: vi.fn(), canEditCourse: vi.fn() },
}));
vi.mock("../../repositories/attempt.repository", () => ({
  attemptRepository: { countPendingByAssessment: vi.fn(), findPendingReviewPage: vi.fn() },
}));
vi.mock("../../repositories/assessment.repository", () => ({
  assessmentRepository: { findManyByIds: vi.fn(), findById: vi.fn() },
}));
vi.mock("../../repositories/answer.repository", () => ({ answerRepository: {} }));
vi.mock("../../repositories/question.repository", () => ({ questionRepository: {} }));
vi.mock("../../db/prisma", () => ({ prisma: {} }));

const faculty = { isAdmin: false, authHeader: "Bearer f" };
const admin = { isAdmin: true, authHeader: "Bearer a" };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(courseServiceClient.listMyCourseIds).mockResolvedValue(["c1"] as never);
});

describe("gradingService.pendingReviewSummary", () => {
  it("counts waiting attempts per assessment, longest-waiting first, with titles", async () => {
    vi.mocked(attemptRepository.countPendingByAssessment).mockResolvedValue([
      { assessment_id: "a2", _count: { _all: 3 }, _min: { submitted_at: new Date("2026-10-10") } },
      { assessment_id: "a1", _count: { _all: 5 }, _min: { submitted_at: new Date("2026-10-01") } },
    ] as never);
    vi.mocked(assessmentRepository.findManyByIds).mockResolvedValue([
      { assessment_id: "a1", title: "Quiz 1", course_id: "c1" },
      { assessment_id: "a2", title: "Quiz 2", course_id: "c1" },
    ] as never);

    const result = await gradingService.pendingReviewSummary("t1", faculty);

    expect(attemptRepository.countPendingByAssessment).toHaveBeenCalledWith("t1", ["c1"]);
    expect(result.map((r) => [r.title, r.waiting])).toEqual([["Quiz 1", 5], ["Quiz 2", 3]]);
  });

  it("looks across every course for admins", async () => {
    vi.mocked(attemptRepository.countPendingByAssessment).mockResolvedValue([] as never);
    await gradingService.pendingReviewSummary("t1", admin);
    expect(courseServiceClient.listMyCourseIds).not.toHaveBeenCalled();
    expect(attemptRepository.countPendingByAssessment).toHaveBeenCalledWith("t1", null);
  });

  it("returns nothing for faculty with no courses, without querying", async () => {
    vi.mocked(courseServiceClient.listMyCourseIds).mockResolvedValue([] as never);
    await expect(gradingService.pendingReviewSummary("t1", faculty)).resolves.toEqual([]);
    expect(attemptRepository.countPendingByAssessment).not.toHaveBeenCalled();
  });
});

describe("gradingService.listPendingReviewPage", () => {
  it("passes the faculty's courses and the page through", async () => {
    vi.mocked(attemptRepository.findPendingReviewPage).mockResolvedValue([{ attempt_id: "x" }] as never);
    const page = { assessment_id: "a1", skip: 20, take: 20 };
    await expect(gradingService.listPendingReviewPage("t1", faculty, page)).resolves.toEqual([{ attempt_id: "x" }]);
    expect(attemptRepository.findPendingReviewPage).toHaveBeenCalledWith("t1", ["c1"], page);
  });
});

describe("PendingPageQuerySchema", () => {
  it("defaults to the first 20 and caps the page size", () => {
    expect(PendingPageQuerySchema.parse({ assessment_id: "a1" })).toEqual({ assessment_id: "a1", offset: 0, limit: 20 });
    expect(PendingPageQuerySchema.safeParse({ assessment_id: "a1", limit: "500" }).success).toBe(false);
    expect(PendingPageQuerySchema.parse({ assessment_id: "a1", offset: "40", limit: "10" })).toEqual({ assessment_id: "a1", offset: 40, limit: 10 });
  });
});
