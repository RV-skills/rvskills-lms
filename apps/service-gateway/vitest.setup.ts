// Vitest sets NODE_ENV="test" before any file loads, which fails this
// service's Zod validation (only development/staging/production are
// allowed). This file runs before any test file, forcing it back to a
// valid value so importing a service module doesn't crash the process.
process.env.NODE_ENV = "development";

// A handful of test files (the ones that import a real, unmocked
// service module rather than mocking it out) transitively trigger this
// service's config/index.ts, which Zod-validates these five vars as
// required and calls process.exit(1) if any are missing. Locally these
// come from the real .env file; in CI no .env is committed, and these
// values apparently don't reach this process the way the other env
// vars set at the GitHub Actions workflow level do. Fall back to safe,
// unreachable dummy values only when the real ones aren't already set,
// so local runs keep using whatever is actually configured.
process.env.SERVICE_AUTH_URL ||= "http://localhost:3001";
process.env.SERVICE_COURSES_URL ||= "http://localhost:3002";
process.env.SERVICE_ENROLLMENT_URL ||= "http://localhost:3003";
process.env.SERVICE_ASSESSMENT_URL ||= "http://localhost:3004";
process.env.COOKIE_SECRET ||= "dummy-ci-cookie-secret-at-least-32-characters-long";
