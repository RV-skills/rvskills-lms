// lib/gateway-client.ts throws at import time if this is not set, since it
// is normally injected by Next.js from .env. Tests import that module
// directly, outside of Next's runtime, so it needs to be set here first.
process.env.NEXT_PUBLIC_GATEWAY_URL = "http://localhost:3005";