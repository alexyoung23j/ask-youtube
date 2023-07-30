/* eslint-disable @typescript-eslint/restrict-template-expressions */
import styles from "@/styles/components/layout.module.scss";
import { ReactNode } from "react";
import { useMediaQuery } from "react-responsive";
import { Logo } from "../icons";
import { useRouter } from "next/router";

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
              <div
                style={{ cursor: "pointer" }}
                onClick={() => {
                  void router.push("/");
                }}
              >
                <Logo />
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
