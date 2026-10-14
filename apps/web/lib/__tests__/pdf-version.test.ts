import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);

// The PDF viewer loads pdf.js's worker from our own pdfjs-dist, while react-pdf runs the
// pdfjs-dist it was built against. If the two versions differ, every PDF fails with
// "Unknown action from worker". This catches a version bump that would break it.
describe("pdfjs-dist version", () => {
  it("matches the version react-pdf depends on", () => {
    const ours = require("../../package.json") as { dependencies: Record<string, string> };
    const reactPdf = require("react-pdf/package.json") as { dependencies: Record<string, string> };
    expect(ours.dependencies["pdfjs-dist"]).toBe(reactPdf.dependencies["pdfjs-dist"]);
  });
});
