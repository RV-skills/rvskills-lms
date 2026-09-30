import { describe, expect, it, vi, beforeEach } from "vitest";
import { listAssessmentsForCourse, getAssessment, startAttempt, submitAnswer, submitAttempt } from "../assessment";
import { gatewayFetch, GatewayError } from "../gateway-client";

vi.mock("../gateway-client", async () => {
  const actual = await vi.importActual<typeof import("../gateway-client")>("../gateway-client");
  return { ...actual, gatewayFetch: vi.fn() };
});
const mockFetch = vi.mocked(gatewayFetch);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listAssessmentsForCourse / getAssessment", () => {
  it("lists assessments for the course", async () => {
    mockFetch.mockResolvedValue([] as never);
    await listAssessmentsForCourse("course-1");
    expect(mockFetch).toHaveBeenCalledWith("/api/v1/assessments/course/course-1");
  });

  it("gets one assessment by id", async () => {
    mockFetch.mockResolvedValue({ assessment_id: "asm-1" } as never);
    await getAssessment("asm-1");
    expect(mockFetch).toHaveBeenCalledWith("/api/v1/assessments/asm-1");
  });
});

describe("startAttempt", () => {
  it("posts to the assessment's attempts endpoint and returns the new attempt", async () => {
    mockFetch.mockResolvedValue({ attempt_id: "att-1" } as never);

    await expect(startAttempt("asm-1")).resolves.toEqual({ attempt_id: "att-1" });
    expect(mockFetch).toHaveBeenCalledWith("/api/v1/assessments/asm-1/attempts", { method: "POST" });
  });

  it("propagates a GatewayError's own message so the caller can show it (e.g. max attempts used)", async () => {
    mockFetch.mockRejectedValue(new GatewayError("You have used all 3 allowed attempts", 409));

    await expect(startAttempt("asm-1")).rejects.toThrow("You have used all 3 allowed attempts");
  });
});

describe("submitAnswer / submitAttempt", () => {
  it("submitAnswer posts the question and response data", async () => {
    mockFetch.mockResolvedValue(undefined as never);
    const data = { question_id: "q-1", selected_option_id: "o-1" };

    await submitAnswer("att-1", data);

    expect(mockFetch).toHaveBeenCalledWith("/api/v1/assessments/attempts/att-1/answers", {
      method: "POST",
      body: JSON.stringify(data),
    });
  });

  it("submitAttempt posts to the submit endpoint and returns the graded attempt", async () => {
    mockFetch.mockResolvedValue({ attempt_id: "att-1", status: "GRADED" } as never);

    await expect(submitAttempt("att-1")).resolves.toEqual({ attempt_id: "att-1", status: "GRADED" });
    expect(mockFetch).toHaveBeenCalledWith("/api/v1/assessments/attempts/att-1/submit", { method: "POST" });
  });
});