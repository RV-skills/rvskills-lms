import { FormField } from "@/components/ui/form-field";

export default function HomePage() {
  return (
    <main className="flex max-w-sm flex-col gap-5 p-8">
      <h1 className="text-2xl text-neutral-900">RV Skills LMS</h1>

      <FormField
        label="Email"
        type="email"
        placeholder="you@example.com"
        helperText="We'll never share your email."
      />

      <FormField
        label="Password"
        type="password"
        errorText="Password must be at least 8 characters."
      />
    </main>
  );
}