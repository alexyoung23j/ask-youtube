import styles from "@/styles/components/ytext.module.scss";
import { Inter } from "@next/font/google";
import { ComponentType } from "./helpers/types";
import { getClassName } from "./helpers/utils";

type FontWeight =
  | "light"
  | "regular"
  | "medium"
  | "bold"
  | "italic"
  | "underline";
export type FontColor = "white" | "black" | "grey";

export type FontType =
  | "large"
  | "h1"
  | "h2"
  | "h2-subtitle"
  | "h3"
  | "h3-subtitle"
  | "h3andahalf"
  | "h4"
  | "h4-subtitle"
  | "h5"
  | "h5-subtitle"
  | "h6"
  | "h7";

type GTextProps = {
  children: React.ReactNode;
  fontType?: FontType;
  fontWeight?: FontWeight;
  fontColor?: FontColor;
  className?: string;
  notSelectable?: boolean;
  align?: "left-align" | "center-align" | "right-align";
  display?: "block" | "inline" | "flex";
  onClick?: (e?: React.MouseEvent) => void;
  attrs?: any;
  href?: string;
  wrap?: string;
};

const inter = Inter({
  weight: ["100", "300", "400", "500", "700", "900"],
  style: ["normal"],
  display: "block",
  subsets: ["latin"],
});

const YText = ({
  children,
  fontType = "h1",
  fontWeight = "regular",
  fontColor = "black",
  className,
  notSelectable,
  wrap = "none",
  align = "left-align",
  display = "flex",
  onClick,
  attrs,
  href,
}: GTextProps) => {
  return (
    <span className={inter.className} {...attrs} style={{ display: "inherit" }}>
      <span
        className={getClassName(
          ComponentType.Text,
          styles,
          {
            fontType,
            fontWeight,
            align,
            fontColor,
            display,
            wrap,
          },
          className
        )}
        onClick={onClick}
      >
        {children}
      </span>
    </span>
  );
};

export default YText;
