/* eslint-disable @typescript-eslint/no-floating-promises */
import { type NextPage } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import PageLayout from "~/components/layouts";
import YText from "~/components/YText";
import styles from "@/styles/pages/landing.module.scss";
import { Baskervville } from "@next/font/google";
import YButton from "~/components/YButton";

const baskerville = Baskervville({
  weight: ["400"],
  style: ["normal"],
  display: "block",
  subsets: ["latin"],
});

const Home: NextPage = () => {
  // const hello = api.example.hello.useQuery({ text: "from tRPC" });
  const router = useRouter();

  return (
    <PageLayout
      logo={true}
      limitWidth={false}
      logoReplacementContent={<></>}
      rightContent={
        <YText
          fontType="h3"
          className={styles.Text}
          onClick={() => {
            void router.push("/videos");
          }}
        >
          Get Started →
        </YText>
      }
    >
      <Head>
        <title>Ask Youtube</title>
        <meta
          name="description"
          content="Get video insights in natural language"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className={baskerville.className} style={{ overflow: "hidden" }}>
        <div className={styles.LandingPage}>
          <div className={styles.SectionOne}>
            <div className={styles.Header}>
              <div className={styles.HeaderText}>
                Chat with any{" "}
                <span className={styles.YoutubeWord}>Youtube</span> Video
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "6px",
                  flexDirection: "column",
                  marginBottom: "35px",
                }}
              >
                <YText className={styles.SubtitleText} fontWeight="light">
                  Question videos, unearth insights, and uncover the best
                  moments with blazing speed.
                </YText>
                <YText className={styles.SubtitleText} fontWeight="light">
                  A powerful AI tool for efficient study and research.
                </YText>
              </div>
              <div className={styles.CTASection}>
                <YButton
                  label="Get started now"
                  onClick={() => {
                    void router.push("/videos");
                  }}
                  className={styles.CTAButton}
                />
                <YText
                  fontType="h3"
                  className={styles.Text}
                  onClick={() => {
                    void router.push("/demo");
                  }}
                >
                  Try the demo →
                </YText>
              </div>
            </div>
            <div className={styles.VideoSection}>
              <video
                autoPlay
                playsInline
                muted
                loop
                style={{ height: "100%", width: "100%" }}
                src={
                  "https://zdkeniqritfgbdjlcccf.supabase.co/storage/v1/object/public/Ask%20Youtube%20Assets/FinalDemo.mp4?t=2023-07-29T04%3A11%3A01.010Z"
                }
                poster="https://zdkeniqritfgbdjlcccf.supabase.co/storage/v1/object/public/Ask%20Youtube%20Assets/video-capture-1046.png"
              ></video>
            </div>
            <div className={styles.CTA2Section}>
              <YText className={styles.Subtitle2Text} fontWeight="light">
                Stop using the comments section to find the timestamps you need.
              </YText>

              <YButton
                label="Get started for free"
                onClick={() => {
                  void router.push("/videos");
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default Home;
