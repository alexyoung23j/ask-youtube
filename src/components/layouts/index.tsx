/* eslint-disable @typescript-eslint/restrict-template-expressions */
import styles from "@/styles/components/layout.module.scss";
import { ReactNode } from "react";
import { useMediaQuery } from "react-responsive";
import { Logo } from "../icons";
import { useRouter } from "next/router";
import { Libre_Baskerville } from "@next/font/google";

const baskerville = Libre_Baskerville({
  weight: ["400", "700"],
  style: ["normal"],
  display: "block",
  subsets: ["latin"],
});

const PageLayout = ({
  logo = true,
  logoReplacementContent,
  centerContent,
  rightContent,
  children,
  limitWidth = true,
  topBar = true,
}: {
  logo?: boolean;
  logoReplacementContent?: JSX.Element;
  centerContent?: JSX.Element;
  rightContent?: JSX.Element;
  children?: ReactNode | undefined;
  limitWidth?: boolean;
  topBar?: boolean;
}) => {
  const isMobileScreen = useMediaQuery({ query: "(max-width: 800px)" });
  const router = useRouter();

  return (
    <div className={styles.MainBody}>
      {topBar && (
        <div className={styles.TopBar}>
          <div
            className={`${styles.Content} ${
              limitWidth ? styles.LimitWidth : ""
            }`}
          >
            {logo && !isMobileScreen ? (
              <div className={baskerville.className}>
                <div
                  className={styles.LogoSection}
                  onClick={() => {
                    void router.push("/");
                  }}
                >
                  <Logo />
                  <div style={{ fontSize: "18px" }}>askyoutube</div>
                </div>
              </div>
            ) : (
              logoReplacementContent
            )}
            {centerContent}
            {rightContent}
          </div>
        </div>
      )}
      <div className={styles.Children}>{children}</div>
    </div>
  );
};

export default PageLayout;
