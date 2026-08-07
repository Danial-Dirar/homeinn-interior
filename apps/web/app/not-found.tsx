import Link from "next/link";

// For a URL with no locale segment at all, where no messages are loaded.
export default function RootNotFound() {
  return (
    <html lang="en">
      <body style={{ background: "#0B0B0C", color: "#E7DFD2", fontFamily: "system-ui" }}>
        <main style={{ padding: "4rem 1.5rem" }}>
          <h1>404</h1>
          <p>
            <Link href="/en" style={{ color: "#E01B24" }}>Home Inn Interior Solution</Link>
          </p>
        </main>
      </body>
    </html>
  );
}
