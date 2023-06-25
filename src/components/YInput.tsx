import styles from "@/styles/components/yinput.module.scss";
import { ComponentType } from "./helpers/types";
import { getClassName } from "./helpers/utils";
import { SearchIcon } from "./icons";
import { Inter } from "@next/font/google";

const inter = Inter({
  weight: ["100", "300", "400", "500", "700", "900"],
  style: ["normal"],
  display: "block",
  subsets: ["latin"],
});

const YInput = ({
  value,
  setValue,
  className,
  showSearchIcon = true,
  placeholder = "Search",
}: {
  value: string;
  setValue: (value: string) => void;
  className?: string;
  showSearchIcon?: boolean;
  placeholder?: string;
}) => {
  return (
    <div className={getClassName(ComponentType.Input, styles, {}, className)}>
      {showSearchIcon && (
        <div
          style={{
            width: "16px",
            height: "16px",
            margin: "4px",
          }}
        >
          <SearchIcon />
        </div>
      )}
      <div
        className={inter.className}
        style={{ display: "flex", width: "100%" }}
      >
        <input
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
          }}
          className={styles.Input}
          placeholder={placeholder}
        ></input>
      </div>
    </div>
  );
};

export default YInput;
