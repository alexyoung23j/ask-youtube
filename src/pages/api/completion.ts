/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type { NextApiRequest, NextApiResponse } from "next";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { ConversationChain } from "langchain/chains";
import { CallbackManager } from "langchain/callbacks";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SupabaseVectorStore } from "langchain/vectorstores/supabase";
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
import { StructuredOutputParser } from "langchain/output_parsers";
import type { Document } from "langchain/dist/docstore";
import type { ChatHistory } from "@prisma/client";
import {
  StreamingTextResponse,
  LangChainStream,
  Message,
  streamToResponse,
} from "ai";
import { getServerSession } from "next-auth";
import { authOptions } from "~/server/auth";
import { z } from "zod";

export const runtime = "edge";

interface DocumentMetadata {
  paragraphIndex: number;
  start: number;
  [key: string]: any;
}

type DocumentEntry = {
  paragraphIndex: number;
  paragraphText: string;
  snippetStartTime: number;
};

const buildDocumentsForPrompt = ({
  documents,
}: {
  documents: Array<[Document<DocumentMetadata>, number]>;
}): DocumentEntry[] => {
  const result: Array<DocumentEntry> = [];

  documents.forEach(([document, _]) => {
    const paragraphIndex = document.metadata.paragraphIndex;
    const startTime = document.metadata.start;

    const paragraphText = `TRANSCRIPT TIMESTAMP: ${startTime} DOCUMENT: ${document.pageContent}`;
    result.push({
      paragraphIndex: paragraphIndex,
      paragraphText: paragraphText.trim(),
      snippetStartTime: startTime,
    });
  });

  return result;
};

// eslint-disable-next-line @typescript-eslint/require-await
export default async function POST(req: Request) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const {
    prompt: inputText,
    url,
    transcription,
    messages,
  }: {
    prompt: string;
    url: string;
    transcription: Array<{
      sentences: Array<{ text: string }>;
    }>;
    messages: Array<{ sender: string; content: string }>;
  } = await req.json();

  const supabaseClient = createSupabaseClient(
    process.env.EMBEDDING_DB_URL as string,
    process.env.EMBEDDING_DB_KEY as string
  );

  const vectorStore = await SupabaseVectorStore.fromExistingIndex(
    new OpenAIEmbeddings(),
    {
      client: supabaseClient,
      tableName: "documents",
      queryName: "match_documents",
    }
  );

  const relevantDocuments: Array<[Document<DocumentMetadata>, number]> =
    (await vectorStore.similaritySearchWithScore(inputText, 4, {
      url: url,
    })) as Array<[Document<DocumentMetadata>, number]>;

  const parsedDocumentMap = buildDocumentsForPrompt({
    documents: relevantDocuments,
  });

  // check if we have previous conversation history, if so, use it.
  const pastMessages: BaseChatMessage[] = messages
    .slice(-3, -1)
    .map((message) => {
      if (message.sender === "USER") {
        return new HumanChatMessage(message.content);
      } else {
        return new AIChatMessage(message.content);
      }
    });

  // Use this previous history with the new question to formulate a standalone question
  const PROMPT = `The following is a friendly conversation between a human and an AI. The AI is talkative and provides
        lots of specific details from the video transcript its provided. 
        If the AI does not know the answer to a question, it truthfully says it does not know.           
        Current conversation:
        {history}
        
        Use the following transcript sections from the video, along with your general knowledge of the subject as an extremely intelligent,
        unbiased, and well informed person, to answer the users question. If the transcript sections are not enough to answer the question,
        answer with your general knowledge of the subject. But make sure to mention that you are using your general knowledge and not the transcripts.
        ----------------
        {context}
         
        All inputs should be related to the transcripts or the previous conversation. Answer the question in a way that makes sense in the context of the conversation.
        Do not answer generically- you can assume that the human is asking a question that is related to the transcripts provided or the chat history. 

        {format_instructions}
        Be talkative, verbose, and specific! Offer more additional context than was asked for.

        Human Question: {input}
        AI Answer, formatted as JSON as describe above: `;

  const chatPrompt = ChatPromptTemplate.fromPromptMessages([
    SystemMessagePromptTemplate.fromTemplate(PROMPT),
    HumanMessagePromptTemplate.fromTemplate("{input}"),
    HumanMessagePromptTemplate.fromTemplate(
      "NEVER EVER EVER FORGET TO FORMAT AS JSON!"
    ),
  ]);

  const parser = StructuredOutputParser.fromZodSchema(
    z.object({
      answer: z
        .string()
        .describe(
          "answer to the user's question. Do NOT mention timestamps here."
        ),
      usedTimestamps: z
        .array(z.number())
        .describe(
          "the timestamps of the transcripts used to answer the user's question. The timestamps are provided in the context. Timestamps need only be somewhat related to be included."
        ),
    })
  );

  const formatInstructions = parser.getFormatInstructions();

  const { stream, handlers } = LangChainStream();

  const model = new ChatOpenAI({
    modelName: "gpt-3.5-turbo-16k",
    streaming: true,
    callbackManager: CallbackManager.fromHandlers(handlers),
    temperature: 0,
  });

  const chain = new ConversationChain({
    llm: model,
    memory: new BufferMemory({
      chatHistory: new ChatMessageHistory(pastMessages),
      inputKey: "history",
    }),
    // verbose: true, // TOGGLE ON FOR PROMPT REVIEW
    prompt: chatPrompt,
  });

  chain
    .call(
      {
        history: pastMessages,
        input: inputText,
        format_instructions: formatInstructions,
        context: parsedDocumentMap.map((doc) => doc.paragraphText).join("\n"),
      },
      [
        {
          handleLLMError: (err) => {
            console.log("error in chain call: ", err);
          },
        },
      ]
    )
    .catch(console.error)
    .finally(() => {
      // Call handleStreamEnd when the chat or stream ends (patch for broken functionality in vercel library)
      void handlers.handleChainEnd();
    });

  // Streams to the client
  return new StreamingTextResponse(stream);
}
