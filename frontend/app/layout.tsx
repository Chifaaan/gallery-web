// app/layout.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { ThemeProvider } from "./ThemeContext";
import { NavBar } from "./NavBar";

export const metadata: Metadata = {
  title      : "Galeri Foto Kehidupan Nyata",
  description: "Temukan momen keseharian — jelajahi ribuan foto autentik kegiatan manusia sehari-hari, dikurasi dari fotografer Flickr.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <style>{`
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          @keyframes spin { to { transform: rotate(360deg); } }
          html { -webkit-text-size-adjust: 100%; }
          body { overflow-x: hidden; }

          /* ── Global Mobile Responsive Overrides ── */
          @media (max-width: 768px) {
            nav[style] {
              padding-left: 16px !important;
              padding-right: 16px !important;
            }
          }
        `}</style>
      </head>
      <body suppressHydrationWarning style={{ fontFamily: "'Inter', 'DM Sans', system-ui, sans-serif" }}>
        <ThemeProvider>
          <NavBar />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
