import { GetServerSidePropsContext, type NextPage } from "next";
import { useSession, signOut, signIn } from "next-auth/react";
import { redirectIfAuthed, redirectIfNotAuthed } from "~/utils/routing";

const SignInPage: NextPage = () => {
  const { data: sessionData } = useSession();

  return (
    <div>
      <button onClick={() => void signIn("google", { callbackUrl: "/chats" })}>
        {sessionData ? "Sign Out" : "Sign in"}
      </button>
    </div>
  );
};

export async function getServerSideProps(ctx: GetServerSidePropsContext) {
  // Redirect to Landing Page if Not Logged in
  return redirectIfAuthed({
    ctx,
    buildRedirectUrl: (session) => {
      return "/chats";
    },
  });
}

export default SignInPage;
