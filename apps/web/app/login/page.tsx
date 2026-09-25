"use client";

import { useState } from "react";
import { FormField } from "@/components/ui/form-field";
import { Button } from "@/components/ui/button";
import { gatewayFetch, GatewayError } from "@/lib/gateway-client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

interface LoginResponse {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  roles: { role_name: string }[];
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const searchParams = useSearchParams();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const user = await gatewayFetch<LoginResponse>("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      const redirect = searchParams.get("redirect");
      if (redirect) {
        window.location.href = redirect;
        return;
      }
      const isAdmin = user.roles.some((r) => r.role_name === "Admin");
      const isFaculty = user.roles.some((r) => r.role_name === "Faculty");
      window.location.href = isAdmin ? "/admin" : isFaculty ? "/faculty" : "/dashboard";
    } catch (err) {
      if (err instanceof GatewayError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex max-w-sm flex-col gap-6 px-6 py-16">
      <h1 className="text-center text-2xl text-neutral-900">RV Skills LMS</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <FormField
          label="Email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <FormField
          label="Password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {errorMessage && (
          <p className="text-sm text-danger" role="alert">
            {errorMessage}
          </p>
        )}

        <Button type="submit" loading={loading}>
          Sign in
        </Button>
      </form>
      <p className="text-center text-sm text-neutral-500">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-primary underline">
          Sign up
        </Link>
      </p>
    </main>
  );
}