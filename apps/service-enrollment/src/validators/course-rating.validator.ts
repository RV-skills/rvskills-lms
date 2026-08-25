import { z } from "zod";

export const SubmitRatingSchema = z.object({
    stars: z.number().int().min(1, "Stars must be atleast 1").max(5, "Stars must be at most 5"),
    comment: z.string().max(1000).optional(),
});

export const UpdateRatingSchema = z.object({
    stars: z.number().int().min(1).max(5).optional(),
    comment: z.string().max(1000).optional(),
});

export type SubmitRatingInput = z.infer<typeof SubmitRatingSchema>;
export type UpdateRatingInput = z.infer<typeof UpdateRatingSchema>;