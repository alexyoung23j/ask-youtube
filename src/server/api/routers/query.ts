import { z } from "zod";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
} from "~/server/api/trpc";
import { ChatOpenAI } from "langchain/chat_models/openai";
import {
  RetrievalQAChain,
  loadQARefineChain,
  ConversationalRetrievalQAChain,
} from "langchain/chains";
import { HNSWLib } from "langchain/vectorstores/hnswlib";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { PineconeStore } from "langchain/vectorstores/pinecone";
import { TRPCError } from "@trpc/server";
import { getPineconeClient } from "~/server/db";
import { BufferMemory, ChatMessageHistory } from "langchain/memory";
import {
  HumanChatMessage,
  AIChatMessage,
  BaseChatMessage,
} from "langchain/schema";

export const queryRouter = createTRPCRouter({
  sendMessage: publicProcedure
    .input(z.object({ inputText: z.string(), url: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { inputText, url } = input;

      const video = await ctx.prisma.video.findFirst({
        where: {
          url: url,
        },
      });

      if (!video) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Unable to find transcript",
        });
      }

      // check if we have previous conversation history, if so, use it.

      const model = new ChatOpenAI({
        modelName: "gpt-3.5-turbo",
        streaming: true,
      });

      const pinecone = await getPineconeClient();
      const pineconeIndex = pinecone.Index(
        process.env.PINECONE_INDEX as string
      );
      const vectorStore = await PineconeStore.fromExistingIndex(
        new OpenAIEmbeddings(),
        { pineconeIndex }
      );

      const pastMessages: BaseChatMessage[] = [];

      const chain2 = ConversationalRetrievalQAChain.fromLLM(
        model,
        vectorStore.asRetriever(5, {
          url: url,
        }),
        {
          returnSourceDocuments: true,
          memory: new BufferMemory({
            chatHistory: new ChatMessageHistory(pastMessages),
            memoryKey: "chat_history", // Must be set to "chat_history",
            inputKey: "question", // The key for the input to the chain
            outputKey: "text", // The key for the final conversational output of the chain
            returnMessages: true, // If using with a chat model
          }),
        }
      );

      try {
        const results = await chain2.call({ question: inputText }, [
          {
            handleLLMNewToken(token: string) {
              // console.log(token);
              // TODO: Websockets streaming shit
            },
          },
        ]);
      } catch (e) {
        console.log("error", e);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Unable to get response",
        });
      }
    }),
});
