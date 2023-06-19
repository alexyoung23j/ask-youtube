import { useState, useEffect, useRef } from "react";
import { useChat, useCompletion } from "ai/react";

const useCustomCompletion = ({
  api,
  body,
  onResponse,
  onMessageEnd,
}: {
  api: string;
  body: object;
  onResponse?: (response: Response) => void;
  onMessageEnd?: (text: string) => void;
}) => {
  const {
    completion,
    complete,
    input,
    stop,
    isLoading,
    handleInputChange,
    handleSubmit,
  } = useCompletion({ api, body, onResponse });

  const [answerText, setAnswerText] = useState("");

  useEffect(() => {
    const newLineRegex = /\n\s*/g;
    const parsedCompletion = completion.replace(newLineRegex, "");
    const startInd = parsedCompletion.indexOf('{"answer": "');
    const endInd =
      parsedCompletion.indexOf('", "', startInd) !== -1
        ? parsedCompletion.indexOf('", "', startInd)
        : parsedCompletion.indexOf('","', startInd);

    if (startInd !== -1 && parsedCompletion.length > startInd + 17) {
      if (endInd) {
        const answer = parsedCompletion.slice(startInd + 12, endInd);
        setAnswerText(answer);
      } else {
        const answer = parsedCompletion.slice(
          startInd + 9,
          parsedCompletion.length - 5
        );
        setAnswerText(answer);
      }
    }

    if (parsedCompletion.endsWith("}")) {
      if (onMessageEnd) {
        onMessageEnd(answerText);
      }
    }
  }, [completion, onMessageEnd]);

  return {
    complete,
    answerText,
  };
};

export default useCustomCompletion;
