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
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <style>{`
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </head>
      <body style={{ fontFamily: "'Inter', 'DM Sans', system-ui, sans-serif" }}>
        <ThemeProvider>
          <NavBar />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
