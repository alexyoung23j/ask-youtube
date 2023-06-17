import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

import axios from "axios";

export const transcriptionRouter = createTRPCRouter({
  startTranscriptionJob: publicProcedure
    .input(z.object({ url: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { url } = input;

      const existingVideo = await ctx.prisma.video.findFirst({
        where: {
          url: url,
        },
      });

      if (existingVideo) {
        // Handle differently
        console.log("video already exists in db");
        return;
      }

      try {
        void axios.post(process.env.CLOUD_FUNCTION_URL as string, { url: url });
        console.log("fired off transcription job", new Date());
      } catch (e) {
        console.log(e);
      }
    }),
});
