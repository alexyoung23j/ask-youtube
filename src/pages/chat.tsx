/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/no-floating-promises */
import { GetServerSidePropsContext, type NextPage } from "next";
import { useSession, signOut, signIn } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import useCustomCompletion from "~/hooks/useCustomCompletion";
import { api } from "~/utils/api";
import { redirectIfNotAuthed } from "~/utils/routing";
import { v4 as uuidv4 } from "uuid";
import { removeOverlappingTimestamps } from "~/utils/helpers";
import useYoutubeChat from "~/hooks/useYoutubeChat";

const ChatPage: NextPage = () => {
  const { data: sessionData } = useSession();
  const router = useRouter();
  const { id } = router.query;

  const { data: transcriptionCompleted } =
    api.chat.checkTranscriptionStatus.useQuery({
      chatHistoryId: id as string,
    });

  const {
    messages,
    chatHistory,
    userInput,
    setUserInput,
    generateResponse,
    stopResponse,
    answerText,
  } = useYoutubeChat({ id: id as string });

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
