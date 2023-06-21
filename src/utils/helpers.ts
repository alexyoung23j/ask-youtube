export function parseYouTubeURL(url: string): string {
  const regex = /(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regex);
  if (match && match[2]?.length == 11) {
    return "https://www.youtube.com/watch?v=" + match[2];
  } else {
    throw new Error("Invalid YouTube URL");
  }
}
