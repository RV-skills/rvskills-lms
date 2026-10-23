import { z } from "zod"; 

export const CreateModuleSchema = z.object({
    title: z.string().min(1, "Title is required").max(200),
    description: z.string().max(1000).optional(),
    order_index: z.number().int().positive().optional(),
    is_locked: z.boolean().default(false),
    unlock_after_days: z.number().int().min(0).max(3650).optional(),
});

export const UpdateModuleSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  order_index: z.number().int().positive().optional(),
  is_locked: z.boolean().optional(),
  unlock_after_days: z.number().int().min(0, "Can't be negative").max(3650).optional(),
});

export type CreateModuleInput = z.infer<typeof CreateModuleSchema>;
export type UpdateModuleInput = z.infer<typeof UpdateModuleSchema>;
