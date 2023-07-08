import styles from "@/styles/pages/chat.module.scss";
import { Timestamp } from "./Timestamp";
import YLoading from "./YLoading";
import YText from "./YText";
import { AIAvatar, UserAvatar } from "./icons";
import { useMediaQuery } from "react-responsive";

export const ChatMessage = ({
  content,
  sender,
  timestamps,
  videoId,
  onTimestampClick,
  isLoading,
}: {
  content: string;
  sender: string;
  timestamps: number[];
  videoId?: string;
  onTimestampClick: (timestamp: number) => void;
  isLoading: boolean;
}) => {
  const isMobileScreen = useMediaQuery({ query: "(max-width: 800px)" });

  return (
    <div
      style={{
        backgroundColor: sender === "AI" ? "#faf9f6" : "none",
        display: "flex",
        justifyContent: "center",
        borderTop:
          sender === "AI" && content.length > 0 ? "1px solid #e5e3da" : "none",
        borderBottom:
          sender === "AI" && content.length > 0 ? "1px solid #e5e3da" : "none",
      }}
    >
      <div className={styles.ChatMessage}>
        <div
          style={{
            minWidth: "28px",
            minHeight: "28px",
            margin: "4px",
            marginRight: "8px",
          }}
        >
          {sender === "AI" ? <AIAvatar /> : <UserAvatar />}
        </div>
        <div style={{ display: "flex", gap: "16px", flexDirection: "column" }}>
          {content.length === 0 && isLoading ? (
            <div style={{ marginTop: "7px" }}>
              <YLoading size="small" />
            </div>
          ) : (
            <YText
              fontType={isMobileScreen ? "h4" : "h3"}
              className={styles.MessageText}
            >
              {content}
            </YText>
          )}
          {sender === "AI" && timestamps.length > 0 && (
            <div className={styles.TimestampContainer}>
              {timestamps.slice(0, 3).map((timestamp) => {
                return (
                  <div key={timestamp}>
                    <Timestamp
                      timestamp={timestamp}
                      onClick={() => {
                        onTimestampClick(timestamp);
                      }}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
