import type { ReactNode } from "react";
import { fontVariables } from "@/lib/fonts";
import "./globals.css";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={fontVariables}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
