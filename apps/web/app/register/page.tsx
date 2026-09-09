"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FormField } from "@/components/ui/form-field";
import { Button } from "@/components/ui/button";
import { gatewayFetch, GatewayError } from "@/lib/gateway-client";

export default function RegisterPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await gatewayFetch("/api/v1/auth/register", {
        method: "POST",
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          username,
          email,
          password,
        }),
      });
      router.push("/login?registered=true");
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
      <h1 className="text-center text-2xl text-neutral-900">Create your account</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <FormField
          label="First name"
          required
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
        />
        <FormField
          label="Last name"
          required
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
        />
        <FormField
          label="Username"
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
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
        <FormField
          label="Confirm password"
          type="password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        {errorMessage && (
          <p className="text-sm text-danger" role="alert">
            {errorMessage}
          </p>
        )}

        <Button type="submit" loading={loading}>
          Create account
        </Button>
      </form>
    </main>
  );
}