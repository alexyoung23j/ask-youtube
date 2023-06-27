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
const BITCOIN_VIDEO_URL = "https://www.youtube.com/watch?v=bBC-nXj3Ng4";

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
        await ctx.prisma.userConnectedVideos.deleteMany({
          where: {
            videoUrl: videoUrl,
            userId: ctx.session.user?.id,
          },
        });
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
  getUserVideos: protectedProcedure.query(async ({ ctx }) => {
    const connectedVideos = await ctx.prisma.userConnectedVideos.findMany({
      where: {
        userId: ctx.session.user?.id,
      },
      include: {
        video: true,
      },
    });

    return connectedVideos.map((connectedVideo) => {
      return connectedVideo.video;
    });
  }),
  getDemoVideo: publicProcedure
    .input(z.object({ videoName: z.string() }))
    .query(async ({ ctx }) => {
      const demoVideo = await ctx.prisma.video.findFirst({
        where: {
          url: BITCOIN_VIDEO_URL,
        },
      });

      // Create a chat history for the demo video
      const chatHistory = await ctx.prisma.chatHistory.create({
        data: {
          videoUrl: BITCOIN_VIDEO_URL,
        },
      });

      return { video: demoVideo, generatedChatHistory: chatHistory };
    }),
});
