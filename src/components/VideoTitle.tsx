import styles from "@/styles/pages/chat.module.scss";
import { YoutubeIcon, LinkIcon } from "./icons";
import YText from "./YText";

export const VideoTitle = ({ title, url }: { title: string; url: string }) => {
  return (
    <div
      className={styles.VideoTitle}
      onClick={() => {
        window.open(url, "_blank");
      }}
    >
      <div
        style={{
          width: "16px",
          height: "16px",
          margin: "4px",
          cursor: "pointer",
        }}
      >
        <YoutubeIcon />
      </div>
      <YText fontType="h3">{title}</YText>
      <div
        style={{
          width: "12px",
          height: "12px",
          margin: "4px",
          marginTop: "3px",
        }}
      >
        <LinkIcon />
      </div>
    </div>
  );
};
