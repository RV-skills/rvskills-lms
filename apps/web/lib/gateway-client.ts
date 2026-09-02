const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL;

if (!GATEWAY_URL) {
  throw new Error("NEXT_PUBLIC_GATEWAY_URL is not set");
}

interface GatewayResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: { field: string; message: string }[];
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

export async function gatewayFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${GATEWAY_URL}${path}`, {
    ...options,
    credentials: "include",
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