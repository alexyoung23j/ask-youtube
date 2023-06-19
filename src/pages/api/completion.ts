import { prisma } from "~/server/db";
import type { NextApiRequest, NextApiResponse } from "next";
import { ChatOpenAI } from "langchain/chat_models/openai";
import {
  RetrievalQAChain,
  loadQARefineChain,
  ConversationalRetrievalQAChain,
  ConversationChain,
  LLMChain,
} from "langchain/chains";
import { CallbackManager } from "langchain/callbacks";
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
      const startIdx = Math.max(0, sentenceIndex - 2);
      const endIdx = Math.min(sentences.length, sentenceIndex + 2);
      const selectedSentences = sentences.slice(startIdx, endIdx);

      // Concatenate selected sentences
      let paragraphText = `${paragraphIndex}.`;
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
      res.status(405).end("Chat history id not found");
    }
  } else {
    chatHistory = await prisma.chatHistory.create({
      data: {
        videoUrl: video.url,
        userId: user.id,
      },
    });
  }

  const chatId = chatHistory?.id;

  if (!chatHistory) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Unable to find chat history",
    });
  }

  const messages = await prisma.message.findMany({
    where: {
      chatId: chatId,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const userMessage = await prisma.message.create({
    data: {
      content: inputText as string,
      sender: "USER",
      videoTimestamps: [],
      chatId: chatId as string,
    },
  });

  const transcription = video?.transcription as Array<{
    sentences: Array<{ text: string }>;
  }>;

  // Load in documents
  const pinecone = await getPineconeClient();
  const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX as string);
  const vectorStore = await PineconeStore.fromExistingIndex(
    new OpenAIEmbeddings(),
    { pineconeIndex }
  );

  const relevantDocuments: Array<[Document<DocumentMetadata>, number]> =
    (await vectorStore.similaritySearchWithScore(inputText as string, 3, {
      url: url as string,
    })) as Array<[Document<DocumentMetadata>, number]>;

  const parsedDocumentMap = buildDocumentsForPrompt({
    documents: relevantDocuments,
    transcript: transcription,
  });

  // check if we have previous conversation history, if so, use it.
  const pastMessages: BaseChatMessage[] = messages.map((message) => {
    if (message.sender === "USER") {
      return new HumanChatMessage(message.content);
    } else {
      return new AIChatMessage(message.content);
    }
  });

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

        {format_instructions}
        Be talktaive and specific!

        Human Question: {input}
        AI Answer: `;

  const chatPrompt = ChatPromptTemplate.fromPromptMessages([
    SystemMessagePromptTemplate.fromTemplate(PROMPT),
    HumanMessagePromptTemplate.fromTemplate("{input}"),
  ]);

  const parser = StructuredOutputParser.fromZodSchema(
    z.object({
      answer: z.string().describe("answer to the user's question"),
      usedDocumentNumbers: z
        .array(z.string())
        .describe(
          "the numbers of the documents actually used to answer the user's question. The numbers are provided in the context."
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
    // verbose: true,
    prompt: chatPrompt,
  });

  const results = chain.call(
    {
      history: pastMessages,
      input: inputText as string,
      format_instructions: formatInstructions,
      context: parsedDocumentMap.map((doc) => doc.paragraphText).join("\n"),
    },
    [
      {
        handleLLMEnd: async (res) => {
          const generation = res.generations[0];

          if (!generation) {
            return;
          }
          const answer = generation[0]?.text;
          const parsedAnswer = await parser.parse(answer as string);

          const videoTimestamps = parsedAnswer.usedDocumentNumbers.map(
            (num: string) => {
              try {
                const document = parsedDocumentMap.find(
                  (doc) => doc.paragraphIndex === parseInt(num)
                );
                const startTime = document?.snippetStartTime;
                return startTime;
              } catch (e) {
                console.log(e);
                return;
              }
            }
          );

          await prisma.message.create({
            data: {
              content: parsedAnswer.answer,
              sender: "AI",
              videoTimestamps: videoTimestamps as number[],
              chatId: chatId as string,
            },
          });
        },
      },
    ]
  );

  // Streams to the client
  streamToResponse(stream, res);
}
