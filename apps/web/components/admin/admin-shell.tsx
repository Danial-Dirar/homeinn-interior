"use client";

import type { AuthUser } from "@homeinn/types";
import { Button, Sheet, SheetContent, SheetTitle, SheetTrigger } from "@homeinn/ui";
import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { adminGet, adminSend } from "@/lib/admin/api";
import { AdminContext } from "./admin-context";
import { AdminNav } from "./admin-nav";
import { Loading, Notice } from "./ui";

/**
 * The panel's frame. Nothing inside renders until `GET /auth/me` confirms the
 * session: the API's cookies live on its own host, so the web server cannot
 * check them before the page is sent. A signed-out visitor sees "Checking
 * your session" and is taken to the login screen; no data is ever fetched
 * for them, because every call below is guarded by the API.
 */
export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [newCount, setNewCount] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [unreachable, setUnreachable] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    setUnreachable(false);
    adminGet<{ user: AuthUser }>("/auth/me")
      .then((res) => live && setUser(res.user))
      .catch((error: { status?: number }) => {
        // A 401 has already gone to the login screen. Anything else — no
        // network, a server error — would otherwise leave the spinner forever.
        if (live && error.status !== 401) setUnreachable(true);
      });
    return () => {
      live = false;
    };
  }, [attempt]);

  // Refreshed on every page change, so answering an enquiry updates the count.
  useEffect(() => {
    if (!user) return;
    let live = true;
    adminGet<{ total: number }>("/leads?status=NEW&page=1&perPage=1")
      .then((res) => live && setNewCount(res.total))
      .catch(() => live && setNewCount(null));
    return () => {
      live = false;
    };
  }, [user, pathname]);

  async function signOut() {
    await adminSend("POST", "/auth/logout").catch(() => undefined);
    window.location.assign("/admins/login");
  }

  if (!user) {
    return (
      <div className="grid min-h-dvh place-items-center px-5">
        {unreachable ? (
          <div className="flex max-w-sm flex-col items-start gap-4">
            <Notice tone="error">The admin panel can&apos;t reach the server. Check the connection, or try again in a minute.</Notice>
            <Button type="button" variant="outline" onClick={() => setAttempt((n) => n + 1)}>Try again</Button>
          </div>
        ) : (
          <Loading label="Checking your session" />
        )}
      </div>
    );
  }

  return (
    <AdminContext.Provider value={{ user }}>
      <a href="#admin-main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-white focus:px-4 focus:py-2">
        Skip to content
      </a>
      <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_1fr]">
        <aside className="sticky top-0 hidden h-dvh bg-ink lg:block">
          <AdminNav newCount={newCount} onSignOut={signOut} />
        </aside>

        <div className="flex items-center justify-between bg-ink px-5 py-3 text-bone lg:hidden">
          {/* 24px, as in the sidebar: the logo orange on ink is 3.6:1, which
              passes only as large text. */}
          <span className="font-display text-2xl">Home <span className="text-logo">inn</span> <span className="font-sans text-sm text-bone/70">Admin</span></span>
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger className="inline-flex items-center gap-2 text-sm" aria-label="Open the menu">
              <Menu aria-hidden="true" className="size-5" />
              {newCount ? <span className="bg-logo px-1.5 text-xs font-semibold text-white">{newCount}</span> : null}
            </SheetTrigger>
            <SheetContent side="left" className="w-72 bg-ink p-0 text-bone">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <AdminNav newCount={newCount} onNavigate={() => setMenuOpen(false)} onSignOut={signOut} />
            </SheetContent>
          </Sheet>
        </div>

        <main id="admin-main" className="min-w-0 px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </AdminContext.Provider>
  );
}
