import { z } from "zod";

const ContentTypeEnum = z.enum(["VIDEO", "PDF", "LINK", "SLIDE", "QUIZ", "OTHER"]);
const ResourceTypeEnum = z.enum(["PDF", "SLIDE", "VIDEO", "LINK"]);

export const CreateLessonSchema = z.object({
    title: z.string().min(1, "Title is required").max(200),
    description: z.string().max(2000).optional(),
    content_type: ContentTypeEnum,
    order_index: z.number().int().positive().optional(),
    is_preview: z.boolean().default(false),
    estimated_duration_mins: z.number().int().positive().optional(),
});

export const UpdateLessonSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  content_type: ContentTypeEnum.optional(),
  order_index: z.number().int().positive().optional(),
  is_preview: z.boolean().optional(),
  estimated_duration_mins: z.number().int().positive().optional(),
});

export const AddResourceSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  resource_type: ResourceTypeEnum.default("PDF"),
  file_url: z
    .string()
    .trim()
    .url("Must be a valid URL")
    .max(2048)
    .refine((u) => u.startsWith("https://"), "Must be an https:// URL"),
});

export type CreateLessonInput = z.infer<typeof CreateLessonSchema>;
export type UpdateLessonInput = z.infer<typeof UpdateLessonSchema>;
export type AddResourceInput = z.infer<typeof AddResourceSchema>;