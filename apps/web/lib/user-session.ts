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

export function useSession(): UseSessionResult {
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
          router.push("/login");
        } else {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  return { user, loading };
}