import { z } from "zod";

export const CreateCourseSchema = z.object({
    title: z.string().min(3, "Title must be at least 3 characters").max(200),
    description: z.string().max(2000).optional(),
    thumbnail_url: z.string().url("Invalid thumbnail url").optional(),
    language: z.string().default("en"),
    difficulty: z.enum(["beginner", "intermediate", "advanced"]).default("beginner"),
});

export const UpdateCourseSchema = z.object({
    title: z.string().min(3).max(200).optional(),
    description: z.string().max(2000).optional(),
    thumbnail_url: z.string().url().optional(),
    language: z.string().optional(),
    difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
});

export type CreateCourseInput = z.infer<typeof CreateCourseSchema>;
export type UpdateCourseInput = z.infer<typeof UpdateCourseSchema>;