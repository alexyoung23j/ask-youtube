import { GetServerSidePropsContext, type NextPage } from "next";
import { useSession, signOut, signIn } from "next-auth/react";
import { redirectIfAuthed, redirectIfNotAuthed } from "~/utils/routing";

const ErrorPage: NextPage = () => {
  const { data: sessionData } = useSession();

  return (
    <div>
      ERROR
      <button
        onClick={sessionData ? () => void signOut() : () => void signIn()}
      >
        {sessionData ? "Sign out" : "Sign in"}
      </button>
    </div>
  );
};

export default ErrorPage;
