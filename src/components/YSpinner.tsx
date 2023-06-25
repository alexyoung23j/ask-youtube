import ClipLoader from "react-spinners/ClipLoader";

type GSpinnerProps = {
  size: "small" | "medium" | "large";
  color?: string;
};

const YSpinner = ({ size, color = "#faf9f6" }: GSpinnerProps) => {
  const spinnerSize = size === "small" ? 20 : size === "medium" ? 50 : 80;
  return <ClipLoader color={color} size={spinnerSize} />;
};

export default YSpinner;
