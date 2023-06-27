/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/no-floating-promises */
import { Message } from "@prisma/client";
import { useState, useEffect } from "react";
import { removeOverlappingTimestamps } from "~/utils/helpers";
import useCustomCompletion from "./useCustomCompletion";
import { api } from "~/utils/api";
import { v4 as uuidv4 } from "uuid";

// Hook for handling all chat functionality
const useYoutubeChat = ({ id }: { id: string }) => {
  const [userInput, setUserInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string>("");

  const { data: chatHistory, refetch: refetchChatHistory } =
    api.chat.getChatHistory.useQuery({
      chatHistoryId: id,
    });
  const createUserMessage = api.chat.createUserMessage.useMutation();
  const createAIMessage = api.chat.createAIMessage.useMutation();
  const [messages, setMessages] = useState<
    Array<Partial<Message> & { isStreaming?: boolean }>
  >([]);

  useEffect(() => {
    if (chatHistory?.messages) {
      setMessages(chatHistory.messages);
    }
  }, [chatHistory?.messages]);

  const {
    complete,
    answerText,
    isLoading,
    setAnswerText,
    setCompletedAnswerStream,
  } = useCustomCompletion({
    api: "/api/completion",
    body: {
      url: chatHistory?.video.url,
      chatId: id,
    },
    onMessageEnd: async (text: string) => {
      // Optimistic UI update
      let parsedText = {
        answer:
          "Something went wrong and I was unable to answer you! Please try again.",
        usedTimestamps: [] as number[],
      };
      try {
        parsedText = JSON.parse(text) as {
          answer: string;
          usedTimestamps: number[];
        };
      } catch (e) {
        console.log(e);
      }

      // Update the existing streamed message in the UI
      const timestamps = removeOverlappingTimestamps(
        parsedText.usedTimestamps,
        30
      );
      setMessages((prevMessages) => {
        // update the content in the message that matches streamingMessageId
        const newMessages = prevMessages.map((message) => {
          if (message.id === streamingMessageId) {
            return {
              ...message,
              content: parsedText.answer,
              isStreaming: false,
              videoTimestamps: timestamps,
            };
          }
          return message;
        });
        return newMessages;
      });

      // Update the message in the DB
      await createAIMessage.mutateAsync({
        chatHistoryId: id,
        fullMessage: text,
        messageId: streamingMessageId,
      });

      setIsStreaming(false);
      setAnswerText("");
      setCompletedAnswerStream(false);
      setStreamingMessageId("");
    },
    onResponse: () => {
      setIsStreaming(true);
    },
  });

  const generateResponse = async () => {
    try {
      const userInputCopy = userInput;
      setAnswerText("");
      setUserInput("");
      const messageId = uuidv4();
      const aiMessageId = uuidv4();
      setStreamingMessageId(aiMessageId);

      // Optimistically update chat UI
      setMessages((prevMessages) => {
        return [
          ...prevMessages,
          {
            id: messageId,
            content: userInputCopy,
            sender: "USER",
          },
          { id: aiMessageId, isStreaming: true, sender: "AI" },
        ];
      });

      await createUserMessage.mutateAsync({
        chatHistoryId: id,
        message: userInputCopy,
        messageId,
      });

      const res = await complete(userInputCopy);
    } catch (e) {
      setIsStreaming(false);
      console.error(e);
    }
  };

  const stopResponse = async () => {
    try {
      stop();
      setMessages((prevMessages) => {
        // update the content in the message that matches streamingMessageId
        const newMessages = prevMessages.map((message) => {
          if (message.id === streamingMessageId) {
            return {
              ...message,
              content: answerText,
              isStreaming: false,
            };
          }
          return message;
        });
        return newMessages;
      });

      await createAIMessage.mutateAsync({
        chatHistoryId: id,
        partialMessageContent: answerText,
        messageId: streamingMessageId,
      });
      setStreamingMessageId("");
    } catch (e) {
      console.error(e);
    }
  };

  return {
    messages,
    chatHistory,
    userInput,
    answerText,
    setUserInput,
    generateResponse,
    stopResponse,
    isStreaming,
    refetchChatHistory,
    isLoading,
  };
};

export default useYoutubeChat;
