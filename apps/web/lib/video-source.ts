// Works out how a lesson's video link should be played.
//
// - Vimeo page or embed links (vimeo.com/123, vimeo.com/123/abc, player.vimeo.com/video/123?h=abc)
//   are played through Vimeo's own player, so "Hide from Vimeo" + "Specific domains" privacy
//   keeps working: Vimeo only plays them on the domains allowed in its settings.
// - Anything else (an .mp4 file, a Vimeo progressive_redirect file link) plays as a plain file.

export type VideoSource = { kind: "file"; url: string } | { kind: "vimeo"; url: string };

export function videoSourceFor(url: string): VideoSource {
  const vimeo = vimeoPlayerUrl(url);
  return vimeo ? { kind: "vimeo", url: vimeo } : { kind: "file", url };
}

// Returns the player.vimeo.com address for a Vimeo video link, or null if it isn't one.
// The private hash (needed for unlisted videos) is kept, whichever way it was written.
export function vimeoPlayerUrl(raw: string): string | null {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "https:") return null;
  const host = u.hostname.toLowerCase();
  const parts = u.pathname.split("/").filter(Boolean);

  let id: string | undefined;
  let hash: string | null = u.searchParams.get("h");

  if (host === "player.vimeo.com") {
    // Only /video/<id> is a player embed; progressive_redirect and external links are files.
    if (parts[0] !== "video" || !/^\d+$/.test(parts[1] ?? "")) return null;
    id = parts[1];
  } else if (host === "vimeo.com" || host === "www.vimeo.com") {
    // vimeo.com/<id> or vimeo.com/<id>/<hash>
    if (!/^\d+$/.test(parts[0] ?? "")) return null;
    id = parts[0];
    if (!hash && parts[1] && /^[0-9a-f]+$/i.test(parts[1])) hash = parts[1];
  } else {
    return null;
  }

  return `https://player.vimeo.com/video/${id}${hash ? `?h=${encodeURIComponent(hash)}` : ""}`;
}
