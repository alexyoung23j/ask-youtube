import styles from "@/styles/components/history_container.module.scss";
import YText from "./YText";
import { formatDistanceToNow } from "date-fns";
import { EditIcon, LinkIcon, TrashIcon } from "./icons";

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
}) => {
  return (
    <div className={styles.HistoryContainer}>
      <div className={styles.LeftContent}>
        {icon === "link" ? (
          <div
            style={{
              width: "16px",
              height: "16px",
              margin: "4px",
              cursor: "pointer",
            }}
            onClick={onIconClick}
          >
            <LinkIcon />
          </div>
        ) : (
          <div>hi</div>
        )}
        <YText
          fontType="h3"
          className={styles.TextUnderline}
          onClick={onTitleClick}
        >
          {title && title.length > 80 ? `${title.substring(0, 77)}...` : title}
        </YText>
      </div>
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
