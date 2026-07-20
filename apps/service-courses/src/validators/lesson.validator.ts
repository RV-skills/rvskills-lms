import { z } from "zod";

const ContentTypeEnum = z.enum(["VIDEO", "PDF", "LINK", "SLIDE", "QUIZ", "OTHER"]);

export const CreateLessonSchema = z.object({
    title: z.string().min(1, "Title is required").max(200),
    content_type: ContentTypeEnum,
    order_index: z.number().int().positive().optional(),
    is_preview: z.boolean().default(false),
    estimated_duration_mins: z.number().int().positive().optional(),
});

export const UpdateLessonSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content_type: ContentTypeEnum.optional(),
  order_index: z.number().int().positive().optional(),
  is_preview: z.boolean().optional(),
  estimated_duration_mins: z.number().int().positive().optional(),
});

export type CreateLessonInput = z.infer<typeof CreateLessonSchema>;
export type UpdateLessonInput = z.infer<typeof UpdateLessonSchema>;