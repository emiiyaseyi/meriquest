import { describe, expect, it } from "vitest";
import { parseVideo } from "@/lib/academy-video";

describe("lesson video links", () => {
  it("turns YouTube and Vimeo links into embeds", () => {
    expect(parseVideo("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toEqual({ kind: "frame", src: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ" });
    expect(parseVideo("https://youtu.be/dQw4w9WgXcQ")?.kind).toBe("frame");
    expect(parseVideo("https://vimeo.com/123456789")?.src).toBe("https://player.vimeo.com/video/123456789");
  });
  it("allows Microsoft 365 and direct video files", () => {
    expect(parseVideo("https://meristem.sharepoint.com/sites/x/_layouts/15/embed.aspx?id=1")?.kind).toBe("frame");
    expect(parseVideo("https://cdn.example.com/lesson.mp4")?.kind).toBe("file");
  });
  it("rejects other hosts, plain http, scripts and credentials", () => {
    for (const bad of ["http://youtu.be/dQw4w9WgXcQ", "https://evil.example.com/page", "javascript:alert(1)", "https://user:pw@vimeo.com/123456789", "https://www.youtube.com/watch?v=x", "not a url", ""]) {
      expect(parseVideo(bad)).toBeNull();
    }
  });
});
