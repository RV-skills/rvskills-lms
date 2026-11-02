import { describe, expect, it } from "vitest";
import { createVerify, generateKeyPairSync } from "crypto";
import { signCloudFrontUrl, signIfPrivate, signerConfigFrom } from "../cloudfront-signer";

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs1", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});

const config = { domain: "d111.cloudfront.net", keyPairId: "K2ABC", privateKey, ttlMinutes: 60 };
const now = new Date("2026-11-02T10:00:00Z");

function fromCloudfrontBase64(s: string) {
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "=").replace(/~/g, "/"), "base64");
}

describe("CloudFront signed links", () => {
  it("signs the exact URL with an expiry, verifiable with the public key", () => {
    const url = "https://d111.cloudfront.net/excel/a.mp4";
    const signed = new URL(signCloudFrontUrl(url, "K2ABC", privateKey, new Date("2026-11-02T11:00:00Z")));
    const expires = Number(signed.searchParams.get("Expires"));
    expect(expires).toBe(Math.floor(new Date("2026-11-02T11:00:00Z").getTime() / 1000));
    expect(signed.searchParams.get("Key-Pair-Id")).toBe("K2ABC");

    const policy = JSON.stringify({
      Statement: [{ Resource: url, Condition: { DateLessThan: { "AWS:EpochTime": expires } } }],
    });
    const raw = signCloudFrontUrl(url, "K2ABC", privateKey, new Date("2026-11-02T11:00:00Z"));
    const sig = raw.split("Signature=")[1].split("&")[0];
    expect(sig).not.toMatch(/[+=/]/);
    expect(createVerify("RSA-SHA1").update(policy).verify(publicKey, fromCloudfrontBase64(sig))).toBe(true);
  });

  it("signs only our CloudFront links, encoding spaces the way the browser requests them", () => {
    const signed = signIfPrivate("https://D111.cloudfront.net/excel/1. RV_Intro.mp4", config, now)!;
    expect(signed.startsWith("https://d111.cloudfront.net/excel/1.%20RV_Intro.mp4?Expires=")).toBe(true);
    expect(signIfPrivate("https://player.vimeo.com/video/42", config, now)).toBe("https://player.vimeo.com/video/42");
    expect(signIfPrivate(null, config, now)).toBeNull();
    expect(signIfPrivate("https://d111.cloudfront.net/a.mp4", null, now)).toBe("https://d111.cloudfront.net/a.mp4");
  });

  it("replaces an old signature pasted in with the link", () => {
    const signed = new URL(signIfPrivate("https://d111.cloudfront.net/a.mp4?Expires=1&Signature=x&Key-Pair-Id=OLD", config, now)!);
    expect(signed.searchParams.getAll("Expires")).toEqual([String(Math.floor(now.getTime() / 1000) + 3600)]);
    expect(signed.searchParams.get("Key-Pair-Id")).toBe("K2ABC");
  });

  it("is off unless all three settings are present, and accepts \\n in the key", () => {
    expect(signerConfigFrom({ CLOUDFRONT_VIDEO_DOMAIN: "d.cloudfront.net", VIDEO_LINK_TTL_MINUTES: 60 })).toBeNull();
    const c = signerConfigFrom({
      CLOUDFRONT_VIDEO_DOMAIN: "https://d.cloudfront.net/",
      CLOUDFRONT_KEY_PAIR_ID: "K",
      CLOUDFRONT_PRIVATE_KEY: "-----BEGIN-----\\nabc\\n-----END-----",
      VIDEO_LINK_TTL_MINUTES: 60,
    })!;
    expect(c.domain).toBe("d.cloudfront.net");
    expect(c.privateKey).toBe("-----BEGIN-----\nabc\n-----END-----");
  });
});
