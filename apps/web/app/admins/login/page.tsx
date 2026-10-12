import type { Metadata } from "next";
import { LoginForm } from "@/components/admin/login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="grid min-h-dvh place-items-center px-5 py-12">
      <div className="w-full max-w-sm">
        <p className="mb-1 text-center font-display text-4xl">Home <span className="text-logo">inn</span></p>
        <h1 className="mb-8 text-center text-sm uppercase tracking-[0.18em] text-ink/70">Admin sign in</h1>
        <div className="border border-ink/10 bg-[#FBF8F3] p-7 shadow-[0_1px_0_rgba(20,24,26,0.04)]">
          <LoginForm next={typeof next === "string" ? next : null} />
        </div>
        <p className="mt-6 text-center text-xs text-ink/65">
          Forgotten your password? Ask an admin to reset it under Accounts.
        </p>
      </div>
    </main>
  );
}
