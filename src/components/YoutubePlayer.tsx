/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import styles from "@/styles/pages/chat.module.scss";
import { useEffect } from "react";
import YouTube, { YouTubeProps } from "react-youtube";

export const YoutubePlayer = ({
  timestamp,
  videoId,
  playerRef,
  onReady,
}: {
  timestamp: number;
  videoId: string;
  playerRef: React.MutableRefObject<any>;
  onReady: YouTubeProps["onReady"];
}) => {
  useEffect(() => {
    if (
      playerRef &&
      playerRef.current &&
      typeof playerRef.current.seekTo === "function" &&
      timestamp !== 0
    ) {
      playerRef.current.seekTo(timestamp, true);
    }
  }, [timestamp]);

  const opts = {
    height: "100%",
    width: "100%",
    playerVars: {
      // https://developers.google.com/youtube/player_parameters
      autoplay: 1 as 0 | 1 | undefined,
      rel: 0 as 0 | 1 | undefined,
      showinfo: 0 as 0 | 1 | undefined,
      modestbranding: 1 as 1 | undefined,
    },
  };

  return (
    <div className={styles.PlayerContainer}>
      <div className={styles.Player}>
        <YouTube videoId={videoId} opts={opts} onReady={onReady} />
      </div>
    </div>
  );
};
