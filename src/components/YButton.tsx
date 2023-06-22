import styles from "@/styles/components/ybutton.module.scss";
import { ComponentType } from "./helpers/types";
import { getClassName } from "./helpers/utils";
import YText from "./YText";
import { ReactNode } from "react";

const YButton = ({
  label = "label",
  children,
  className,
  onClick,
}: {
  label?: string;
  children?: ReactNode | undefined;
  className?: string;
  onClick?: (e?: React.MouseEvent) => void;
}) => {
  return (
    <div
      className={getClassName(ComponentType.Button, styles, {}, className)}
      onClick={(e) => {
        if (onClick) onClick(e);
      }}
    >
      {children ? (
        children
      ) : (
        <YText fontType="h3" fontColor="white">
          {label}
        </YText>
      )}
    </div>
  );
};

export default YButton;
