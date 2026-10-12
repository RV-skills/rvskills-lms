import { z } from "zod";

export const GradeAnswerSchema = z.object({
    is_correct: z.boolean(),
    points_awarded: z.number().int("Points must be a whole number").min(0, "Points can't be negative"),
});

export type GradeAnswerInput = z.infer<typeof GradeAnswerSchema>;
