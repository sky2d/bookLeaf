"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { loginSchema } from "@/shared/schemas/auth";

// Shown so evaluators can try both portals without hunting through the README.
const DEMO_ACCOUNTS = [
  { label: "Priya Sharma, author", email: "priya.sharma@email.com", password: "Author@123" },
  { label: "Sneha Kulkarni, author", email: "sneha.kulkarni@email.com", password: "Author@123" },
  { label: "BookLeaf support team", email: "admin@bookleaf.com", password: "Admin@123" },
];

export function LoginForm({ next }: { next: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }

    setPending(true);
    const res = await signIn("credentials", { ...parsed.data, redirect: false });
    if (!res || res.error) {
      setPending(false);
      setError("That email and password don't match an account. Check them and try again.");
      return;
    }
    // Full navigation so the server sees the new session cookie and routes by role.
    window.location.assign(next);
  }

  return (
    <>
      <form onSubmit={onSubmit} noValidate className="mt-8 flex flex-col gap-4">
        <Field id="email" label="Email">
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={!!error}
            required
          />
        </Field>
        <Field id="password" label="Password">
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={!!error}
            required
          />
        </Field>
        {error && (
          <p role="alert" className="rounded-md bg-proof-soft px-3 py-2 text-sm text-proof">
            {error}
          </p>
        )}
        <Button type="submit" disabled={pending} className="mt-1 py-2.5">
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <details className="mt-10 border-t border-rule pt-5 text-sm">
        <summary className="cursor-pointer text-ink-soft hover:text-ink">Demo accounts</summary>
        <ul className="mt-3 flex flex-col gap-1">
          {DEMO_ACCOUNTS.map((a) => (
            <li key={a.email}>
              <button
                type="button"
                onClick={() => {
                  setEmail(a.email);
                  setPassword(a.password);
                  setError(null);
                }}
                className="flex w-full items-baseline justify-between gap-3 rounded-sm px-2 py-1.5 text-left hover:bg-ink/5"
              >
                <span className="text-ink">{a.label}</span>
                <span className="truncate text-ink-faint">{a.email}</span>
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-2 px-2 text-ink-faint">All ten authors use the password Author@123.</p>
      </details>
    </>
  );
}
