"use client";

import { useState } from "react";
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

// ─── Camera Icon ──────────────────────────────────────────────
const IconCamera = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
    <circle cx="12" cy="13" r="4"/>
  </svg>
);

// ─── Hamburger Icon ───────────────────────────────────────────
const IconMenu = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

// ─── Close Icon ───────────────────────────────────────────────
const IconClose = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export function NavBar() {
  const { theme, toggleTheme, colors } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <style>{`
        .nav-link-warm {
          color: ${colors.textSecondary};
          text-decoration: none;
          font-size: 14.5px;
          padding: 8px 16px;
          border-radius: 8px;
          transition: all 0.2s ease;
          font-weight: 600;
        }
        .nav-link-warm:hover {
          color: ${colors.text};
          background: ${colors.borderLight};
        }
        .nav-logo {
          display: flex;
          align-items: center;
          gap: 8px;
          text-decoration: none;
          color: ${colors.text};
          transition: transform 0.2s ease;
        }
        .nav-logo:hover {
          transform: scale(1.02);
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

        /* ── Desktop nav links (center) ── */
        .nav-center-links {
          display: flex;
          gap: 12px;
          justify-content: center;
        }

        /* ── Hamburger button (hidden on desktop) ── */
        .nav-hamburger {
          display: none;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 10px;
          border: 1px solid ${colors.border};
          background: ${colors.surface};
          color: ${colors.text};
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .nav-hamburger:hover {
          background: ${colors.accentBg};
        }

        /* ── Mobile drawer ── */
        .nav-mobile-drawer {
          display: none;
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: ${colors.navBg};
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-bottom: 1px solid ${colors.navBorder};
          padding: 12px 20px 16px;
          flex-direction: column;
          gap: 4px;
          z-index: 49;
          animation: slideDown 0.2s ease forwards;
        }
        .nav-mobile-drawer .nav-link-warm {
          display: block;
          padding: 12px 16px;
          font-size: 15px;
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* ── Mobile Responsive ── */
        @media (max-width: 768px) {
          .nav-center-links {
            display: none !important;
          }
          .nav-hamburger {
            display: flex !important;
          }
          .nav-mobile-drawer.open {
            display: flex !important;
          }
        }
      `}</style>
      <nav style={{
        display: "grid",
        gridTemplateColumns: "1fr auto 1fr",
        alignItems: "center",
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
        {/* Left: Logo */}
        <div style={{ display: "flex", justifyContent: "flex-start" }}>
          <Link 
            href="/search" 
            className="nav-logo" 
            onClick={() => { setMobileMenuOpen(false); if (typeof window !== "undefined" && window.location.pathname === "/search") window.dispatchEvent(new CustomEvent("clearSearch")); }}
          >
            <IconCamera />
            <span style={{ fontWeight: 700, fontSize: 17, letterSpacing: "-0.02em" }}>LifeGallery</span>
          </Link>
        </div>

        {/* Center: Nav Links (Desktop only) */}
        <div className="nav-center-links">
          <Link 
            href="/search" 
            className="nav-link-warm"
            onClick={() => { if (typeof window !== "undefined" && window.location.pathname === "/search") window.dispatchEvent(new CustomEvent("clearSearch")); }}
          >
            Pencarian
          </Link>
          <Link href="/about" className="nav-link-warm">About this Gallery</Link>
        </div>

        {/* Right: Theme Toggle + Hamburger */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, alignItems: "center" }}>
          <button
            className="theme-toggle-btn"
            onClick={toggleTheme}
            title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
          >
            {theme === "light" ? <IconMoon /> : <IconSun />}
          </button>
          <button
            className="nav-hamburger"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <IconClose /> : <IconMenu />}
          </button>
        </div>

        {/* Mobile Drawer */}
        <div className={`nav-mobile-drawer ${mobileMenuOpen ? "open" : ""}`}>
          <Link 
            href="/search" 
            className="nav-link-warm"
            onClick={() => { setMobileMenuOpen(false); if (typeof window !== "undefined" && window.location.pathname === "/search") window.dispatchEvent(new CustomEvent("clearSearch")); }}
          >
            🔍 Pencarian
          </Link>
          <Link href="/about" className="nav-link-warm" onClick={() => setMobileMenuOpen(false)}>
            ℹ️ About this Gallery
          </Link>
        </div>
      </nav>
    </>
  );
}
