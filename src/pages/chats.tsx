/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/no-floating-promises */
import { url } from "inspector";
import { GetServerSidePropsContext, type NextPage } from "next";
import { signIn, signOut, useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useMemo, useState } from "react";
import PageLayout from "~/components/layouts";
import { api } from "~/utils/api";
import { parseYouTubeURL } from "~/utils/helpers";
import { redirectIfNotAuthed } from "~/utils/routing";
import styles from "@/styles/pages/chats.module.scss";
import YText from "~/components/YText";
import HistoryContainer from "~/components/HistoryContainer";
import Fuse from "fuse.js";
import YButton from "~/components/YButton";
import YInput from "~/components/YInput";
import YModal from "~/components/YModal";

const ChatListPage: NextPage = () => {
  const { data: sessionData } = useSession();
  const generateTranscription =
    api.transcribe.startTranscriptionJob.useMutation();
  const createChatHistory = api.chat.createChatHistory.useMutation();
  const deleteChatHistory = api.chat.deleteChat.useMutation();
  const deleteAllChatHistory = api.chat.deleteAllUserChats.useMutation();

  const router = useRouter();
  const { data: chatHistories, refetch } = api.chat.getChatHistories.useQuery();
  const [searchString, setSearchString] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteAllModalOpen, setDeleteAllModalOpen] = useState(false);
  const [deleteChatId, setDeleteChatId] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const options = {
    keys: ["video.url", "video.title", "messages.content"], // Define the keys to search
    threshold: 0.2, // Adjust the threshold for fuzzy matching, lower values mean stricter matching
    ignoreLocation: true,
    shouldSort: false,
  };

  const fuse = new Fuse(chatHistories ?? [], options);

  const searchFilteredChats = useMemo(() => {
    if (searchString === "") {
      return chatHistories; // Return the entire data array when searchString is empty
    } else {
      const results = fuse.search(searchString);
      return results.map((result) => result.item);
    }
  }, [searchString, chatHistories]);

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

  const deleteChat = async (chatId: string) => {
    try {
      setIsDeleting(true);
      await deleteChatHistory.mutateAsync({ chatHistoryId: chatId });
      await refetch();
      setIsDeleting(false);
      setDeleteModalOpen(false);
      setDeleteChatId("");
    } catch (e) {
      console.log(e);
    }
  };

  const deleteChats = async () => {
    try {
      setIsDeleting(true);
      await deleteAllChatHistory.mutateAsync();
      await refetch();
      setIsDeleting(false);
      setDeleteAllModalOpen(false);
      setDeleteChatId("");
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
      <div className={styles.ChatListPage}>
        <YModal
          isOpen={deleteModalOpen}
          onCancel={() => setDeleteModalOpen(false)}
          title="Delete Chat"
          subtitle="This will permanantely delete your chat history."
          onSuccess={() => {
            deleteChat(deleteChatId);
          }}
          // errorText={uploadUrlError}
          successLabel="Delete"
          cancelLabel="Cancel"
          loading={isDeleting}
        />
        <YModal
          isOpen={deleteAllModalOpen}
          onCancel={() => setDeleteAllModalOpen(false)}
          title="Delete All Chats"
          subtitle="This will permanantely delete all your chats."
          onSuccess={() => {
            deleteChats();
          }}
          // errorText={uploadUrlError}
          successLabel="Delete"
          cancelLabel="Cancel"
          loading={isDeleting}
        />
        <div className={styles.PageContent}>
          <div className={styles.HeaderText}>
            <YText>Chat sessions</YText>
          </div>
          <div className={styles.ContentList}>
            <div className={styles.SearchSection}>
              <YInput value={searchString} setValue={setSearchString} />
              <YButton
                label="Clear All"
                onClick={() => {
                  setDeleteAllModalOpen(true);
                }}
              />
            </div>
            {searchFilteredChats?.map((chat) => {
              if (!chat.messages[0]?.content) return null;
              return (
                <div key={chat.id}>
                  <HistoryContainer
                    icon="chat"
                    title={chat.messages[0]?.content}
                    onTitleClick={() => {
                      router.push(`/chat?id=${chat.id}`);
                    }}
                    date={chat.updatedAt}
                    leftLabelOne={chat.video.title as string}
                    showEdit={false}
                    showDelete={true}
                    onDeleteClick={() => {
                      setDeleteChatId(chat.id);
                      setDeleteModalOpen(true);
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

export default ChatListPage;
