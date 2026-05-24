// app/layout.tsx
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title      : "CLIP Indonesia Search",
  description: "Pencarian gambar multibahasa dengan AI",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <style>{`
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          body { background: #0f172a; color: #f1f5f9; }
          @keyframes spin { to { transform: rotate(360deg); } }
          /* Hover effects yang tidak bisa dilakukan dengan inline style */
          .card:hover { transform: translateY(-2px); border-color: #475569 !important; }
          .imageItem:hover .imageOverlay { opacity: 1 !important; }
        `}</style>
      </head>
      <body>
        <nav style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "10px 40px",
          background: "#1e293b",
          borderBottom: "1px solid #334155",
          fontFamily: "'DM Sans', system-ui, sans-serif",
        }}>
          <Link href="/" style={{ color: "#f1f5f9", textDecoration: "none", fontWeight: 800, fontSize: 15 }}>
            🇮🇩 CLIPIndo
          </Link>
          <span style={{ color: "#334155" }}>|</span>
          <Link href="/search" style={{ color: "#94a3b8", textDecoration: "none", fontSize: 14 }}>Pencarian</Link>
          <Link href="/manage" style={{ color: "#94a3b8", textDecoration: "none", fontSize: 14 }}>Kelola Index</Link>
        </nav>
        {children}
      </body>
    </html>
  );
}
