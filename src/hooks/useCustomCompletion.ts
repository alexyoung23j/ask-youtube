import { useState, useEffect, useRef } from "react";
import { useChat, useCompletion } from "ai/react";
import { debounce } from "~/components/helpers/utils";

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
  const [completedAnswerStream, setCompletedAnswerStream] = useState(false);
  const [jsonFormattingBroken, setJsonFormattingBroken] = useState(false);

  useEffect(() => {
    const newLineRegex = /\n\s*/g;
    const parsedCompletion = completion.replace(newLineRegex, "");
    const startInd = parsedCompletion.indexOf('"answer": "');

    if (startInd === -1 && parsedCompletion.length > 10 && isLoading) {
      // The case where JSON output is not happening
      setJsonFormattingBroken(true);
    }

    if (!completedAnswerStream && isLoading && !jsonFormattingBroken) {
      // JSON output is happening
      const endInd =
        parsedCompletion.indexOf('", "', startInd) !== -1
          ? parsedCompletion.indexOf('", "', startInd)
          : parsedCompletion.indexOf('","', startInd);

      if (startInd !== -1 && parsedCompletion.length > startInd + 17) {
        if (endInd) {
          const answer = parsedCompletion.slice(startInd + 11, endInd - 1);
          setAnswerText(answer);
        } else {
          const answer = parsedCompletion.slice(
            startInd + 8,
            parsedCompletion.length - 7
          );
          setAnswerText(answer);
        }
      }

      if (parsedCompletion.endsWith("}")) {
        if (onMessageEnd) {
          onMessageEnd(completion);
        }
        setCompletedAnswerStream(true);
      }
    } else if (jsonFormattingBroken) {
      setAnswerText(completion);
    }
  }, [completion, onMessageEnd, completedAnswerStream]);

  useEffect(() => {
    if (jsonFormattingBroken && !isLoading && !completedAnswerStream) {
      // JSON formatting was broken, so we re-format it
      const debouncedOnMessageEnd = debounce(
        (result: { answer: string; usedTimestamps: number[] }) => {
          if (onMessageEnd) {
            onMessageEnd(JSON.stringify(result));
          }
        },
        1000
      ); // delay of 1000ms

      debouncedOnMessageEnd({ answer: completion, usedTimestamps: [] });
      setCompletedAnswerStream(true);
      setJsonFormattingBroken(false);
    }
  }, [
    jsonFormattingBroken,
    isLoading,
    completion,
    completedAnswerStream,
    onMessageEnd,
  ]);

  return {
    complete,
    completion,
    answerText,
    isLoading,
    input,
    handleInputChange,
    handleSubmit,
    stop,
    setAnswerText,
    setCompletedAnswerStream,
  };
};

export default useCustomCompletion;
