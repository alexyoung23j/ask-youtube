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
import styles from "@/styles/pages/chats.module.scss";
import YText from "~/components/YText";

const VideosPage: NextPage = () => {
  const { data: sessionData } = useSession();
  const generateTranscription =
    api.transcribe.startTranscriptionJob.useMutation();
  const createChatHistory = api.chat.createChatHistory.useMutation();
  const router = useRouter();

  const { data: chatHistories } = api.chat.getChatHistories.useQuery();

  const [url, setUrl] = useState("");

  const createChat = async () => {
    try {
      // Transcribe/fetch and create chat history
      const parsedUrl = parseYouTubeURL(url);
      const video = await generateTranscription.mutateAsync({ url: parsedUrl });
      const chatHistory = await createChatHistory.mutateAsync({
        videoUrl: video.url,
      });
      router.push(`/chat?id=${chatHistory.id}`);
    } catch (e) {
      console.log(e);
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
      <div className={styles.ChatListPage}></div>
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
        <button onClick={createChat}>Transcribe</button>
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
