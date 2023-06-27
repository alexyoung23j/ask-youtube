import styles from "@/styles/pages/chat.module.scss";
import { secondsToTimestamp } from "~/utils/helpers";
import { YoutubeIcon } from "./icons";
import YText from "./YText";

export const Timestamp = ({
  timestamp,
  onClick,
}: {
  timestamp: number;
  onClick?: () => void;
}) => {
  return (
    <div className={styles.Timestamp} onClick={onClick}>
      <div
        style={{
          minWidth: "20px",
          minHeight: "20px",
          marginTop: "3px",
        }}
      >
        <YoutubeIcon />
      </div>
      <YText fontType="h4" fontWeight="light">
        {secondsToTimestamp(timestamp)}
      </YText>
    </div>
  );
};
