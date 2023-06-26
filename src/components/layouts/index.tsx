import styles from "@/styles/components/layout.module.scss";
import { ReactNode } from "react";

const PageLayout = ({
  logo = true,
  logoReplacementContent,
  centerContent,
  rightContent,
  children,
  limitWidth = true,
}: {
  logo?: boolean;
  logoReplacementContent?: JSX.Element;
  centerContent?: JSX.Element;
  rightContent?: JSX.Element;
  children?: ReactNode | undefined;
  limitWidth?: boolean;
}) => {
  return (
    <div className={styles.MainBody}>
      <div className={styles.TopBar}>
        <div
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
          className={`${styles.Content} ${limitWidth ? styles.LimitWidth : ""}`}
        >
          {logo ? <div>placeholder</div> : logoReplacementContent}
          {centerContent}
          {rightContent}
        </div>
      </div>
      <div className={styles.Children}>{children}</div>
    </div>
  );
};

export default PageLayout;
