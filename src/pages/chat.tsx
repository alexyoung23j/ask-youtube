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
  LinkIcon,
  SendIcon,
  StopIcon,
  UploadIcon,
  UserAvatar,
  YoutubeIcon,
} from "~/components/icons";
import { createRef, useEffect, useMemo, useRef, useState } from "react";
import { extractVideoId, secondsToTimestamp } from "~/utils/helpers";

import YLoading from "~/components/YLoading";
import { YoutubePlayer } from "~/components/YoutubePlayer";
import {
  type ChunkGroup,
  TranscriptViewer,
} from "~/components/TranscriptViewer";
import { ChatMessage } from "~/components/ChatMessage";
import { VideoTitle } from "~/components/VideoTitle";
import YButton from "~/components/YButton";
import YSpinner from "~/components/YSpinner";
import { useMediaQuery } from "react-responsive";

const ChatPage: NextPage = () => {
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
    userInput,
    setUserInput,
    generateResponse,
    stopResponse,
    isLoading,
    answerText,
  } = useYoutubeChat({ id: id as string });

  useEffect(scrollToBottom, [messages, answerText]);

  const isMobileScreen = useMediaQuery({ query: "(max-width: 800px)" });

  if (!id) {
    return (
      <PageLayout
        limitWidth={false}
        rightContent={
          <div className={styles.TopNavBar}>
            <YButton
              label="Upload"
              onClick={() => {
                router.push("/videos?addNew=true");
              }}
            >
              <div style={{ display: "flex", gap: "4px" }}>
                <div
                  style={{
                    width: "16px",
                    height: "16px",
                    margin: "4px",
                  }}
                >
                  <UploadIcon />
                </div>
                <YText fontColor="white" fontType="h3" wrap="nowrap">
                  New Video
                </YText>
              </div>
            </YButton>
            <YText
              fontType="h3"
              className={styles.Text}
              onClick={() => {
                void router.push("/videos");
              }}
            >
              Back to Videos →
            </YText>
          </div>
        }
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          <YSpinner size="large" color="#a6a6a6" />
          <YText fontType="h3">This chat does not exist.</YText>
        </div>
      </PageLayout>
    );
  }

  if (!transcriptionCompleted?.status || !transcriptionCompleted.video) {
    return (
      <PageLayout
        limitWidth={false}
        rightContent={
          <div className={styles.TopNavBar}>
            {!isMobileScreen && (
              <YButton
                label="Upload"
                onClick={() => {
                  router.push("/videos?addNew=true");
                }}
              >
                <div style={{ display: "flex", gap: "4px" }}>
                  <div
                    style={{
                      width: "16px",
                      height: "16px",
                      margin: "4px",
                    }}
                  >
                    <UploadIcon />
                  </div>
                  <YText fontColor="white" fontType="h3" wrap="nowrap">
                    New Video
                  </YText>
                </div>
              </YButton>
            )}
            <YText
              fontType="h3"
              className={styles.Text}
              onClick={() => {
                void router.push("/videos");
              }}
            >
              Back to Videos →
            </YText>
          </div>
        }
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          <YSpinner size="large" color="#a6a6a6" />
          <YText fontType="h3">Loading.. Try again soon.</YText>
        </div>
      </PageLayout>
    );
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
      limitWidth={false}
      logo={false}
      logoReplacementContent={
        !isMobileScreen ? (
          <VideoTitle
            title={transcriptionCompleted.video.title as string}
            url={transcriptionCompleted.video.url}
          />
        ) : (
          <></>
        )
      }
      rightContent={
        <div className={styles.TopNavBar}>
          {!isMobileScreen && (
            <YButton
              label="Upload"
              onClick={() => {
                router.push("/videos?addNew=true");
              }}
            >
              <div style={{ display: "flex", gap: "4px" }}>
                <div
                  style={{
                    width: "16px",
                    height: "16px",
                    margin: "4px",
                  }}
                >
                  <UploadIcon />
                </div>
                <YText fontColor="white" fontType="h3" wrap="nowrap">
                  New Video
                </YText>
              </div>
            </YButton>
          )}
          <YText
            fontType="h3"
            className={styles.Text}
            onClick={() => {
              void router.push("/videos");
            }}
          >
            Back to Videos →
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
          {!isMobileScreen && (
            <TranscriptViewer
              transcript={
                transcriptionCompleted.video
                  .transcription as unknown as Array<ChunkGroup>
              }
              timestamp={playerTimestamp}
            />
          )}
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
                    isLoading={isLoading}
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
              onEnterClick={() => {
                if (userInput.length === 0) return;
                if (!isLoading) void generateResponse();
              }}
              rightContent={
                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    alignItems: "center",
                    marginRight: "16px",
                  }}
                >
                  {isLoading && <YLoading size="small" />}
                  {!isLoading ? (
                    <div
                      style={{
                        width: "16px",
                        height: "16px",
                        margin: "4px",
                        cursor: "pointer",
                      }}
                      onClick={() => {
                        if (userInput.length === 0) return;
                        void generateResponse();
                      }}
                    >
                      <SendIcon />
                    </div>
                  ) : (
                    <div
                      style={{
                        width: "14px",
                        height: "14px",
                        cursor: "pointer",
                        marginTop: "-3px",
                      }}
                      onClick={() => {
                        void stopResponse();
                      }}
                    >
                      <StopIcon />
                    </div>
                  )}
                </div>
              }
            />
          </div>
        </div>
      </div>
    </PageLayout>
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
