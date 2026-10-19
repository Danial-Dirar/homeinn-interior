"use client";

import { cn } from "@homeinn/ui";
import {
  ExternalLink, Images, Inbox, KeyRound, LayoutDashboard, LogOut, Settings, UserCog, type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { RESOURCES, type ResourceGroup } from "@/lib/admin/resources";
import { ROLE_LABEL } from "@/lib/admin/roles";
import { useAdmin } from "./admin-context";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  adminOnly?: boolean;
  showNewCount?: boolean;
}

const GROUP_ORDER: ResourceGroup[] = ["Work", "Home page", "Company", "Journal"];

const NAV: { label: string; items: NavItem[] }[] = [
  {
    label: "Inbox",
    items: [
      { href: "/admins", label: "Overview", icon: LayoutDashboard, exact: true },
      { href: "/admins/enquiries", label: "Enquiries", icon: Inbox, showNewCount: true },
    ],
  },
  ...GROUP_ORDER.map((group) => ({
    label: group,
    items: RESOURCES.filter((r) => r.group === group)
      .map((r) => ({ href: `/admins/${r.name}`, label: r.label, icon: r.icon, adminOnly: r.adminOnly })),
  })),
  { label: "Library", items: [{ href: "/admins/media", label: "Media", icon: Images }] },
  {
    label: "Site",
    items: [
      { href: "/admins/settings", label: "Settings", icon: Settings, adminOnly: true },
      { href: "/admins/users", label: "Accounts", icon: UserCog, adminOnly: true },
      { href: "/admins/account", label: "Your password", icon: KeyRound },
    ],
  },
];

export function AdminNav({ newCount, onNavigate, onSignOut }: {
  newCount: number | null;
  onNavigate?: () => void;
  onSignOut: () => void;
}) {
  const pathname = usePathname() ?? "";
  const { user } = useAdmin();

  return (
    <nav aria-label="Admin" className="flex h-full flex-col">
      <div className="px-6 pb-6 pt-7">
        <Link href="/admins" onClick={onNavigate} className="font-display text-2xl text-bone">
          Home <span className="text-logo">inn</span>
        </Link>
        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-bone/70">Admin</p>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-6">
        {NAV.map((group) => {
          const items = group.items.filter((item) => !item.adminOnly || user.role === "ADMIN");
          if (items.length === 0) return null;
          return (
            <div key={group.label} className="mb-5">
              <p className="px-3 pb-1.5 text-[0.68rem] uppercase tracking-[0.16em] text-bone/60">{group.label}</p>
              <ul>
                {items.map((item) => {
                  const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onNavigate}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex items-center gap-3 border-l-2 px-3 py-2 text-sm transition-colors",
                          active
                            ? "border-logo bg-white/[0.08] text-bone"
                            : "border-transparent text-bone/80 hover:bg-white/[0.05] hover:text-bone",
                        )}
                      >
                        <Icon aria-hidden="true" className="size-4 shrink-0" />
                        <span className="flex-1">{item.label}</span>
                        {item.showNewCount && newCount ? (
                          <span className="bg-logo px-1.5 py-px text-[0.7rem] font-semibold text-white">{newCount} new</span>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>

      <div className="border-t border-white/10 px-6 py-5 text-sm">
        <p className="truncate text-bone">{user.name}</p>
        <p className="truncate text-xs text-bone/70">{user.email} · {ROLE_LABEL[user.role]}</p>
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
          <a href="/en" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-bone/80 hover:text-bone">
            <ExternalLink aria-hidden="true" className="size-3.5" /> View site
          </a>
          <button type="button" onClick={onSignOut} className="inline-flex items-center gap-1.5 text-bone/80 hover:text-bone">
            <LogOut aria-hidden="true" className="size-3.5" /> Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}
