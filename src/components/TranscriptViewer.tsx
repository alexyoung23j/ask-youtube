import { Inter } from "@next/font/google";
import styles from "@/styles/pages/chat.module.scss";
import { useMemo, useRef, createRef, useState, useEffect } from "react";

const inter = Inter({
  weight: ["100", "300", "400", "500", "700", "900"],
  style: ["normal"],
  display: "block",
  subsets: ["latin"],
});

export interface TextChunk {
  start: number;
  end: number;
  text: string;
}

export interface ChunkGroup {
  start: number;
  end: number;
  num_words: number;
  sentences: Array<TextChunk>;
}

export const TranscriptViewer = ({
  transcript,
  timestamp,
}: {
  transcript: Array<ChunkGroup>;
  timestamp: number;
}) => {
  const allSentences = useMemo(
    () =>
      transcript.flatMap((t, tIndex) =>
        t.sentences.map((s) => ({ ...s, parentIndex: tIndex }))
      ),
    [transcript]
  );
  const refs = useRef(allSentences.map(() => createRef<HTMLSpanElement>()));
  const [highlightedIndices, setHighlightedIndices] = useState<number[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let idx = allSentences.findIndex(
      (s) => timestamp >= s.start && timestamp <= s.end
    );
    if (idx === -1) {
      idx = allSentences.findIndex((s) => timestamp < s.start);
      if (idx !== -1) idx -= 1;
    }

    if (idx !== -1) {
      const node = refs.current[idx]?.current;
      const container = containerRef.current;
      if (node && container) {
        container.scrollTop = node.offsetTop - container.offsetTop - 24;
      }
      setHighlightedIndices(
        [idx, idx + 1, idx + 2].filter((i) => i < allSentences.length)
      );
    }
  }, [timestamp, allSentences]);

  return (
    <div className={inter.className}>
      <div className={styles.TranscriptWrapper}>
        <div ref={containerRef} className={styles.TranscriptSection}>
          {allSentences.map((s, i) => {
            const nextSentence = allSentences[i + 1];
            const isLastInGroup =
              !nextSentence || nextSentence.parentIndex !== s.parentIndex;

            return (
              <span
                key={i}
                ref={refs.current[i]}
                className={
                  highlightedIndices.includes(i) ? styles.Highlighted : ""
                }
              >
                {s.text + " "}
                {isLastInGroup && (
                  <>
                    <br /> <br />
                  </>
                )}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
};
