/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/no-floating-promises */
import { GetServerSidePropsContext, type NextPage } from "next";
import { useRouter } from "next/router";
import { api } from "~/utils/api";
import useYoutubeChat from "~/hooks/useYoutubeChat";
import PageLayout from "~/components/layouts";
import YText from "~/components/YText";
import styles from "@/styles/pages/chat.module.scss";
import YInput from "~/components/YInput";
import { SendIcon, StopIcon, UploadIcon } from "~/components/icons";
import { createRef, use, useEffect, useMemo, useRef, useState } from "react";
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

const DemoQuestions = ({
  setUserText,
  generateResponse,
  setUsedDefaultQuestion,
}: {
  setUserText: (text: string) => void;
  generateResponse: () => void;
  setUsedDefaultQuestion: (used: boolean) => void;
}) => {
  return (
    <div className={styles.DemoQuestions}>
      <YText fontType="h3">Chat with the video:</YText>
      <div style={{ display: "flex", gap: "8px", flexDirection: "column" }}>
        <YText
          fontType="h3"
          fontWeight="light"
          className={styles.QuestionText}
          onClick={() => {
            setUserText("How does bitcoin work?");
            setUsedDefaultQuestion(true);
          }}
        >
          How does bitcoin work?
        </YText>
        <YText
          fontType="h3"
          fontWeight="light"
          className={styles.QuestionText}
          onClick={() => {
            setUserText("What are block rewards?");
            setUsedDefaultQuestion(true);
          }}
        >
          What are block rewards?
        </YText>
        <YText
          fontType="h3"
          fontWeight="light"
          className={styles.QuestionText}
          onClick={() => {
            setUserText("What is proof of work?");
            setUsedDefaultQuestion(true);
          }}
        >
          What is proof of work?
        </YText>
      </div>
    </div>
  );
};

const DemoPage: NextPage = () => {
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<any>(null);
  const [playerTimestamp, setPlayerTimestamp] = useState(0);
  const [usedDefaultQuestion, setUsedDefaultQuestion] = useState(false);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const { data: demoVideo } = api.video.getDemoVideo.useQuery(
    { videoName: "demo" },
    {
      refetchOnWindowFocus: false,
    }
  );

  const {
    messages,
    userInput,
    setUserInput,
    generateResponse,
    stopResponse,
    isLoading,
    answerText,
  } = useYoutubeChat({ id: demoVideo?.generatedChatHistory.id as string });

  useEffect(() => {
    if (userInput.length > 0 && usedDefaultQuestion) {
      setUsedDefaultQuestion(false);
      generateResponse();
    }
  }, [usedDefaultQuestion, userInput]);

  useEffect(scrollToBottom, [messages, answerText]);

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

  if (!demoVideo) {
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
          <YText fontType="h3">Loading Demo...</YText>
        </div>
      </PageLayout>
    );
  }

  const videoId = extractVideoId(demoVideo.video?.url as string);

  return (
    <PageLayout
      limitWidth={false}
      logo={false}
      logoReplacementContent={
        <VideoTitle
          title={demoVideo.video?.title as string}
          url={demoVideo.video?.url as string}
        />
      }
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
              demoVideo.video?.transcription as unknown as Array<ChunkGroup>
            }
            timestamp={playerTimestamp}
          />
        </div>
        <div className={styles.ChatSection}>
          {messages.length === 0 && (
            <DemoQuestions
              setUserText={setUserInput}
              generateResponse={generateResponse}
              setUsedDefaultQuestion={setUsedDefaultQuestion}
            />
          )}
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

export default DemoPage;
