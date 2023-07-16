import { GetServerSidePropsContext, type NextPage } from "next";
import { useSession, signOut, signIn } from "next-auth/react";
import PageLayout from "~/components/layouts";
import { redirectIfAuthed, redirectIfNotAuthed } from "~/utils/routing";
import styles from "@/styles/pages/signin.module.scss";
import YText from "~/components/YText";
import YInput from "~/components/YInput";
import { useState } from "react";
import YButton from "~/components/YButton";
import { GithubIcon, GoogleIcon } from "~/components/icons";
import { useRouter } from "next/router";

const SignInPage: NextPage = () => {
  const { data: sessionData } = useSession();
  const [email, setEmail] = useState("");

  const router = useRouter();
  const { error } = router.query;

  console.log({ error });
  return (
    <PageLayout topBar={false}>
      <div className={styles.SignIn}>
        <div className={styles.Card}>
          <div className={styles.CardContent}>
            <YText fontType="h3" className={styles.CardHeader}>
              Sign Up or Login
            </YText>
            {/* <div className={styles.Section}>
              <YInput
                showSearchIcon={false}
                placeholder="email@example.com"
                value={email}
                setValue={(val) => setEmail(val)}
              />
              <YButton label="Sign in" className={styles.WideButton} />
            </div>
            <div
              style={{
                display: "flex",
                width: "100%",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <YText fontType="h3" fontColor="light-grey" fontWeight="light">
                or
              </YText>
            </div> */}
            <div className={styles.Section}>
              <div
                className={styles.ProviderButton}
                onClick={() =>
                  void signIn("google", { callbackUrl: "/videos" })
                }
              >
                <YText fontType="h3" fontWeight="light">
                  Sign in with Google
                </YText>
                <GoogleIcon />
              </div>
              <div
                className={styles.ProviderButton}
                onClick={() =>
                  void signIn("github", { callbackUrl: "/videos" })
                }
              >
                <YText fontType="h3" fontWeight="light">
                  Sign in with Github
                </YText>
                <GithubIcon />
              </div>
            </div>
            {error && (
              <YText fontType="h4" className={styles.Error} fontWeight="light">
                {error === "OAuthAccountNotLinked"
                  ? "Email is linked with another provider"
                  : "Error"}
              </YText>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );

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
