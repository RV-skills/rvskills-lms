import { z } from "zod";

export const UuidSchema = z.string().uuid();

export const MarkLessonCompleteSchema = z.object({
    enrollment_id: z.string().uuid("Invalid enrollment_id"),
    lesson_id: z.string().uuid("Invalid lesson_id")
});

export type MarkLessonCompleteSchema = z.infer<typeof MarkLessonCompleteSchema>;