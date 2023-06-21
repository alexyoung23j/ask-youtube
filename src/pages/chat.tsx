/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/no-floating-promises */
import { GetServerSidePropsContext, type NextPage } from "next";
import { useSession, signOut, signIn } from "next-auth/react";
import { useRouter } from "next/router";
import { useState } from "react";
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

  const { complete, answerText } = useCustomCompletion({
    api: "/api/completion",
    body: {
      url: chatHistory?.video.url,
      chatId: id,
    },
    onMessageEnd: (text: string) => {
      console.log("onMessageEnd", text);
      refetchChatHistory();
      setIsStreaming(false);
    },
  });

  if (!id) {
    // router.push("/chats");
    return <div>Something went wrong.</div>;
  }

  if (!transcriptionCompleted) {
    return <div>Transcribing...</div>;
  }

  const generateResponse = async () => {
    try {
      setIsStreaming(true);
      const res = await complete(userInput);
      console.log("im doneee", res);
    } catch (e) {
      setIsStreaming(false);
      console.error(e);
    }
  };

  return (
    <div>
      {`chat with video: ${chatHistory?.video?.title as string}`}
      <div style={{ marginTop: "20px" }}>
        {chatHistory?.messages.map((message) => {
          return (
            <div
              style={{
                margin: "8px",
                backgroundColor: message.sender === "AI" ? "lightblue" : "none",
              }}
              key={message.id}
            >
              {message.content}
            </div>
          );
        })}
        {isStreaming && (
          <div
            style={{
              margin: "8px",
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
