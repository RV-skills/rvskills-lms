import { z } from "zod";

export const GradeAnswerSchema = z.object({
    is_correct: z.boolean(),
    points_awarded: z.number().int("Points must be a whole number").min(0, "Points can't be negative"),
    // Optional comment for the student. Blank text clears it.
    feedback: z
        .string()
        .trim()
        .max(2000, "Feedback can be at most 2000 characters")
        .nullable()
        .optional()
        .transform((v) => (v ? v : null)),
});

export type GradeAnswerInput = z.infer<typeof GradeAnswerSchema>;
