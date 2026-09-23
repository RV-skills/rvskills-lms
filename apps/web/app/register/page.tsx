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
  const [fieldErrors, setFieldErrors] = useState<{ field: string; message: string }[]>([]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setFieldErrors([]);

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters.");
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
        if (err.fieldErrors && err.fieldErrors.length > 0) {
          setFieldErrors(err.fieldErrors);
        } else {
          setErrorMessage(err.message);
        }
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
          helperText="At least 8 characters."
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

        {fieldErrors.length > 0 && (
          <ul className="flex flex-col gap-1" role="alert">
            {fieldErrors.map((fe, i) => (
              <li key={i} className="text-sm text-danger">
                {fe.field}: {fe.message}
              </li>
            ))}
          </ul>
        )}

        <Button type="submit" loading={loading}>
          Create account
        </Button>
      </form>
    </main>
  );
}