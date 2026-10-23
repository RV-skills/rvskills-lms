import { z } from "zod";

// A calendar date, e.g. "2026-11-01". Dates are days in India time, not instants.
const calendarDate = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use the format YYYY-MM-DD")
    .refine((s) => {
        const d = new Date(`${s}T00:00:00Z`);
        return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
    }, "Not a real date");

export const CreateBatchSchema = z
    .object({
        name: z.string().trim().min(1, "Name is required").max(120),
        start_date: calendarDate,
        end_date: calendarDate.nullable().optional(),
    })
    .refine((b) => !b.end_date || b.end_date >= b.start_date, {
        message: "End date can't be before the start date",
        path: ["end_date"],
    });

export const UpdateBatchSchema = z
    .object({
        name: z.string().trim().min(1, "Name is required").max(120).optional(),
        start_date: calendarDate.optional(),
        end_date: calendarDate.nullable().optional(),
    })
    .refine((b) => Object.keys(b).length > 0, "Nothing to update");

export const ModuleDateSchema = z.object({
    unlock_date: calendarDate,
});

export const EnrollmentBatchSchema = z.object({
    batch_id: z.string().uuid("Invalid batch_id").nullable(),
});

export const AddToRosterSchema = z.object({
    student_ids: z.array(z.string().uuid("Invalid student_id")).min(1, "No students to add").max(1000),
    batch_id: z.string().uuid("Invalid batch_id").nullable().optional(),
});

export type CreateBatchInput = z.infer<typeof CreateBatchSchema>;
export type UpdateBatchInput = z.infer<typeof UpdateBatchSchema>;
