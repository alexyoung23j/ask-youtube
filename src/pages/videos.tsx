/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/no-floating-promises */
import { url } from "inspector";
import { GetServerSidePropsContext, type NextPage } from "next";
import { signIn, signOut, useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useState } from "react";
import PageLayout from "~/components/layouts";
import { api } from "~/utils/api";
import { parseYouTubeURL } from "~/utils/helpers";
import { redirectIfNotAuthed } from "~/utils/routing";
import styles from "@/styles/pages/videos.module.scss";
import YText from "~/components/YText";
import HistoryContainer from "~/components/HistoryContainer";

const VideosPage: NextPage = () => {
  const { data: sessionData } = useSession();
  const generateTranscription =
    api.transcribe.startTranscriptionJob.useMutation();
  const createChatHistory = api.chat.createChatHistory.useMutation();
  const router = useRouter();

  const { data: chatHistories } = api.chat.getChatHistories.useQuery();

  const [url, setUrl] = useState("");

  const createChat = async (videoUrl: string) => {
    try {
      // Transcribe/fetch and create chat history
      const parsedUrl = parseYouTubeURL(videoUrl);
      const video = await generateTranscription.mutateAsync({ url: parsedUrl });
      const chatHistory = await createChatHistory.mutateAsync({
        videoUrl: video.url,
      });
      router.push(`/chat?id=${chatHistory.id}`);
    } catch (e) {
      console.log(e);
    }
  };

  // extract all unique videos in the chatHistories
  const videos = chatHistories
    ?.map((chat) => chat.video)
    .filter((video, index, self) => {
      return (
        self.findIndex((v) => {
          return v.url === video.url;
        }) === index
      );
    });

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
      <div className={styles.VideosPage}>
        <div className={styles.PageContent}>
          <div className={styles.HeaderText}>
            <YText>Transcribed Videos</YText>
          </div>
          <div className={styles.ContentList}>
            {videos?.map((video) => {
              let length;
              if (!video.length) {
                length = "transcribing..";
              } else {
                length =
                  Math.floor(video.length / 3600) > 0
                    ? `${Math.floor(video.length / 3600)} h `
                    : "" + `${Math.floor((video.length % 3600) / 60)} m`;
              }

              return (
                <div key={video.url}>
                  <HistoryContainer
                    icon="chat"
                    title={video.title as string}
                    onTitleClick={() => {
                      // Create the new chat history
                      createChat(video.url);
                    }}
                    date={video.createdAt}
                    leftLabelOne={length}
                    showEdit={true}
                    showDelete={true}
                    onDeleteClick={() => {
                      console.log("deleting");
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </PageLayout>
  );

  return (
    <div>
      Chats!
      <div>
        <input
          value={url}
          onInput={(e) => {
            setUrl(e.currentTarget.value);
          }}
          placeholder="Enter URL"
        ></input>
      </div>
      <div style={{ marginTop: "20px" }}>
        {chatHistories?.map((chat) => {
          return (
            <div
              key={chat.id}
              onClick={() => {
                router.push(`/chat?id=${chat.id}`);
              }}
              style={{ cursor: "pointer", margin: "4px" }}
            >
              {chat.video.title}
            </div>
          );
        })}
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

export default VideosPage;
