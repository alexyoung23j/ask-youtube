import styles from "@/styles/components/layout.module.scss";
import { ReactNode } from "react";

const PageLayout = ({
  logo = true,
  logoReplacementContent,
  centerContent,
  rightContent,
  children,
}: {
  logo?: boolean;
  logoReplacementContent?: JSX.Element;
  centerContent?: JSX.Element;
  rightContent?: JSX.Element;
  children?: ReactNode | undefined;
}) => {
  return (
    <div className={styles.MainBody}>
      <div className={styles.TopBar}>
        {logo ? <div>logo </div> : logoReplacementContent}
        {centerContent}
        {rightContent}
      </div>
      <div className={styles.Children}>{children}</div>
    </div>
  );
};

export default PageLayout;
