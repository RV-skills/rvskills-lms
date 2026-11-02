import { serverConfig } from "../config";
import { signIfPrivate, signerConfigFrom } from "../utils/cloudfront-signer";

const signer = signerConfigFrom(serverConfig);

interface WithLinks {
  video_url: string | null;
  resources: { file_url: string }[];
}

// Turns a lesson's stored links into ones the browser can play right now.
// Only call this on content the viewer is allowed to see.
export function playableLinks<T extends WithLinks>(lesson: T, now: Date = new Date()): T {
  return {
    ...lesson,
    video_url: signIfPrivate(lesson.video_url, signer, now),
    resources: lesson.resources.map((r) => ({ ...r, file_url: signIfPrivate(r.file_url, signer, now) ?? r.file_url })),
  };
}
