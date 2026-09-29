import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import {
  startAttemptController,
  submitAnswerController,
  submitAttemptController,
  getMyAttemptsController,
} from "../attempt.controller";
import { attemptService } from "../../services/attempt.service";

vi.mock("../../services/attempt.service", () => ({
  attemptService: {
    startAttempt: vi.fn(),
    submitAnswer: vi.fn(),
    submitAttempt: vi.fn(),
    getMyAttempts: vi.fn(),
  },
}));

const svc = vi.mocked(attemptService);

const STUDENT = { user_id: "s-1", tenant_id: "tenant-1", roles: ["Student"], permissions: [] };

function fakeRes() {
  const res = { status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  return res as unknown as Response;
}

function fakeReq(overrides: Partial<AuthenticatedRequest> = {}): AuthenticatedRequest {
  return {
    body: {},
    params: {},
    headers: {},
    user: STUDENT,
    ...overrides,
  } as unknown as AuthenticatedRequest;
}

const next = vi.fn() as unknown as NextFunction;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("startAttemptController", () => {
  it("passes the assessment id, the student, their tenant, and their own auth header, and responds 201", async () => {
    svc.startAttempt.mockResolvedValue({ attempt_id: "att-1" } as never);
    const req = fakeReq({
      params: { assessment_id: "asm-1" },
      headers: { authorization: "Bearer student-token" },
    });
    const res = fakeRes();

    await startAttemptController(req, res, next);

    expect(svc.startAttempt).toHaveBeenCalledWith(
      "asm-1",
      "s-1",
      "tenant-1",
      "Bearer student-token"
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { attempt_id: "att-1" } });
  });

  it("passes a service error (e.g. attempt limit reached) to next", async () => {
    svc.startAttempt.mockRejectedValue(new Error("attempts exhausted"));
    const req = fakeReq({ params: { assessment_id: "asm-1" } });
    const res = fakeRes();

    await startAttemptController(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe("submitAnswerController", () => {
  it("passes the attempt id, the student, and the answer body through", async () => {
    svc.submitAnswer.mockResolvedValue({ answer_id: "a-1" } as never);
    const req = fakeReq({
      params: { attempt_id: "att-1" },
      body: { question_id: "q-1", selected_option_id: "o-1" },
    });
    const res = fakeRes();

    await submitAnswerController(req, res, next);

    expect(svc.submitAnswer).toHaveBeenCalledWith("att-1", "s-1", {
      question_id: "q-1",
      selected_option_id: "o-1",
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe("submitAttemptController", () => {
  it("passes the attempt id and the student, and responds 200", async () => {
    svc.submitAttempt.mockResolvedValue({ attempt_id: "att-1", status: "GRADED" } as never);
    const req = fakeReq({ params: { attempt_id: "att-1" } });
    const res = fakeRes();

    await submitAttemptController(req, res, next);

    expect(svc.submitAttempt).toHaveBeenCalledWith("att-1", "s-1");
  });
});

describe("getMyAttemptsController", () => {
  it("lists the student's own attempts for the assessment", async () => {
    svc.getMyAttempts.mockResolvedValue([{ attempt_id: "att-1" }] as never);
    const req = fakeReq({ params: { assessment_id: "asm-1" } });
    const res = fakeRes();

    await getMyAttemptsController(req, res, next);

    expect(svc.getMyAttempts).toHaveBeenCalledWith("asm-1", "s-1");
  });
});