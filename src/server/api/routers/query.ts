/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { StructuredOutputParser } from "langchain/output_parsers";
import { z } from "zod";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
} from "~/server/api/trpc";
import { removeOverlappingTimestamps } from "~/utils/helpers";

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
  createUserMessage: protectedProcedure
    .input(
      z.object({
        chatHistoryId: z.string(),
        message: z.string(),
        messageId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { chatHistoryId, message, messageId } = input;

      const chatHistory = await ctx.prisma.chatHistory.findFirst({
        where: {
          id: chatHistoryId,
          userId: ctx.session.user?.id,
        },
      });

      if (!chatHistory) {
        throw new Error("No chat history not found");
      }

      const newMessage = await ctx.prisma.message.create({
        data: {
          chatId: chatHistoryId,
          content: message,
          sender: "USER",
          id: messageId,
        },
      });

      if (!newMessage) {
        throw new Error("Failed to create message");
      }

      return newMessage;
    }),
  createAIMessage: protectedProcedure
    .input(
      z.object({
        chatHistoryId: z.string(),
        fullMessage: z.string().optional(),
        partialMessageContent: z.string().optional(),
        messageId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { chatHistoryId, fullMessage, partialMessageContent, messageId } =
        input;

      const chatHistory = await ctx.prisma.chatHistory.findFirst({
        where: {
          id: chatHistoryId,
          userId: ctx.session.user?.id,
        },
      });

      if (!chatHistory) {
        throw new Error("No chat history not found");
      }

      if (partialMessageContent) {
        const responseMessage = await ctx.prisma.message.create({
          data: {
            content: partialMessageContent,
            sender: "AI",
            videoTimestamps: [],
            chatId: chatHistory.id,
            id: messageId,
          },
        });

        console.log(responseMessage);
        return responseMessage;
      }

      if (!fullMessage) {
        throw new Error("No full message provided");
      }

      const parser = StructuredOutputParser.fromZodSchema(
        z.object({
          answer: z.string().describe("answer to the user's question"),
          usedTimestamps: z
            .array(z.number())
            .describe(
              "the timestamps of the documents actually used to answer the user's question. The timestamps are provided in the context."
            ),
        })
      );

      const parsedAnswer = await parser.parse(fullMessage);

      if (!parsedAnswer) {
        throw new Error("Failed to parse answer");
      }

      const timestamps = removeOverlappingTimestamps(
        parsedAnswer.usedTimestamps,
        30
      );

      const responseMessage = await ctx.prisma.message.create({
        data: {
          content: parsedAnswer.answer,
          sender: "AI",
          videoTimestamps: timestamps,
          chatId: chatHistory.id,
          id: messageId,
        },
      });

      console.log(responseMessage);
      return responseMessage;
    }),
});
