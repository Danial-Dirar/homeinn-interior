"use client";

import { Button } from "@homeinn/ui";
import { useState, type FormEvent } from "react";
import { adminSend } from "@/lib/admin/api";
import { useAdmin } from "./admin-context";
import { controlClass, FieldShell, Notice, PageHeader, Panel } from "./ui";

export function AccountForm() {
  const { user } = useAdmin();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (next !== again) {
      setMessage({ tone: "error", text: "The two new passwords are different." });
      return;
    }
    if (next.length < 10) {
      setMessage({ tone: "error", text: "The new password needs at least 10 characters." });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await adminSend("POST", "/auth/password", { currentPassword: current, newPassword: next });
      setCurrent("");
      setNext("");
      setAgain("");
      setMessage({ tone: "success", text: "Password changed. You have been signed out on every other device." });
    } catch (e) {
      setMessage({ tone: "error", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="Your password" description={`Signed in as ${user.email}.`} />
      <Panel className="max-w-xl">
        <form onSubmit={submit} noValidate className="flex flex-col gap-5">
          {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}
          <FieldShell id="pw-current" label="Current password">
            <input id="pw-current" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} className={controlClass} />
          </FieldShell>
          <FieldShell id="pw-new" label="New password" help="At least 10 characters. A short sentence is easier to remember and harder to guess.">
            <input id="pw-new" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} className={controlClass} aria-describedby="pw-new-help" />
          </FieldShell>
          <FieldShell id="pw-again" label="New password, again">
            <input id="pw-again" type="password" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} className={controlClass} />
          </FieldShell>
          <div>
            <Button type="submit" disabled={busy || !current || !next || !again}>{busy ? "Changing…" : "Change password"}</Button>
          </div>
        </form>
      </Panel>
    </>
  );
}
