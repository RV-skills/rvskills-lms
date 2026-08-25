import { z } from "zod";

export const EnrollCourseSchema = z.object({
    student_id: z.string().uuid("Invalid student_id"),
    course_id: z.string().uuid("Invalid course_id"),
});

export const BulkEnrollCourseSchema = z.object({
    course_id: z.string().uuid("Invalid course_id"),
    students: z
    .array(
        z.object({
            student_id: z.string().uuid("Invalid student_id"),
        })
    )
    .min(1, "At least one Student is required"),
});

export type EnrollCourseInput = z.infer<typeof EnrollCourseSchema>;
export type BulkEnrollCourseInput = z.infer<typeof BulkEnrollCourseSchema>;