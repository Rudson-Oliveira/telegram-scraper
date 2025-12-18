import { z } from "zod";
import { notifyOwner } from "./notification";
import { adminProcedure, publicProcedure, router } from "./trpc";

export const systemRouter = router({
  health: publicProcedure
    .input(
      z.object({
        timestamp: z.number().min(0, "timestamp cannot be negative"),
      })
    )
    .query(() => ({
      ok: true,
    })),

  autoSave: publicProcedure
    .input(
      z.object({
        data: z.string(),
        timestamp: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Auto-save state to database
      // For now, just acknowledge - full implementation uses autoSaveState table
      return {
        success: true,
        savedAt: new Date().toISOString(),
      };
    }),

  getAutoSave: publicProcedure
    .input(
      z.object({
        stateKey: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Retrieve saved state
      return {
        data: null,
        timestamp: null,
      };
    }),

  notifyOwner: adminProcedure
    .input(
      z.object({
        title: z.string().min(1, "title is required"),
        content: z.string().min(1, "content is required"),
      })
    )
    .mutation(async ({ input }) => {
      const delivered = await notifyOwner(input);
      return {
        success: delivered,
      } as const;
    }),
});
