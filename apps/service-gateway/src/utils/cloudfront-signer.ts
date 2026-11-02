import { createSign } from "crypto";

// Signs links to private files served through CloudFront (course videos and PDFs).
//
// The bucket behind CloudFront is private. A link only works if it carries a valid
// signature from our key and hasn't expired, so a link copied out of the player stops
// working after a few hours and can't be used to download the whole library.
//
// This is CloudFront's "canned policy": the signature covers the exact URL and an
// expiry time. https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-creating-signed-url-canned-policy.html

export interface SignerConfig {
  domain: string; // e.g. d1234abcd.cloudfront.net
  keyPairId: string; // CloudFront public key ID
  privateKey: string; // PEM
  ttlMinutes: number;
}

// CloudFront's URL-safe base64: + -> -, = -> _, / -> ~
function cloudfrontBase64(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/=/g, "_").replace(/\//g, "~");
}

export function signCloudFrontUrl(url: string, keyPairId: string, privateKey: string, expiresAt: Date): string {
  const expires = Math.floor(expiresAt.getTime() / 1000);
  const policy = JSON.stringify({
    Statement: [{ Resource: url, Condition: { DateLessThan: { "AWS:EpochTime": expires } } }],
  });
  const signature = createSign("RSA-SHA1").update(policy).sign(privateKey);
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}Expires=${expires}&Signature=${cloudfrontBase64(signature)}&Key-Pair-Id=${keyPairId}`;
}

// Signs the link if it points at our CloudFront domain; anything else (Vimeo, other
// sites) is returned unchanged. Spaces and other characters are normalised to the
// encoded form the browser will actually request, since the signature covers it exactly.
export function signIfPrivate(url: string | null, config: SignerConfig | null, now: Date = new Date()): string | null {
  if (!url || !config) return url;
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return url;
  }
  if (parsed.protocol !== "https:" || parsed.hostname.toLowerCase() !== config.domain.toLowerCase()) {
    return url;
  }
  // Drop any old signature that may have been pasted in with the link.
  for (const key of ["Expires", "Signature", "Key-Pair-Id", "Policy"]) parsed.searchParams.delete(key);
  const expiresAt = new Date(now.getTime() + config.ttlMinutes * 60_000);
  return signCloudFrontUrl(parsed.toString(), config.keyPairId, config.privateKey, expiresAt);
}

// Reads the signing settings from the environment; null when signing is not set up.
export function signerConfigFrom(env: {
  CLOUDFRONT_VIDEO_DOMAIN?: string;
  CLOUDFRONT_KEY_PAIR_ID?: string;
  CLOUDFRONT_PRIVATE_KEY?: string;
  VIDEO_LINK_TTL_MINUTES: number;
}): SignerConfig | null {
  if (!env.CLOUDFRONT_VIDEO_DOMAIN || !env.CLOUDFRONT_KEY_PAIR_ID || !env.CLOUDFRONT_PRIVATE_KEY) return null;
  return {
    domain: env.CLOUDFRONT_VIDEO_DOMAIN.replace(/^https?:\/\//, "").replace(/\/+$/, ""),
    keyPairId: env.CLOUDFRONT_KEY_PAIR_ID,
    // Accept a PEM with real newlines or with \n written out.
    privateKey: env.CLOUDFRONT_PRIVATE_KEY.replace(/\\n/g, "\n"),
    ttlMinutes: env.VIDEO_LINK_TTL_MINUTES,
  };
}
