// Vitest sets NODE_ENV="test" before any file loads, which fails this
// service's Zod validation (only development/staging/production are
// allowed). This file runs before any test file, forcing it back to a
// valid value so importing a service module doesn't crash the process.
process.env.NODE_ENV = "development";