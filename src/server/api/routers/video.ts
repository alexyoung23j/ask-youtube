/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { TRPCError } from "@trpc/server";
import { StructuredOutputParser } from "langchain/output_parsers";
import { z } from "zod";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
} from "~/server/api/trpc";

export const videoRouter = createTRPCRouter({
  deleteVideo: protectedProcedure
    .input(z.object({ videoUrl: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { videoUrl } = input;

      const video = await ctx.prisma.video.findFirst({
        where: {
          url: videoUrl,
        },
      });

      if (!video) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "No Video",
        });
      }

      try {
        // Find all chat histories for this video and user
        await ctx.prisma.chatHistory.deleteMany({
          where: {
            videoUrl: videoUrl,
            userId: ctx.session.user?.id,
          },
        });
      } catch (e) {
        console.log(e);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Unable to delete chat histories",
        });
      }

      return true;
    }),
});
