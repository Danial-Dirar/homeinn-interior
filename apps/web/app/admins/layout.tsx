import type { Metadata } from "next";
import type { ReactNode } from "react";
import { fontVariables } from "@/lib/fonts";
import "../globals.css";

export const metadata: Metadata = {
  title: { default: "Admin · Home Inn", template: "%s · Home Inn admin" },
  // robots.txt disallows /admins as well; this covers a page that is linked
  // from somewhere and crawled regardless.
  robots: { index: false, follow: false },
};

/**
 * The admin panel's own document: English, outside the locale tree, on the
 * site's cream ground and fonts. No theme switch — this is a work surface.
 */
export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={fontVariables}>
      <body className="bg-bone font-sans text-ink antialiased">{children}</body>
    </html>
  );
}
