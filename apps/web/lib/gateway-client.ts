const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL;

if (!GATEWAY_URL) {
  throw new Error("NEXT_PUBLIC_GATEWAY_URL is not set");
}

interface GatewayResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: { field: string; message: string }[];
  total?: number;
}

export class GatewayError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public fieldErrors?: { field: string; message: string }[]
  ) {
    super(message);
    this.name = "GatewayError";
  }
}

// The most useful single line to show someone: the first field's reason
// (e.g. "Must be an https:// URL") when the backend sent one, else the general message.
export function errorMessageFor(err: unknown, fallback = "Something went wrong. Please try again."): string {
  if (err instanceof GatewayError) {
    return err.fieldErrors?.[0]?.message ?? err.message;
  }
  return fallback;
}

export async function gatewayFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${GATEWAY_URL}${path}`, {
    ...options,
    credentials: "include",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const body: GatewayResponse<T> = await res.json();

  if (!res.ok || !body.success) {
    throw new GatewayError(
      body.message || "Something went wrong",
      res.status,
      body.errors
    );
  }

  return body.data as T;
}

export async function gatewayFetchRaw<T>(
  path: string,
  options: RequestInit = {}
): Promise<GatewayResponse<T>> {
  const res = await fetch(`${GATEWAY_URL}${path}`, {
    ...options,
    credentials: "include",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const body: GatewayResponse<T> = await res.json();

  if (!res.ok || !body.success) {
    throw new GatewayError(
      body.message || "Something went wrong",
      res.status,
      body.errors
    );
  }

  return body;
}