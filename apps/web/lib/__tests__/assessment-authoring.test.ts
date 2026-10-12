import { describe, expect, it, vi, beforeEach } from "vitest";
import { addQuestion, createAssessment, getAssessmentFull, updateQuestion } from "../assessment-authoring";
import { gatewayFetch } from "../gateway-client";

vi.mock("../gateway-client", async () => {
  const actual = await vi.importActual<typeof import("../gateway-client")>("../gateway-client");
  return { ...actual, gatewayFetch: vi.fn() };
});
const mockFetch = vi.mocked(gatewayFetch);

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockResolvedValue({} as never);
});

describe("assessment authoring calls", () => {
  it("getAssessmentFull reads the full view", async () => {
    await getAssessmentFull("asm-1");
    expect(mockFetch).toHaveBeenCalledWith("/api/v1/assessments/asm-1/full");
  });

  it("createAssessment posts the assessment", async () => {
    const input = { course_id: "c-1", title: "Quiz", passing_percentage: 60, max_attempts: 3 };
    await createAssessment(input);
    expect(mockFetch).toHaveBeenCalledWith("/api/v1/assessments", { method: "POST", body: JSON.stringify(input) });
  });

  it("addQuestion posts the question to its assessment", async () => {
    const q = { type: "MANUAL" as const, prompt: "Explain", points: 5, options: [] };
    await addQuestion("asm-1", q);
    expect(mockFetch).toHaveBeenCalledWith("/api/v1/assessments/asm-1/questions", { method: "POST", body: JSON.stringify(q) });
  });

  it("updateQuestion patches only what changed", async () => {
    await updateQuestion("q-1", { points: 3 });
    expect(mockFetch).toHaveBeenCalledWith("/api/v1/assessments/questions/q-1", { method: "PATCH", body: JSON.stringify({ points: 3 }) });
  });
});
