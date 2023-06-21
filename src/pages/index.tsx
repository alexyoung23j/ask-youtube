/* eslint-disable @typescript-eslint/no-floating-promises */
import styles from "./index.module.css";
import { type NextPage } from "next";
import { signIn, signOut, useSession } from "next-auth/react";
import Head from "next/head";
import Link from "next/link";
import { api } from "~/utils/api";
import { useEffect, useState } from "react";
import { useChat, useCompletion } from "ai/react";
import useCustomCompletion from "~/hooks/useCustomCompletion";
import { useRouter } from "next/router";

const Home: NextPage = () => {
  // const hello = api.example.hello.useQuery({ text: "from tRPC" });
  const { data: sessionData } = useSession();
  const router = useRouter();

  return (
    <>
      <Head>
        <title>Create T3 App</title>
        <meta name="description" content="Generated by create-t3-app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div>
        Hi
        <button
          onClick={sessionData ? () => void signOut() : () => void signIn()}
        >
          {sessionData ? "Sign out" : "Sign in"}
        </button>
        <button
          onClick={() => {
            router.push("/demo");
          }}
        >
          Demo
        </button>
      </div>
    </>
  );
};

export default Home;

const AuthShowcase = () => {
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [chatId, setChatId] = useState("");
  // const {
  //   completion,
  //   complete,
  //   input,
  //   stop,
  //   isLoading,
  //   handleInputChange,
  //   handleSubmit,
  // } = useCompletion({
  //   api: "/api/completion",
  //   body: {
  //     url: url,
  //     chatId: chatId,
  //   },
  //   onResponse: (res) => {
  //     console.log("onResponse", res); // I think some error handling can happen here
  //   },
  // });

  const { complete, answerText } = useCustomCompletion({
    api: "/api/completion",
    body: {
      url: url,
      chatId: chatId,
    },
    onMessageEnd: (text: string) => {
      console.log("onMessageEnd", text);
    },
  });

  const { data: sessionData } = useSession();

  const generateTranscription =
    api.transcribe.startTranscriptionJob.useMutation();

  const generateResponse = async () => {
    try {
      const res = await complete(text);
      console.log("im doneee", res);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className={styles.authContainer}>
      <div style={{ color: "white" }}>{answerText}</div>
      <input
        value={url}
        onInput={(e) => {
          setUrl(e.currentTarget.value);
        }}
      ></input>
      <button
        onClick={() => {
          generateTranscription.mutate({ url });
        }}
      >
        Transcribe
      </button>

      <input
        value={text}
        onInput={(e) => {
          setText(e.currentTarget.value);
        }}
      ></input>
      <button onClick={() => void generateResponse()}>Ask</button>
      {/* <p className={styles.showcaseText}>
        {sessionData && <span>Logged in as {sessionData.user?.name}</span>}
        {secretMessage && <span> - {secretMessage}</span>}
      </p> */}
      <button
        onClick={sessionData ? () => void signOut() : () => void signIn()}
      >
        {sessionData ? "Sign out" : "Sign in"}
      </button>
    </div>
  );
};
