"use client";

import { Button } from "@homeinn/ui";
import { useEffect, useState, type FormEvent } from "react";
import { adminGet, adminSend } from "@/lib/admin/api";
import { useAdmin } from "./admin-context";
import { Badge, controlClass, FieldShell, Loading, Notice, PageHeader, Panel } from "./ui";

interface Account {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "EDITOR";
  createdAt: string;
}

/**
 * Who can sign in. Editors change content; admins also delete, change the
 * settings and manage accounts. Resetting someone's password or changing their
 * role signs them out everywhere.
 */
export function UsersAdmin() {
  const { user } = useAdmin();
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ADMIN" | "EDITOR">("EDITOR");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    adminGet<Account[]>("/users")
      .then((list) => live && setAccounts(list))
      .catch((e: Error) => live && setMessage({ tone: "error", text: e.message }));
    return () => {
      live = false;
    };
  }, []);

  async function add(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const created = await adminSend<Account>("POST", "/users", { name: name.trim(), email: email.trim(), role, password });
      setAccounts((list) => [...(list ?? []), created]);
      setName("");
      setEmail("");
      setPassword("");
      setRole("EDITOR");
      setMessage({ tone: "success", text: `${created.name} can now sign in. Give them the password in person or by phone, not by email.` });
    } catch (e) {
      setMessage({ tone: "error", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function update(account: Account, change: Partial<Pick<Account, "role">> & { password?: string }) {
    setMessage(null);
    try {
      const saved = await adminSend<Account>("PATCH", `/users/${account.id}`, change);
      setAccounts((list) => (list ?? []).map((a) => (a.id === account.id ? saved : a)));
      setMessage({
        tone: "success",
        text: change.password ? `${account.name}'s password was reset and they were signed out.` : `${account.name} is now ${saved.role === "ADMIN" ? "an admin" : "an editor"}.`,
      });
    } catch (e) {
      setMessage({ tone: "error", text: (e as Error).message });
    }
  }

  async function resetPassword(account: Account) {
    const next = window.prompt(`A new password for ${account.name} (at least 10 characters):`);
    if (next === null) return;
    if (next.length < 10) {
      setMessage({ tone: "error", text: "The password needs at least 10 characters." });
      return;
    }
    await update(account, { password: next });
  }

  async function remove(account: Account) {
    if (!window.confirm(`Remove ${account.name}'s account? They will be signed out at once.`)) return;
    try {
      await adminSend("DELETE", `/users/${account.id}`);
      setAccounts((list) => (list ?? []).filter((a) => a.id !== account.id));
    } catch (e) {
      setMessage({ tone: "error", text: (e as Error).message });
    }
  }

  return (
    <>
      <PageHeader
        title="Accounts"
        description="Editors can change content. Admins can also delete, change the settings and manage accounts."
      />
      {message ? <div className="mb-6"><Notice tone={message.tone}>{message.text}</Notice></div> : null}
      {!accounts ? <Loading /> : (
        <div className="overflow-x-auto border border-ink/10 bg-[#FBF8F3]">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <caption className="sr-only">Accounts</caption>
            <thead className="border-b border-ink/10 text-xs uppercase tracking-[0.1em] text-ink/65">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">Name</th>
                <th scope="col" className="px-4 py-3 font-medium">Email</th>
                <th scope="col" className="px-4 py-3 font-medium">Role</th>
                <th scope="col" className="px-4 py-3 font-medium"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => {
                const me = account.id === user.id;
                return (
                  <tr key={account.id} className="border-b border-ink/[0.07] last:border-0">
                    <td className="px-4 py-3 font-medium">{account.name} {me ? <Badge>You</Badge> : null}</td>
                    <td className="px-4 py-3">{account.email}</td>
                    <td className="px-4 py-3">
                      {me ? (account.role === "ADMIN" ? "Admin" : "Editor") : (
                        <>
                          <label htmlFor={`role-${account.id}`} className="sr-only">Role for {account.name}</label>
                          <select
                            id={`role-${account.id}`} value={account.role} className={`${controlClass} w-auto py-1`}
                            onChange={(e) => update(account, { role: e.target.value as Account["role"] })}
                          >
                            <option value="EDITOR">Editor</option>
                            <option value="ADMIN">Admin</option>
                          </select>
                        </>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {me ? null : (
                        <span className="inline-flex gap-4">
                          <button type="button" onClick={() => resetPassword(account)} className="underline-offset-4 hover:underline">Reset password</button>
                          <button type="button" onClick={() => remove(account)} className="text-[#9B2C1F] underline-offset-4 hover:underline">Delete {account.name}</button>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Panel className="mt-8 max-w-3xl">
        <h2 className="mb-4 font-display text-xl">Add an account</h2>
        <form onSubmit={add} className="grid gap-4 sm:grid-cols-2">
          <FieldShell id="new-name" label="Name">
            <input id="new-name" value={name} onChange={(e) => setName(e.target.value)} className={controlClass} required />
          </FieldShell>
          <FieldShell id="new-email" label="Email">
            <input id="new-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={controlClass} required />
          </FieldShell>
          <FieldShell id="new-role" label="Role">
            <select id="new-role" value={role} onChange={(e) => setRole(e.target.value as Account["role"])} className={controlClass}>
              <option value="EDITOR">Editor</option>
              <option value="ADMIN">Admin</option>
            </select>
          </FieldShell>
          <FieldShell id="new-password" label="First password" help="At least 10 characters. They can change it under “Your password”.">
            <input id="new-password" type="text" autoComplete="off" value={password} onChange={(e) => setPassword(e.target.value)} className={controlClass} required minLength={10} />
          </FieldShell>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={busy || !name.trim() || !email.trim() || password.length < 10}>
              {busy ? "Adding…" : "Add account"}
            </Button>
          </div>
        </form>
      </Panel>
    </>
  );
}
