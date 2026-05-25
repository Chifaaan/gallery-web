// app/layout.tsx
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title      : "Galeri Pencarian Gambar",
  description: "Pencarian gambar dengan AI berbasis CLIP ViT-B/32 (Fine-tuned)",
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
          .nav-link { color: #94a3b8; text-decoration: none; font-size: 14px; padding: 8px 16px; border-radius: 8px; transition: all 0.2s ease; }
          .nav-link:hover { color: #f1f5f9; background: rgba(148, 163, 184, 0.1); }
          .nav-link.active { color: #f1f5f9; background: rgba(59, 130, 246, 0.15); }
        `}</style>
      </head>
      <body>
        <nav style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
          padding: "12px 40px",
          background: "rgba(15, 23, 42, 0.8)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(51, 65, 85, 0.6)",
          fontFamily: "'DM Sans', system-ui, sans-serif",
          position: "sticky", top: 0, zIndex: 50,
        }}>
          <Link href="/search" className="nav-link">Pencarian</Link>
          <Link href="/about" className="nav-link">About this Gallery</Link>
        </nav>
        {children}
      </body>
    </html>
  );
}
