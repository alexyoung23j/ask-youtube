/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import styles from "@/styles/pages/chat.module.scss";
import { useState, useEffect } from "react";
import YouTube, { YouTubeProps } from "react-youtube";
import {
  type ChunkGroup,
  TranscriptViewer,
} from "~/components/TranscriptViewer";

export const YoutubePlayer = ({
  timestamp,
  videoId,
  playerRef,
  onReady,
  onClick,
  transcription,
}: {
  timestamp: number;
  videoId: string;
  playerRef: React.MutableRefObject<any>;
  onReady: YouTubeProps["onReady"];
  onClick: Function;
  transcription: Array<ChunkGroup>;
}) => {

  // track the timestamp of the player as an internal state and update
  // it every .5s or so so that it can be passed to the transcription for highlighting
  const [playerTimestamp, setPlayerTimestamp] = useState(timestamp);
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (playerRef && playerRef.current) {
        const newTime = playerRef.current.getCurrentTime();
        if (newTime !== playerTimestamp) {
          setPlayerTimestamp(newTime);
        }
      }
    }, 500);

    return () => clearInterval(intervalId);
  }, [playerRef, playerTimestamp]);

  useEffect(() => {
    if (
      playerRef &&
      playerRef.current &&
      typeof playerRef.current.seekTo === "function" &&
      timestamp !== 0
    ) {
      playerRef.current.seekTo(timestamp, true);
      onClick();
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

  // since TranscriptViewer is now inside YoutubePlayer, we need
  // an empty dummy div to preserve the organization from before
  return (
    <div>
      <div className={styles.PlayerContainer}>
        <div className={styles.Player}>
          <YouTube videoId={videoId} opts={opts} onReady={onReady} />
        </div>
      </div>
      <TranscriptViewer
        transcript={transcription as unknown as Array<ChunkGroup>}
        timestamp={playerTimestamp}
      />
    </div>
  );
};
