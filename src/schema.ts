import { z } from "zod";

export const ActionCategorySchema = z.enum(["nutrition", "movement", "sleep", "stress", "hydration"]);

export const NBASchema = z.object({
    message: z.string(),
    metadata: z.object({
        action_category: ActionCategorySchema,
        action_summary: z.string(),
        biomarker_targeted: z.string(),
        chaos_adjusted: z.boolean(),
        identity_anchor_used: z.boolean(),
        difficulty_level: z.enum(["easy", "medium", "hard"]),
        estimated_minutes: z.number(),
    }),
});

export const EveningCheckInSchema = z.object({
    message: z.string(),
    action_taken: z.boolean(),
    coach_note: z.string().optional(),
});

export const WeeklySummarySchema = z.object({
    message: z.string(),
});

export const EvalResultSchema = z.object({
    pass: z.boolean(),
    critique: z.string(),
});
