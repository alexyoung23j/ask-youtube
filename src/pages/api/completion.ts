import { prisma } from "~/server/db";
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

interface DocumentMetadata {
  paragraphIndex: number;
  start: number;
  sentenceIndex: number;
  [key: string]: any;
}

const buildDocumentsForPrompt = ({
  transcript,
  documents,
}: {
  transcript: Array<{
    sentences: Array<{ text: string }>;
  }>;
  documents: Array<[Document<DocumentMetadata>, number]>;
}): Array<{
  paragraphIndex: number;
  paragraphText: string;
  snippetStartTime: number;
}> => {
  // Initialize an empty array to store the result
  const result: Array<{
    paragraphIndex: number;
    paragraphText: string;
    snippetStartTime: number;
  }> = [];

  // Go through each document
  documents.forEach(([document, _]) => {
    // Access metadata fields assuming they exist (no type checking)
    const paragraphIndex = document.metadata.paragraphIndex;
    const startTime = document.metadata.start;
    const sentenceIndex = document.metadata.sentenceIndex;

    // Find the corresponding transcript
    const correspondingTranscript = transcript[paragraphIndex];

    if (correspondingTranscript) {
      // Extract the specified sentence and its neighbors
      const sentences = correspondingTranscript.sentences;
      const startIdx = Math.max(0, sentenceIndex - 3);
      const endIdx = Math.min(sentences.length, sentenceIndex + 4);
      const selectedSentences = sentences.slice(startIdx, endIdx);

      // Concatenate selected sentences
      let paragraphText = `\TRANSCRIPT TIMESTAMP: ${startTime} DOCUMENT: `;
      selectedSentences.forEach((sentence, idx) => {
        paragraphText += `${sentence.text} `;
      });

      // Push to the result array
      result.push({
        paragraphIndex: paragraphIndex,
        paragraphText: paragraphText.trim(),
        snippetStartTime: startTime,
      });
    }
  });

  return result;
};

interface Data {
  name: string;
  // Include additional properties as required by your application
}

// eslint-disable-next-line @typescript-eslint/require-await
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  console.log("route start", new Date());
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const {
    prompt: inputText,
    url,
    chatId: passedChatId,
  } = JSON.parse(req.body as string);

  const session = await getServerSession(req, res, authOptions);

  const video = await prisma.video.findFirst({
    where: {
      url: url as string,
    },
  });

  if (!video) {
    // return a 500 on res
    return res.status(500).end("Video not found or transcribed");
  }

  const user = await prisma.user.findFirst({
    where: {
      id: session?.user?.id,
    },
  });

  if (!user) {
    return res.status(500).end("User not found");
  }

  let chatHistory: ChatHistory | null;

  if (passedChatId) {
    chatHistory = await prisma.chatHistory.findFirst({
      where: {
        id: passedChatId as string,
      },
      include: {
        messages: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });
    if (!chatHistory) {
      return res.status(500).end("Chat history id not found");
    }
  } else {
    // TODO: this is only there for demo
    chatHistory = await prisma.chatHistory.create({
      data: {
        videoUrl: video.url,
        userId: user.id,
      },
    });
  }

  const chatId = chatHistory?.id;

  if (!chatHistory) {
    return res.status(500).end("Chat history id not found");
  }

  const messages = await prisma.message.findMany({
    where: {
      chatId: chatId,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  console.log("route mid", new Date());

  const transcription = video?.transcription as Array<{
    sentences: Array<{ text: string }>;
  }>;

  // Load in documents
  console.log("starting vector search, ", new Date());

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
    (await vectorStore.similaritySearchWithScore(inputText as string, 5, {
      url: url as string,
    })) as Array<[Document<DocumentMetadata>, number]>;
  console.log("finished similarity search", new Date());

  const parsedDocumentMap = buildDocumentsForPrompt({
    documents: relevantDocuments,
    transcript: transcription,
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
        answer with your general knowledge of the subject.
        ----------------
        {context}
         
        All inputs should be related to the transcripts or the previous conversation. Answer the question in a way that makes sense in the context of the conversation.
        Do not answer generically- you can assume that the human is asking a question that is related to the transcripts provided or the chat history. 

        {format_instructions}
        Be talkative, verbose, and specific! Offer more additional context than was asked for.

        Human Question: {input}
        AI Answer, formatted as specified: `;

  const chatPrompt = ChatPromptTemplate.fromPromptMessages([
    SystemMessagePromptTemplate.fromTemplate(PROMPT),
    HumanMessagePromptTemplate.fromTemplate("{input}"),
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
          "the timestamps of the transcripts actually used to answer the user's question. The timestamps are provided in the context."
        ),
    })
  );

  const formatInstructions = parser.getFormatInstructions();

  const { stream, handlers } = LangChainStream();

  const model = new ChatOpenAI({
    modelName: "gpt-4",
    streaming: true,
    callbackManager: CallbackManager.fromHandlers(handlers),
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

  console.log("route start call", new Date());

  chain
    .call(
      {
        history: pastMessages,
        input: inputText as string,
        format_instructions: formatInstructions,
        context: parsedDocumentMap.map((doc) => doc.paragraphText).join("\n"),
      },
      [
        {
          handleLLMError: (err) => {
            console.log("er here", err);
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
  return streamToResponse(stream, res);
}
