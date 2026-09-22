"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { gatewayFetch, GatewayError } from "./gateway-client";

export interface SessionUser {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  username: string;
}

interface UseSessionResult {
  user: SessionUser | null;
  loading: boolean;
}

interface UseSessionOptions {
  redirectOnUnauthorized?: boolean;
}

export function useSession(options: UseSessionOptions = {}): UseSessionResult {
  const { redirectOnUnauthorized = true } = options;
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    gatewayFetch<SessionUser>("/api/v1/users/me")
      .then((data) => {
        if (!cancelled) {
          setUser(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof GatewayError && err.statusCode === 401) {
          if (redirectOnUnauthorized) {
            router.push("/login");
          } else {
            setLoading(false);
          }
        } else {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [router, redirectOnUnauthorized]);

  return { user, loading };
}

export async function logout(): Promise<void> {
  await gatewayFetch("/api/v1/auth/logout", { method: "POST" });
}