import { z } from "zod"; 

export const CreateModuleSchema = z.object({
    title: z.string().min(1, "Title is required").max(200),
    description: z.string().max(1000).optional(),
    order_index: z.number().int().positive().optional(),
    is_locked: z.boolean().default(false),
});

export const UpdateModuleSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  order_index: z.number().int().positive().optional(),
  is_locked: z.boolean().optional(),
});

export type CreateModuleInput = z.infer<typeof CreateModuleSchema>;
export type UpdateModuleInput = z.infer<typeof UpdateModuleSchema>;