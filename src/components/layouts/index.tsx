/* eslint-disable @typescript-eslint/restrict-template-expressions */
import styles from "@/styles/components/layout.module.scss";
import { ReactNode } from "react";

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
  return (
    <div className={styles.MainBody}>
      {topBar && (
        <div className={styles.TopBar}>
          <div
            className={`${styles.Content} ${
              limitWidth ? styles.LimitWidth : ""
            }`}
          >
            {logo ? <div>placeholder</div> : logoReplacementContent}
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
