import { z } from "zod";

export const CreateAssessmentSchema = z.object({
    course_id: z.string().trim().min(1, "course_id is required"),
    title: z.string().trim().min(1, "Title is required").max(200),
    passing_percentage: z.number().int().min(0).max(100),
    max_attempts: z.number().int().positive().nullable().optional(),
});

const Prompt = z.string().trim().min(1, "Question text is required").max(2000);
const Points = z.number().int("Points must be a whole number").min(1).max(100).optional();

export const AddQuestionSchema = z.discriminatedUnion("type", [
    z.object({
        type: z.literal("MCQ"),
        prompt: Prompt,
        points: Points,
        options: z
            .array(z.object({ text: z.string().trim().min(1).max(500), is_correct: z.boolean() }))
            .min(2, "MCQ questions need at least 2 options")
            .max(10),
    }),
    z.object({
        type: z.literal("MANUAL"),
        prompt: Prompt,
        points: Points,
        options: z.array(z.any()).max(0, "Written questions don't have options").default([]),
    }),
]);

export const UpdateQuestionSchema = z
    .object({ prompt: Prompt.optional(), points: Points })
    .refine((d) => d.prompt !== undefined || d.points !== undefined, "Nothing to update");

export type CreateAssessmentInput = z.infer<typeof CreateAssessmentSchema>;
export type AddQuestionInput = z.infer<typeof AddQuestionSchema>;
export type UpdateQuestionInput = z.infer<typeof UpdateQuestionSchema>;
