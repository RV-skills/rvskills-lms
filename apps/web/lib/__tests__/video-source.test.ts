import { describe, expect, it } from "vitest";
import { videoSourceFor, vimeoPlayerUrl } from "../video-source";

describe("vimeoPlayerUrl", () => {
  it("reads normal Vimeo page links", () => {
    expect(vimeoPlayerUrl("https://vimeo.com/123456789")).toBe("https://player.vimeo.com/video/123456789");
    expect(vimeoPlayerUrl("https://www.vimeo.com/123456789")).toBe("https://player.vimeo.com/video/123456789");
  });

  it("keeps the private hash of unlisted videos, in either form", () => {
    expect(vimeoPlayerUrl("https://vimeo.com/123456789/abc123def4")).toBe(
      "https://player.vimeo.com/video/123456789?h=abc123def4"
    );
    expect(vimeoPlayerUrl("https://player.vimeo.com/video/123456789?h=abc123def4&badge=0")).toBe(
      "https://player.vimeo.com/video/123456789?h=abc123def4"
    );
  });

  it("reads embed links without a hash", () => {
    expect(vimeoPlayerUrl(" https://player.vimeo.com/video/42 ")).toBe("https://player.vimeo.com/video/42");
  });

  it("leaves Vimeo file links and other sites alone", () => {
    expect(
      vimeoPlayerUrl(
        "https://player.vimeo.com/progressive_redirect/playback/123/rendition/720p/file.mp4?loc=external&signature=x"
      )
    ).toBeNull();
    expect(vimeoPlayerUrl("https://vimeo.com/channels/staffpicks")).toBeNull();
    expect(vimeoPlayerUrl("https://cdn.example.com/lesson.mp4")).toBeNull();
    expect(vimeoPlayerUrl("http://vimeo.com/123")).toBeNull();
    expect(vimeoPlayerUrl("not a url")).toBeNull();
  });
});

describe("videoSourceFor", () => {
  it("sends Vimeo links to Vimeo's player and everything else to the file player", () => {
    expect(videoSourceFor("https://vimeo.com/7")).toEqual({ kind: "vimeo", url: "https://player.vimeo.com/video/7" });
    expect(videoSourceFor("https://cdn.example.com/a.mp4")).toEqual({ kind: "file", url: "https://cdn.example.com/a.mp4" });
  });
});
