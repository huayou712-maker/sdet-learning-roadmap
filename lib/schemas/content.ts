import { z } from "zod";
export const idSchema = z.string().regex(/^[a-z0-9][a-z0-9-]{0,100}$/);
export const stageSchema = z.string().regex(/^stage-(0[1-9]|10)$/);
export const noteInput = z
  .object({
    title: z.string().trim().min(1).max(160),
    stageId: stageSchema,
    topicIds: z.array(idSchema).max(150).default([]),
    tags: z.array(z.string().trim().min(1).max(32)).max(20).default([]),
    body: z.string().min(1).max(100000),
    status: z
      .enum(["planned", "in_progress", "completed"])
      .default("in_progress"),
    showInPortfolio: z.boolean().default(false),
    durationMinutes: z.number().int().min(0).max(1440).default(0),
    sha: z
      .string()
      .regex(/^[a-f0-9]{40}$/)
      .optional(),
    acknowledgedPublic: z.literal(true),
  })
  .strict();
export const metaSchema = noteInput
  .omit({ body: true, sha: true, acknowledgedPublic: true })
  .extend({
    id: idSchema,
    type: z.literal("note"),
    createdAt: z.string(),
    updatedAt: z.string(),
    deletedAt: z.string().nullable(),
  });
export type ContentMeta = z.infer<typeof metaSchema>;
export type Entry = ContentMeta & { body: string; path: string; sha: string };
export const progressInput = z
  .object({
    completed: z.boolean(),
    sha: z.string().regex(/^[a-f0-9]{40}$/),
    acknowledgedPublic: z.literal(true),
    evidence: z
      .array(
        z.object({
          type: z.enum(["note", "assignment", "project", "debug", "commit"]),
          id: z.string().min(1).max(100),
        }),
      )
      .max(30)
      .optional(),
  })
  .strict();
