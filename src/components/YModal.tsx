/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import React from "react";
import Modal from "react-modal";
import { getClassName } from "./helpers/utils";
import { ComponentType } from "./helpers/types";
import styles from "@/styles/components/ymodal.module.scss";
import YText from "./YText";
import YButton from "./YButton";
import YSpinner from "./YSpinner";

// eslint-disable-next-line @typescript-eslint/no-unsafe-call
Modal.setAppElement("body");

const customStyles = {
  overlay: {
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  content: {
    top: "50%",
    left: "50%",
    right: "auto",
    bottom: "auto",
    marginRight: "-50%",
    transform: "translate(-50%, -50%)",
    transition: "transform 0.3s",
    border: "1px solid #e5e3da",
    borderRadius: "4px",
  },
};

const YModal = ({
  isOpen,
  title,
  subtitle,
  content,
  successLabel,
  cancelLabel,
  errorText = "",
  onSuccess,
  onCancel,
  className,
  loading,
}: {
  isOpen: boolean;
  title?: string;
  subtitle?: string;
  content?: React.ReactNode;
  successLabel?: string;
  cancelLabel?: string;
  errorText?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  className?: string;
  loading?: boolean;
}) => (
  <Modal
    isOpen={isOpen}
    onRequestClose={onCancel}
    style={customStyles}
    contentLabel={title}
  >
    <div className={getClassName(ComponentType.Modal, styles, {}, className)}>
      <YText fontWeight="medium" fontType="h2">
        {title}
      </YText>
      <YText fontType="h3" fontWeight="light">
        {subtitle}
      </YText>
      <div style={{ marginTop: "4px", marginBottom: "4px" }}>
        {content && content}
      </div>
      {errorText.length > 0 && (
        <YText className={styles.ErrorText} fontType="h4">
          {errorText}
        </YText>
      )}
      <div className={styles.BottomSection}>
        <YButton
          label={!loading ? successLabel : ""}
          onClick={onSuccess}
          className={styles.Buttons}
        >
          {loading && <YSpinner size="small" />}
        </YButton>
        <YButton
          label={cancelLabel}
          onClick={onCancel}
          buttonType="secondary"
          className={styles.Buttons}
        />
      </div>
    </div>
  </Modal>
);

export default YModal;
