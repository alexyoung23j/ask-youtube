import { exampleRouter } from "~/server/api/routers/example";
import { createTRPCRouter } from "~/server/api/trpc";
import { transcriptionRouter } from "./routers/transcribe";
import { queryRouter } from "./routers/query";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  example: exampleRouter,
  transcribe: transcriptionRouter,
  query: queryRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
