"use client";

import { Button } from "@homeinn/ui";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { loginPathFor } from "@/lib/admin/api";
import { apiBaseUrl } from "@/lib/env";
import { controlClass, FieldShell, Notice } from "./ui";

const MESSAGES: Record<number, string> = {
  400: "Check the email address, and that the password is at least 8 characters.",
  401: "That email and password don't match.",
  429: "Too many attempts. Wait 15 minutes, then try again.",
};

/**
 * Posts straight to the API, like the public lead form: the login limit is per
 * address, and routing it through the web server would put every visitor on
 * one budget. The password lives only in this component's state and the
 * request body — never the URL, never storage.
 */
export function LoginForm({ next }: { next: string | null }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${apiBaseUrl()}/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        router.replace(loginPathFor(next));
        return;
      }
      setError(MESSAGES[res.status] ?? `Signing in failed (${res.status}). Try again in a moment.`);
    } catch {
      setError("The server can't be reached. Check the connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form method="post" aria-label="Sign in" onSubmit={submit} className="flex flex-col gap-5" noValidate>
      {error ? <Notice tone="error">{error}</Notice> : null}
      <FieldShell id="login-email" label="Email">
        <input
          id="login-email" type="email" autoComplete="username" required value={email}
          onChange={(e) => setEmail(e.target.value)} className={controlClass}
        />
      </FieldShell>
      <FieldShell id="login-password" label="Password">
        <input
          id="login-password" type="password" autoComplete="current-password" required value={password}
          onChange={(e) => setPassword(e.target.value)} className={controlClass}
        />
      </FieldShell>
      <Button type="submit" disabled={busy || !email || !password} className="mt-2 w-full">
        {busy ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
