import styles from "@/styles/components/history_container.module.scss";
import YText from "./YText";
import { formatDistanceToNow } from "date-fns";
import { ChatIcon, EditIcon, LinkIcon, TrashIcon } from "./icons";
import YSpinner from "./YSpinner";
import { useMediaQuery } from "react-responsive";

const HistoryContainer = ({
  icon,
  title,
  onTitleClick,
  date,
  leftLabelOne,
  showEdit,
  showDelete,
  onEditClick,
  onDeleteClick,
  onIconClick,
  transcribing = false,
}: {
  icon: string;
  title: string;
  onTitleClick: () => void;
  date: Date;
  leftLabelOne: string;
  showEdit: boolean;
  showDelete: boolean;
  onEditClick?: () => void;
  onDeleteClick?: () => void;
  onIconClick?: () => void;
  transcribing?: boolean;
}) => {
  const isMobileScreen = useMediaQuery({ query: "(max-width: 800px)" });

  const lengthCutoff = isMobileScreen ? 30 : 70;

  return (
    <div className={styles.HistoryContainer}>
      <div className={styles.LeftContent}>
        {transcribing ? (
          <YSpinner size="small" color="#a6a6a6" />
        ) : (
          <div
            style={{
              width: "16px",
              height: "16px",
              margin: "4px",
              cursor: "pointer",
            }}
            onClick={onIconClick}
          >
            {icon === "link" ? <LinkIcon /> : <ChatIcon />}
          </div>
        )}

        <YText
          fontType="h3"
          className={styles.TextUnderline}
          onClick={onTitleClick}
        >
          {title && title.length > lengthCutoff
            ? `${title.substring(0, lengthCutoff - 3)}...`
            : title}
        </YText>
      </div>
      {!isMobileScreen && (
        <div className={styles.RightContent}>
          <YText
            fontType="h3"
            fontColor="grey"
            fontWeight="light"
            className={styles.TextContainer}
          >
            {leftLabelOne.length > 50
              ? `${leftLabelOne.substring(0, 47)}...`
              : leftLabelOne}
          </YText>
          {transcribing ? (
            <YText
              fontType="h3"
              fontColor="grey"
              fontWeight="light"
              className={styles.TextContainer}
            >
              transcribing...
            </YText>
          ) : (
            <YText
              fontType="h3"
              fontColor="grey"
              fontWeight="light"
              className={styles.TextContainer}
            >
              {`${formatDistanceToNow(date, { addSuffix: false })}`
                .replace(/about/g, "")
                .replace(/less than/g, "")
                .trim()}{" "}
              ago
            </YText>
          )}
          {showEdit && !isMobileScreen && (
            <div
              style={{
                cursor: "pointer",
                width: "16px",
                height: "16px",
                margin: "4px",
              }}
              onClick={onEditClick}
            >
              <EditIcon />
            </div>
          )}
          {!isMobileScreen && (
            <div
              style={{
                cursor: "pointer",
                width: "16px",
                height: "16px",
                margin: "4px",
              }}
              onClick={onDeleteClick}
            >
              <TrashIcon />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HistoryContainer;
