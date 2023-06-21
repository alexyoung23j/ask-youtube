/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { z } from "zod";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
} from "~/server/api/trpc";

export const chatRouter = createTRPCRouter({
  createChatHistory: protectedProcedure
    .input(z.object({ videoUrl: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { videoUrl } = input;

      const chatHistory = await ctx.prisma.chatHistory.create({
        data: {
          videoUrl,
          userId: ctx.session.user?.id,
        },
      });

      return chatHistory;
    }),
  getChatHistories: protectedProcedure.query(async ({ input, ctx }) => {
    const chatHistories = await ctx.prisma.chatHistory.findMany({
      where: {
        userId: ctx.session.user?.id,
      },
      include: {
        video: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return chatHistories;
  }),
  checkTranscriptionStatus: protectedProcedure
    .input(z.object({ chatHistoryId: z.string() }))
    .query(async ({ input, ctx }) => {
      const { chatHistoryId } = input;

      const chatHistory = await ctx.prisma.chatHistory.findFirst({
        where: {
          id: chatHistoryId,
          userId: ctx.session.user?.id,
        },
      });

      if (!chatHistory) {
        throw new Error("No chat history not found");
      }

      const video = await ctx.prisma.video.findFirst({
        where: {
          url: chatHistory.videoUrl,
        },
      });

      if (!video) {
        return false;
      }

      return video.transcription !== undefined && video.transcription !== null;
    }),
  getChatHistory: protectedProcedure
    .input(z.object({ chatHistoryId: z.string() }))
    .query(async ({ input, ctx }) => {
      const { chatHistoryId } = input;

      const chatHistory = await ctx.prisma.chatHistory.findFirst({
        where: {
          id: chatHistoryId,
          userId: ctx.session.user?.id,
        },
        include: {
          messages: {
            orderBy: {
              createdAt: "asc",
            },
          },
          video: true,
        },
      });

      if (!chatHistory) {
        throw new Error("No chat history not found");
      }

      return chatHistory;
    }),
});
