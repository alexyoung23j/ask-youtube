import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

import axios from "axios";
import { parseYouTubeURL } from "~/utils/helpers";
import { TRPCError } from "@trpc/server";

export const transcriptionRouter = createTRPCRouter({
  startTranscriptionJob: publicProcedure
    .input(z.object({ url: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { url } = input;

      let parsedUrl;

      try {
        parsedUrl = parseYouTubeURL(url);
      } catch (e) {
        console.log(e);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Invalid url",
        });
      }

      const existingVideo = await ctx.prisma.video.findFirst({
        where: {
          url: parsedUrl,
        },
      });

      if (existingVideo) {
        // Handle differently
        const existingUserVideoConnection =
          await ctx.prisma.userConnectedVideos.findFirst({
            where: {
              userId: ctx.session?.user?.id,
              videoUrl: existingVideo.url,
            },
          });

        if (!existingUserVideoConnection) {
          // Create connection
          await ctx.prisma.userConnectedVideos.create({
            data: {
              userId: ctx.session?.user?.id as string,
              videoUrl: existingVideo.url,
            },
          });
        }
        return existingVideo;
      }

      const newVideo = await ctx.prisma.video.create({
        data: {
          url: parsedUrl,
        },
      });

      try {
        // Create connection
        await ctx.prisma.userConnectedVideos.create({
          data: {
            userId: ctx.session?.user?.id as string,
            videoUrl: newVideo.url,
          },
        });
        void axios.post(process.env.CLOUD_FUNCTION_URL as string, {
          url: parsedUrl,
        });
        console.log("fired off transcription job", new Date());
        return newVideo;
      } catch (e) {
        console.log(e);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Unable to make transcription request",
        });
      }
    }),
});
