/**
 * Utility function to extract an 11-character YouTube Video ID from any input:
 * - Full URL: https://www.youtube.com/watch?v=dQw4w9WgXcQ
 * - Short URL: https://youtu.be/dQw4w9WgXcQ
 * - Embed URL: https://www.youtube.com/embed/dQw4w9WgXcQ
 * - Mobile URL: https://m.youtube.com/watch?v=dQw4w9WgXcQ
 * - Raw ID: dQw4w9WgXcQ
 */
export function extractYouTubeId(urlOrId: string): string {
  if (!urlOrId || typeof urlOrId !== "string") return "";

  const trimmed = urlOrId.trim();

  // 1. Raw 11-character ID check
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // 2. Regular Expressions for YouTube URLs
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = trimmed.match(regExp);

  if (match && match[2] && match[2].length === 11) {
    return match[2];
  }

  return trimmed;
}

/**
 * Returns a clean YouTube embed URL with anti-branding parameters.
 */
export function getYouTubeEmbedUrl(videoId: string, autoplay = false): string {
  const cleanId = extractYouTubeId(videoId);
  const params = new URLSearchParams({
    enablejsapi: "1",
    rel: "0",
    modestbranding: "1",
    playsinline: "1",
    ...(autoplay ? { autoplay: "1", mute: "1" } : {}),
  });

  return `https://www.youtube.com/embed/${cleanId}?${params.toString()}`;
}
