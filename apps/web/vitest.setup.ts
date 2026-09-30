// Extends Vitest's expect with jest-dom matchers (toBeInTheDocument,
// toBeChecked, etc.) for component tests, and provides their TS types.
import "@testing-library/jest-dom/vitest";

// Since this project imports describe/it/expect explicitly rather than
// running Vitest in "globals" mode, React Testing Library's automatic
// afterEach(cleanup) (which only registers itself against a global
// afterEach) never fires. Without this, every render() in a file piles
// up on top of the last, since nothing unmounts between tests.
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
afterEach(() => {
  cleanup();
});

// lib/gateway-client.ts throws at import time if this is not set, since it
// is normally injected by Next.js from .env. Tests import that module
// directly, outside of Next's runtime, so it needs to be set here first.
process.env.NEXT_PUBLIC_GATEWAY_URL = "http://localhost:3005";