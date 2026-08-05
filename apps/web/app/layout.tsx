import type { ReactNode } from "react";

// `[locale]/layout.tsx` renders <html> and <body>; this shell only exists
// because the App Router requires a root layout.
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
