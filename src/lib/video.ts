import crypto from "crypto";

const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID || "";
const tokenKey = process.env.BUNNY_STREAM_TOKEN_KEY || "";
const cdnHostname = process.env.BUNNY_STREAM_CDN_HOSTNAME || "iframe.mediadelivery.net";

/**
 * Generates a signed, short-lived Bunny Stream embed URL.
 * Securely hashes the token key, video ID, and expiration timestamp.
 * Falls back to mock values if credentials are not set.
 */
export function generateSignedBunnyUrl(videoId: string): string {
  // If no credentials or mock ID, return a mock embed flag
  if (!libraryId || !tokenKey || videoId.startsWith("mock-")) {
    return `mock-embed-url-${videoId}`;
  }

  // Set URL expiration to 1 hour in the future (Unix timestamp)
  const expirationOffset = 3600;
  const expires = Math.floor(Date.now() / 1000) + expirationOffset;

  // Bunny Stream Token format: SHA256(tokenKey + videoId + expirationTimestamp)
  const signString = tokenKey + videoId + expires.toString();
  const token = crypto
    .createHash("sha256")
    .update(signString)
    .digest("hex");

  return `https://${cdnHostname}/embed/${libraryId}/${videoId}?token=${token}&expires=${expires}&autoplay=true`;
}
