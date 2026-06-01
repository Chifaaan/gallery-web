"use client";

import Link from "next/link";
import { useTheme } from "./ThemeContext";

// ─── Sun Icon ─────────────────────────────────────────────────
const IconSun = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);

// ─── Moon Icon ────────────────────────────────────────────────
const IconMoon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

export function NavBar() {
  const { theme, toggleTheme, colors } = useTheme();

  return (
    <>
      <style>{`
        .nav-link-warm {
          color: ${colors.muted};
          text-decoration: none;
          font-size: 14px;
          padding: 8px 16px;
          border-radius: 8px;
          transition: all 0.2s ease;
          font-weight: 500;
        }
        .nav-link-warm:hover {
          color: ${colors.text};
          background: ${colors.accentBg};
        }
        .theme-toggle-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 10px;
          border: 1px solid ${colors.border};
          background: ${colors.surface};
          color: ${colors.accent};
          cursor: pointer;
          transition: all 0.25s ease;
        }
        .theme-toggle-btn:hover {
          background: ${colors.accentBg};
          border-color: ${colors.accentBorder};
          transform: rotate(15deg);
        }
      `}</style>
      <nav style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: "10px 40px",
        background: colors.navBg,
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: `1px solid ${colors.navBorder}`,
        fontFamily: "'Inter', 'DM Sans', system-ui, sans-serif",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}>
        {/* Badge */}
        <span style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          background: colors.accentBg,
          border: `1px solid ${colors.accentBorder}`,
          borderRadius: 20,
          padding: "4px 12px",
          fontSize: 11,
          fontWeight: 600,
          color: colors.accent,
          marginRight: "auto",
          letterSpacing: "0.01em",
        }}>
          ✨ 100% Real Photos
        </span>

        {/* Nav Links */}
        <Link href="/search" className="nav-link-warm">Pencarian</Link>
        <Link href="/about" className="nav-link-warm">About this Gallery</Link>

        {/* Theme Toggle */}
        <button
          className="theme-toggle-btn"
          onClick={toggleTheme}
          title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
          style={{ marginLeft: "auto" }}
        >
          {theme === "light" ? <IconMoon /> : <IconSun />}
        </button>
      </nav>
    </>
  );
}
