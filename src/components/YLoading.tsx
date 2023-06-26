import BeatLoader from "react-spinners/BeatLoader";

type GSpinnerProps = {
  size: "small" | "medium" | "large";
  color?: string;
};

const YLoading = ({ size, color = "#a6a6a6" }: GSpinnerProps) => {
  const spinnerSize = size === "small" ? 5 : size === "medium" ? 10 : 15;
  return <BeatLoader color={color} size={spinnerSize} />;
};

export default YLoading;
