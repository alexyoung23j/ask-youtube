/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/no-floating-promises */
import { GetServerSidePropsContext, type NextPage } from "next";
import { useSession, signOut, signIn } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { set } from "zod";
import useCustomCompletion from "~/hooks/useCustomCompletion";
import { api } from "~/utils/api";
import { redirectIfNotAuthed } from "~/utils/routing";

const ChatPage: NextPage = () => {
  const { data: sessionData } = useSession();
  const router = useRouter();
  const [userInput, setUserInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  const { id } = router.query;

  const { data: transcriptionCompleted } =
    api.chat.checkTranscriptionStatus.useQuery({
      chatHistoryId: id as string,
    });

  const { data: chatHistory, refetch: refetchChatHistory } =
    api.chat.getChatHistory.useQuery({
      chatHistoryId: id as string,
    });

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
    onMessageEnd: (text: string) => {
      setTimeout(async () => {
        await refetchChatHistory();
        setIsStreaming(false);
        setAnswerText("");
        setCompletedAnswerStream(false);
      }, 500);
    },
    onResponse: () => {
      setIsStreaming(true);
    },
  });

  const createUserMessage = api.chat.createUserMessage.useMutation();

  const generateResponse = async () => {
    try {
      const userInputCopy = userInput;
      setUserInput("");

      await createUserMessage.mutateAsync({
        chatHistoryId: id as string,
        message: userInputCopy,
      });
      await refetchChatHistory();
      const res = await complete(userInputCopy);
    } catch (e) {
      setIsStreaming(false);
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
        {chatHistory?.messages.map((message) => {
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
                {message.content}
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
        {isStreaming && (
          <div
            style={{
              margin: "12px",
              backgroundColor: "lightblue",
            }}
          >
            {answerText}
          </div>
        )}
        <input
          value={userInput}
          onInput={(e) => {
            setUserInput(e.currentTarget.value);
          }}
        ></input>
        <button onClick={() => void generateResponse()}>Send</button>
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
