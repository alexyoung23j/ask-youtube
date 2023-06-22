export function parseYouTubeURL(url: string): string {
  const regex = /(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regex);
  if (match && match[2]?.length == 11) {
    return "https://www.youtube.com/watch?v=" + match[2];
  } else {
    throw new Error("Invalid YouTube URL");
  }
}

export function removeOverlappingTimestamps(
  timestamps: number[],
  overlapLength: number
): number[] {
  // Convert all timestamps to numbers
  const numericTimestamps = timestamps.map(Number).sort((a, b) => a - b);

  let lastTimestamp: number | null = null;

  // Use a reducer to filter out overlapping timestamps
  const nonOverlappingTimestamps = numericTimestamps.reduce<number[]>(
    (result, current) => {
      // Check if current timestamp is not overlapping with the last one in the result
      if (lastTimestamp === null || current - lastTimestamp >= overlapLength) {
        result.push(current);
        lastTimestamp = current;
      }
      return result;
    },
    []
  );

  return nonOverlappingTimestamps;
}
