import { describe, expect, it, vi } from "vitest";
import { computeFinalScore } from "../scoring.util";

vi.mock("../../generated/prisma/client", () => ({ Prisma: {} }));

function fakeTx(
  questions: { points: number }[],
  answers: { points_awarded: number | null }[]
) {
  return {
    question: { findMany: vi.fn().mockResolvedValue(questions) },
    answer: { findMany: vi.fn().mockResolvedValue(answers) },
  };
}

function score(tx: ReturnType<typeof fakeTx>, passMark = 70) {
  return computeFinalScore("asm-1", "att-1", passMark, tx as never);
}

describe("computeFinalScore", () => {
  it("gives 100% and a pass for full marks", async () => {
    const tx = fakeTx([{ points: 5 }], [{ points_awarded: 5 }]);

    await expect(score(tx)).resolves.toEqual({
      scorePercentage: 100,
      passed: true,
    });
  });

  it.each([
    { awarded: 2, total: 3, passMark: 67, percentage: 67, passed: true },
    { awarded: 2, total: 3, passMark: 68, percentage: 67, passed: false },
    { awarded: 1, total: 8, passMark: 70, percentage: 13, passed: false },
    { awarded: 7, total: 10, passMark: 70, percentage: 70, passed: true },
    { awarded: 0, total: 10, passMark: 0, percentage: 0, passed: true },
  ])(
    "awarding $awarded of $total points against a pass mark of $passMark gives $percentage percent",
    async ({ awarded, total, passMark, percentage, passed }) => {
      
      const tx = fakeTx([{ points: total }], [{ points_awarded: awarded }]);

      await expect(score(tx, passMark)).resolves.toEqual({
        scorePercentage: percentage,
        passed,
      });
    }
  );

  it("counts an answer that has no points yet (null) as zero", async () => {
    const tx = fakeTx(
      [{ points: 10 }],
      [{ points_awarded: null }, { points_awarded: 5 }]
    );

    await expect(score(tx)).resolves.toMatchObject({ scorePercentage: 50 });
  });

  it("adds up points across several questions and answers", async () => {
    const tx = fakeTx(
      [{ points: 2 }, { points: 3 }, { points: 5 }],
      [{ points_awarded: 2 }, { points_awarded: 0 }, { points_awarded: 5 }]
    );

    await expect(score(tx)).resolves.toEqual({
      scorePercentage: 70,
      passed: true,
    });
  });

  it("counts an unanswered question in the total", async () => {
    const tx = fakeTx(
      [{ points: 5 }, { points: 5 }],
      [{ points_awarded: 5 }]
    );

    await expect(score(tx)).resolves.toMatchObject({ scorePercentage: 50 });
  });

  it("scores an assessment with no points as 0%, passing only if the pass mark is 0", async () => {
    await expect(score(fakeTx([], []), 70)).resolves.toEqual({
      scorePercentage: 0,
      passed: false,
    });
    await expect(score(fakeTx([], []), 0)).resolves.toEqual({
      scorePercentage: 0,
      passed: true,
    });
  });

  it("only reads the given assessment's questions and the given attempt's answers", async () => {
    const tx = fakeTx([{ points: 1 }], [{ points_awarded: 1 }]);

    await score(tx);

    expect(tx.question.findMany).toHaveBeenCalledWith({
      where: { assessment_id: "asm-1" },
    });
    expect(tx.answer.findMany).toHaveBeenCalledWith({
      where: { attempt_id: "att-1" },
    });
  });
});