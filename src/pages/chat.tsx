/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/no-floating-promises */
import { GetServerSidePropsContext, type NextPage } from "next";
import { useSession, signOut, signIn } from "next-auth/react";
import { useRouter } from "next/router";
import { api } from "~/utils/api";
import { redirectIfNotAuthed } from "~/utils/routing";
import { v4 as uuidv4 } from "uuid";
import useYoutubeChat from "~/hooks/useYoutubeChat";
import PageLayout from "~/components/layouts";
import YText from "~/components/YText";
import styles from "@/styles/pages/chat.module.scss";
import YInput from "~/components/YInput";
import {
  AIAvatar,
  SendIcon,
  UserAvatar,
  YoutubeIcon,
} from "~/components/icons";
import { createRef, useEffect, useMemo, useRef, useState } from "react";
import YouTube, { YouTubeProps } from "react-youtube";
import { extractVideoId, secondsToTimestamp } from "~/utils/helpers";
import { Inter } from "@next/font/google";
import { useMediaQuery } from "react-responsive";

const inter = Inter({
  weight: ["100", "300", "400", "500", "700", "900"],
  style: ["normal"],
  display: "block",
  subsets: ["latin"],
});

const Timestamp = ({
  timestamp,
  onClick,
}: {
  timestamp: number;
  onClick?: () => void;
}) => {
  return (
    <div className={styles.Timestamp} onClick={onClick}>
      <div
        style={{
          minWidth: "20px",
          minHeight: "20px",
          marginTop: "3px",
        }}
      >
        <YoutubeIcon />
      </div>
      <YText fontType="h4" fontWeight="light">
        {secondsToTimestamp(timestamp)}
      </YText>
    </div>
  );
};

const ChatMessage = ({
  content,
  sender,
  timestamps,
  videoId,
  onTimestampClick,
}: {
  content: string;
  sender: string;
  timestamps: number[];
  videoId?: string;
  onTimestampClick: (timestamp: number) => void;
}) => {
  return (
    <div
      style={{
        backgroundColor: sender === "AI" ? "#faf9f6" : "none",
        display: "flex",
        justifyContent: "center",
        borderTop:
          sender === "AI" && content.length > 0 ? "1px solid #e5e3da" : "none",
        borderBottom:
          sender === "AI" && content.length > 0 ? "1px solid #e5e3da" : "none",
      }}
    >
      {content.length > 0 && (
        <div className={styles.ChatMessage}>
          <div
            style={{
              minWidth: "28px",
              minHeight: "28px",
              margin: "4px",
              marginRight: "8px",
            }}
          >
            {sender === "AI" ? <AIAvatar /> : <UserAvatar />}
          </div>
          <div
            style={{ display: "flex", gap: "16px", flexDirection: "column" }}
          >
            <YText fontType="h3" className={styles.MessageText}>
              {content}
            </YText>
            <div className={styles.TimestampContainer}>
              {timestamps.map((timestamp) => {
                return (
                  <div key={timestamp}>
                    <Timestamp
                      timestamp={timestamp}
                      onClick={() => {
                        onTimestampClick(timestamp);
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const YoutubePlayer = ({
  timestamp,
  videoId,
  playerRef,
  onReady,
}: {
  timestamp: number;
  videoId: string;
  playerRef: React.MutableRefObject<any>;
  onReady: YouTubeProps["onReady"];
}) => {
  const isMediumScreen = useMediaQuery({ query: "(max-width: 1400px)" });

  useEffect(() => {
    if (
      playerRef &&
      playerRef.current &&
      typeof playerRef.current.seekTo === "function" &&
      timestamp !== 0
    ) {
      playerRef.current.seekTo(timestamp, true);
    }
  }, [timestamp]);

  const opts = {
    height: "100%",
    width: "100%",
    playerVars: {
      // https://developers.google.com/youtube/player_parameters
      autoplay: 1 as 0 | 1 | undefined,
      rel: 0 as 0 | 1 | undefined,
      showinfo: 0 as 0 | 1 | undefined,
      modestbranding: 1 as 1 | undefined,
    },
  };

  return (
    <div className={styles.PlayerContainer}>
      <div className={styles.Player}>
        <YouTube videoId={videoId} opts={opts} onReady={onReady} />
      </div>
    </div>
  );
};

interface TextChunk {
  start: number;
  end: number;
  text: string;
}

interface ChunkGroup {
  start: number;
  end: number;
  num_words: number;
  sentences: Array<TextChunk>;
}

const TranscriptViewer = ({
  transcript,
  timestamp,
}: {
  transcript: Array<ChunkGroup>;
  timestamp: number;
}) => {
  const allSentences = useMemo(
    () =>
      transcript.flatMap((t, tIndex) =>
        t.sentences.map((s) => ({ ...s, parentIndex: tIndex }))
      ),
    [transcript]
  );
  const refs = useRef(allSentences.map(() => createRef<HTMLSpanElement>()));
  const [highlightedIndices, setHighlightedIndices] = useState<number[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let idx = allSentences.findIndex(
      (s) => timestamp >= s.start && timestamp <= s.end
    );
    if (idx === -1) {
      idx = allSentences.findIndex((s) => timestamp < s.start);
      if (idx !== -1) idx -= 1;
    }

    if (idx !== -1) {
      const node = refs.current[idx]?.current;
      const container = containerRef.current;
      if (node && container) {
        container.scrollTop = node.offsetTop - container.offsetTop - 24;
      }
      setHighlightedIndices(
        [idx, idx + 1, idx + 2].filter((i) => i < allSentences.length)
      );
    }
  }, [timestamp, allSentences]);

  return (
    <div className={inter.className}>
      <div className={styles.TranscriptWrapper}>
        <div ref={containerRef} className={styles.TranscriptSection}>
          {allSentences.map((s, i) => {
            const nextSentence = allSentences[i + 1];
            const isLastInGroup =
              !nextSentence || nextSentence.parentIndex !== s.parentIndex;

            return (
              <span
                key={i}
                ref={refs.current[i]}
                className={
                  highlightedIndices.includes(i) ? styles.Highlighted : ""
                }
              >
                {s.text + " "}
                {isLastInGroup && (
                  <>
                    <br /> <br />
                  </>
                )}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const ChatPage: NextPage = () => {
  const { data: sessionData } = useSession();
  const router = useRouter();
  const { id } = router.query;
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<any>(null);
  const [playerTimestamp, setPlayerTimestamp] = useState(0);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

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

  useEffect(scrollToBottom, [messages]);

  if (!id) {
    // router.push("/chats");
    return <div>Something went wrong.</div>;
  }

  if (!transcriptionCompleted?.status || !transcriptionCompleted.video) {
    return <div>Transcribing...</div>;
  }

  const videoId = extractVideoId(transcriptionCompleted.video.url);

  const onReady = (event: { target: any }) => {
    playerRef.current = event.target;
  };

  const startVideo = () => {
    if (
      playerRef &&
      playerRef.current &&
      typeof playerRef.current.playVideo === "function"
    ) {
      playerRef.current.playVideo();
    }
  };

  const stopVideo = () => {
    if (
      playerRef &&
      playerRef.current &&
      typeof playerRef.current.pauseVideo === "function"
    ) {
      playerRef.current.pauseVideo();
    }
  };

  return (
    <PageLayout
      rightContent={
        <div className={styles.TopNavBar}>
          <YText
            fontType="h3"
            className={styles.Text}
            onClick={() => {
              void router.push("/videos");
            }}
          >
            📼 Videos
          </YText>
          <YText
            fontType="h3"
            className={styles.Text}
            onClick={() => {
              void router.push("/chats");
            }}
          >
            💬 Chats
          </YText>
          <YText
            fontType="h3"
            className={styles.Text}
            onClick={() => {
              void router.push("/auth/account");
            }}
          >
            Account
          </YText>
        </div>
      }
    >
      <div className={styles.ChatPage}>
        <div className={styles.VideoSection}>
          <YoutubePlayer
            onReady={onReady}
            timestamp={playerTimestamp}
            playerRef={playerRef}
            videoId={videoId as string}
          />
          <TranscriptViewer
            transcript={
              transcriptionCompleted.video
                .transcription as unknown as Array<ChunkGroup>
            }
            timestamp={playerTimestamp}
          />
        </div>
        <div className={styles.ChatSection}>
          <div className={styles.Messages}>
            {messages.map((message) => {
              return (
                <div key={message.id}>
                  <ChatMessage
                    sender={message.sender as string}
                    content={
                      message.isStreaming
                        ? answerText
                        : (message.content as string)
                    }
                    timestamps={
                      message.videoTimestamps &&
                      message.videoTimestamps.length > 0
                        ? message.videoTimestamps
                        : []
                    }
                    videoId={videoId as string}
                    onTimestampClick={(timestamp) => {
                      setPlayerTimestamp(timestamp);
                      startVideo();
                    }}
                  />
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          <div className={styles.ChatBottom}>
            <YInput
              value={userInput}
              setValue={setUserInput}
              showSearchIcon={false}
              placeholder="Send a message"
              onEnterClick={() => void generateResponse()}
              rightContent={
                <div
                  style={{
                    width: "16px",
                    height: "16px",
                    margin: "4px",
                    marginRight: "16px",
                    cursor: "pointer",
                  }}
                  onClick={() => void generateResponse()}
                >
                  <SendIcon />
                </div>
              }
            />
          </div>
        </div>
      </div>
    </PageLayout>
  );

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
