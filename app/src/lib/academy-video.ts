/**
 * Lesson videos. An admin pastes a link; only a few trusted hosts can be embedded, plus direct video files over https.
 * Shared by the course schema (to reject other links), the page security policy and the lesson screen.
 */
export interface VideoSource {
  kind: "frame" | "file";
  src: string;
}

export const VIDEO_FRAME_HOSTS = ["www.youtube.com", "www.youtube-nocookie.com", "player.vimeo.com", "web.microsoftstream.com"];
/** Microsoft 365 tenants use their own sub-domain. */
export const VIDEO_FRAME_SUFFIXES = [".sharepoint.com"];

const frameHost = (h: string) => VIDEO_FRAME_HOSTS.includes(h) || VIDEO_FRAME_SUFFIXES.some((s) => h.endsWith(s));

export function parseVideo(raw: string | undefined): VideoSource | null {
  if (!raw) return null;
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "https:" || u.username || u.password) return null;
  const host = u.hostname.toLowerCase();
  const id = /^[A-Za-z0-9_-]{6,20}$/;
  if (host === "youtu.be") {
    const v = u.pathname.slice(1);
    return id.test(v) ? { kind: "frame", src: `https://www.youtube-nocookie.com/embed/${v}` } : null;
  }
  if (host === "www.youtube.com" || host === "youtube.com" || host === "m.youtube.com" || host === "www.youtube-nocookie.com") {
    const v = u.searchParams.get("v") ?? (/^\/embed\/([A-Za-z0-9_-]{6,20})$/.exec(u.pathname)?.[1] ?? "");
    return id.test(v) ? { kind: "frame", src: `https://www.youtube-nocookie.com/embed/${v}` } : null;
  }
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const v = /\/(\d{5,12})(?:\/|$)/.exec(u.pathname)?.[1];
    return v ? { kind: "frame", src: `https://player.vimeo.com/video/${v}` } : null;
  }
  if (frameHost(host)) return { kind: "frame", src: u.toString() };
  if (/\.(mp4|webm)$/i.test(u.pathname)) return { kind: "file", src: u.toString() };
  return null;
}
