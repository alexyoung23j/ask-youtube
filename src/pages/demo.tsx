import { GetServerSidePropsContext, type NextPage } from "next";
import { useSession, signOut, signIn } from "next-auth/react";
import { redirectIfNotAuthed } from "~/utils/routing";

const DemoPage: NextPage = () => {
  const { data: sessionData } = useSession();

  return (
    <div>
      Chat Demo
      <button
        onClick={sessionData ? () => void signOut() : () => void signIn()}
      >
        {sessionData ? "Sign out" : "Sign in"}
      </button>
    </div>
  );
};

export default DemoPage;
