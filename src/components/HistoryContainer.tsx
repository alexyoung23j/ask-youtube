import styles from "@/styles/components/history_container.module.scss";
import YText from "./YText";
import { formatDistanceToNow } from "date-fns";
import { EditIcon, TrashIcon } from "./icons";

const HistoryContainer = ({
  icon,
  title,
  onTitleClick,
  date,
  length,
  showEdit,
  showDelete,
  onEditClick,
  onDeleteClick,
}: {
  icon: string;
  title: string;
  onTitleClick: () => void;
  date: Date;
  length: number;
  showEdit: boolean;
  showDelete: boolean;
  onEditClick?: () => void;
  onDeleteClick?: () => void;
}) => {
  return (
    <div className={styles.HistoryContainer}>
      <div className={styles.LeftContent}>
        <div>i</div>
        <YText
          fontType="h3"
          className={styles.TextUnderline}
          onClick={onTitleClick}
        >
          {title.length > 80 ? `${title.substring(0, 77)}...` : title}
        </YText>
      </div>
      <div className={styles.RightContent}>
        <YText
          fontType="h3"
          fontColor="grey"
          fontWeight="light"
          className={styles.TextContainer}
        >
          {Math.floor(length / 3600) > 0
            ? `${Math.floor(length / 3600)}h `
            : ""}
          {Math.floor((length % 3600) / 60)}m
        </YText>
        <YText
          fontType="h3"
          fontColor="grey"
          fontWeight="light"
          className={styles.TextContainer}
        >
          {`${formatDistanceToNow(date, { addSuffix: false })}`
            .replace(/about/g, "")
            .trim()}{" "}
          ago
        </YText>
        {showEdit && (
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
      </div>
    </div>
  );
};

export default HistoryContainer;
