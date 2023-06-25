import { createTRPCRouter } from "~/server/api/trpc";
import { transcriptionRouter } from "./routers/transcribe";
import { chatRouter } from "./routers/query";
import { videoRouter } from "./routers/video";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  transcribe: transcriptionRouter,
  chat: chatRouter,
  video: videoRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
