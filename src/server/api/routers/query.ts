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
  ConversationChain,
  LLMChain,
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
import {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  MessagesPlaceholder,
  PromptTemplate,
  SystemMessagePromptTemplate,
} from "langchain/prompts";

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

      const model = new ChatOpenAI({
        modelName: "gpt-4",
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

      // check if we have previous conversation history, if so, use it.
      const pastMessages: BaseChatMessage[] = [
        new HumanChatMessage("Who was the original kim?"),
        new AIChatMessage("Kim il sung was the leader of north korea"),
      ];

      // Use this previous history with the new question to formulate a standalone question
      const PROMPT = `The following is a friendly conversation between a human and an AI. The AI is talkative and provides lots of specific details from its context. 
            If the AI does not know the answer to a question, it truthfully says it does not know.           
            Current conversation:
            {history}
            
            In addition, use the following pieces of context, along with your general knowledge of the subject as an extremely intelligent,
            unbiased, and well informed person, to answer the users question if appropriate. 
            If you don't know the answer, just say that the video doesn't provide a good answer, don't try to make up an answer.
            ----------------
            {context}
             
            All inputs should be related to the documents or the previous conversation. Answer the question in a way that makes sense in the context of the conversation.
            Do not answer generically- you can assume that the human is asking a question that is related to the context provided or the chat history. 

            Human Question: {input}
            AI Answer:`;

      const chatPrompt = ChatPromptTemplate.fromPromptMessages([
        SystemMessagePromptTemplate.fromTemplate(PROMPT),
        HumanMessagePromptTemplate.fromTemplate("{input}"),
      ]);

      const chain = new ConversationChain({
        llm: model,
        memory: new BufferMemory({
          chatHistory: new ChatMessageHistory(pastMessages),
          inputKey: "history",
        }),
        // verbose: true,
        prompt: chatPrompt,
      });

      const results = await chain.call(
        {
          history: pastMessages,
          input: inputText,
          context: ["Kim was a beast.", "Kim was the leader of north korea"],
        },
        [
          {
            handleLLMNewToken(token: string) {
              console.log(token);
            },
          },
        ]
      );
    }),
});
