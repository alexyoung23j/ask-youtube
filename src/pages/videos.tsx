/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/no-floating-promises */
import { url } from "inspector";
import { GetServerSidePropsContext, type NextPage } from "next";
import { signIn, signOut, useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import PageLayout from "~/components/layouts";
import { api } from "~/utils/api";
import { parseYouTubeURL } from "~/utils/helpers";
import { redirectIfNotAuthed } from "~/utils/routing";
import styles from "@/styles/pages/videos.module.scss";
import YText from "~/components/YText";
import HistoryContainer from "~/components/HistoryContainer";
import YInput from "~/components/YInput";
import YButton from "~/components/YButton";
import Fuse from "fuse.js";
import YModal from "~/components/YModal";
import { UploadIcon } from "~/components/icons";

const VideosPage: NextPage = () => {
  const { data: sessionData } = useSession();
  const generateTranscription =
    api.transcribe.startTranscriptionJob.useMutation();
  const createChatHistory = api.chat.createChatHistory.useMutation();
  const deleteVideo = api.video.deleteVideo.useMutation();
  const router = useRouter();
  const { data: videos, refetch } = api.video.getUserVideos.useQuery();
  const [url, setUrl] = useState("");
  const [deleteUrl, setDeleteUrl] = useState("");
  const [uploadUrlError, setUploadUrlError] = useState("");
  const [searchString, setSearchString] = useState("");
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (url.length < 1) {
      setUploadUrlError("");
    }
  }, [url]);

  const createChat = async (videoUrl: string) => {
    try {
      // Transcribe/fetch and create chat history
      setUploadUrlError("");
      const parsedUrl = parseYouTubeURL(videoUrl);
      const video = await generateTranscription.mutateAsync({ url: parsedUrl });
      const chatHistory = await createChatHistory.mutateAsync({
        videoUrl: video.url,
      });
      router.push(`/chat?id=${chatHistory.id}`);
    } catch (e) {
      console.log(e);
      setUploadUrlError("Invalid URL");
    }
  };

  const deleteVideoAndChats = async (videoUrl: string) => {
    try {
      setIsDeleting(true);
      await deleteVideo.mutateAsync({ videoUrl: videoUrl });
      await refetch();
      setIsDeleting(false);
      setDeleteModalOpen(false);
      setDeleteUrl("");
    } catch (e) {
      console.log(e);
    }
  };

  // extract all unique videos in the chatHistories

  const options = {
    keys: ["url", "title"], // Define the keys to search
    threshold: 0.2, // Adjust the threshold for fuzzy matching, lower values mean stricter matching
    ignoreLocation: true,
    shouldSort: false,
  };

  const fuse = new Fuse(videos ?? [], options);

  const searchFilteredVideos = useMemo(() => {
    if (searchString === "") {
      return videos; // Return the entire data array when searchString is empty
    } else {
      const results = fuse.search(searchString);
      return results.map((result) => result.item);
    }
  }, [searchString, videos]);

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
        <YModal
          isOpen={uploadModalOpen}
          onCancel={() => setUploadModalOpen(false)}
          title="Add Video"
          subtitle="Enter a YouTube URL to add a video to your library."
          content={
            <YInput
              value={url}
              setValue={setUrl}
              placeholder="youtube.com/..."
              showSearchIcon={false}
            />
          }
          onSuccess={() => {
            createChat(url);
          }}
          errorText={uploadUrlError}
          successLabel="Add"
          cancelLabel="Cancel"
        />
        <YModal
          isOpen={deleteModalOpen}
          onCancel={() => setDeleteModalOpen(false)}
          title="Delete Video"
          subtitle="This will remove all your chat history for this video."
          onSuccess={() => {
            deleteVideoAndChats(deleteUrl);
          }}
          // errorText={uploadUrlError}
          successLabel="Delete"
          cancelLabel="Cancel"
          loading={isDeleting}
        />
        <div className={styles.PageContent}>
          <div className={styles.HeaderText}>
            <YText>Transcribed Videos</YText>
          </div>

          <div className={styles.ContentList}>
            <div className={styles.SearchSection}>
              <YInput value={searchString} setValue={setSearchString} />
              <YButton
                label="Upload"
                onClick={() => {
                  setUploadModalOpen(true);
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
                    Add New
                  </YText>
                </div>
              </YButton>
            </div>
            {searchFilteredVideos?.map((video) => {
              let length;
              if (!video.length) {
                length = "transcribing..";
              } else {
                length =
                  Math.floor(video.length / 3600) > 0
                    ? `${Math.floor(video.length / 3600)}h `
                    : "" + `${Math.floor((video.length % 3600) / 60)}m`;
              }

              return (
                <div key={video.url}>
                  <HistoryContainer
                    icon="link"
                    title={video.title as string}
                    onTitleClick={() => {
                      // Create the new chat history
                      createChat(video.url);
                    }}
                    date={video.createdAt}
                    leftLabelOne={length}
                    showEdit={false}
                    showDelete={true}
                    onDeleteClick={() => {
                      setDeleteModalOpen(true);
                      setDeleteUrl(video.url);
                    }}
                    onIconClick={() => {
                      window.open(video.url, "_blank");
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
};

export async function getServerSideProps(ctx: GetServerSidePropsContext) {
  // Redirect to Landing Page if Not Logged in
  return redirectIfNotAuthed({
    ctx,
    redirectUrl: "/auth/sign-in",
  });
}

export default VideosPage;
