/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/no-floating-promises */
import { Message } from "@prisma/client";
import { GetServerSidePropsContext, type NextPage } from "next";
import { useSession, signOut, signIn } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import useCustomCompletion from "~/hooks/useCustomCompletion";
import { api } from "~/utils/api";
import { redirectIfNotAuthed } from "~/utils/routing";
import { v4 as uuidv4 } from "uuid";
import { removeOverlappingTimestamps } from "~/utils/helpers";

const ChatPage: NextPage = () => {
  const { data: sessionData } = useSession();
  const router = useRouter();
  const [userInput, setUserInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string>("");

  const { id } = router.query;

  const { data: transcriptionCompleted } =
    api.chat.checkTranscriptionStatus.useQuery({
      chatHistoryId: id as string,
    });

  const { data: chatHistory, refetch: refetchChatHistory } =
    api.chat.getChatHistory.useQuery({
      chatHistoryId: id as string,
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
      const parsedText = JSON.parse(text) as {
        answer: string;
        usedTimestamps: number[];
      };

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
        chatHistoryId: id as string,
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
        chatHistoryId: id as string,
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
        chatHistoryId: id as string,
        partialMessageContent: answerText,
        messageId: streamingMessageId,
      });
      setStreamingMessageId("");
    } catch (e) {
      console.error(e);
    }
  };

  if (!id) {
    // router.push("/chats");
    return <div>Something went wrong.</div>;
  }

  if (!transcriptionCompleted) {
    return <div>Transcribing...</div>;
  }

  return (
    <div>
      {`chat with video: ${chatHistory?.video?.title as string}`}
      <div style={{ marginTop: "20px" }}>
        {messages.map((message) => {
          return (
            <div
              key={message.id}
              style={{
                margin: "12px",
                backgroundColor: message.sender === "AI" ? "lightblue" : "none",
              }}
            >
              <div
                style={{
                  margin: "8px",
                }}
              >
                {message.isStreaming ? answerText : message.content}
              </div>
              {message.videoTimestamps &&
                message.videoTimestamps.length > 0 && (
                  <div
                    style={{ marginLeft: "40px", display: "flex", gap: "4px" }}
                  >
                    Timestamps:
                    {message.videoTimestamps.map((timestamp) => {
                      return (
                        <div
                          style={{
                            minWidth: "40px",
                            maxWidth: "fit-content",
                          }}
                          key={timestamp}
                        >
                          {timestamp}
                        </div>
                      );
                    })}
                  </div>
                )}
            </div>
          );
        })}
        {/* {isStreaming && (
          <div
            style={{
              margin: "12px",
              backgroundColor: "lightblue",
            }}
          >
            <div
              style={{
                margin: "8px",
              }}
            >
              {answerText}
            </div>
          </div>
        )} */}
        <input
          value={userInput}
          onInput={(e) => {
            setUserInput(e.currentTarget.value);
          }}
        ></input>
        <button onClick={() => void generateResponse()}>Send</button>
        <button onClick={() => void stopResponse()}>Stop</button>
      </div>
      <button
        onClick={sessionData ? () => void signOut() : () => void signIn()}
      >
        {sessionData ? "Sign out" : "Sign in"}
      </button>
    </div>
  );
};

export async function getServerSideProps(ctx: GetServerSidePropsContext) {
  // Redirect to Landing Page if Not Logged in
  return redirectIfNotAuthed({
    ctx,
    redirectUrl: "/auth/sign-in",
  });
}

export default ChatPage;
