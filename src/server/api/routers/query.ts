import { z } from "zod";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
} from "~/server/api/trpc";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { OpenAI } from "langchain/llms/openai";
import { PineconeStore } from "langchain/vectorstores/pinecone";

export const queryRouter = createTRPCRouter({
  ask: publicProcedure
    .input(z.object({ inputText: z.string(), url: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { inputText, url } = input;

      const pineconeIndex = ctx.pinecone.Index(process.env.PINECONE_INDEX!);

      const vectorStore = await PineconeStore.fromExistingIndex(
        new OpenAIEmbeddings(),
        { pineconeIndex }
      );

      const results = await vectorStore.similaritySearch(inputText, 1, {
        url: url,
      });
      console.log(results);

      return results;
    }),
});
