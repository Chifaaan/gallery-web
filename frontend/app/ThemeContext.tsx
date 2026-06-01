"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

// ─── Color Palette Types ──────────────────────────────────────

export interface ThemeColors {
  bg: string;
  bgAlt: string;
  surface: string;
  surfaceHover: string;
  border: string;
  borderLight: string;
  text: string;
  textSecondary: string;
  muted: string;
  accent: string;
  accentLight: string;
  accentBg: string;
  accentBorder: string;
  accentAlt: string;        // sage green
  accentAltLight: string;
  accentAltBg: string;
  navBg: string;
  navBorder: string;
  searchBarBg: string;
  searchBarBorder: string;
  chipBg: string;
  chipBorder: string;
  chipHoverBg: string;
  cardShadow: string;
  overlayBg: string;
  errorBg: string;
  errorBorder: string;
  errorText: string;
  successText: string;
  successBg: string;
  successBorder: string;
  warningText: string;
  skeleton: string;
  skeletonShine: string;
}

// ─── Warm Light Mode Palette ──────────────────────────────────

const LIGHT: ThemeColors = {
  bg: "#FDFBF7",
  bgAlt: "#F7F3EC",
  surface: "#FFFFFF",
  surfaceHover: "#FBF8F3",
  border: "#E8E0D4",
  borderLight: "#F0EAE0",
  text: "#2C2520",
  textSecondary: "#5C4F44",
  muted: "#8C7E72",
  accent: "#C4783D",
  accentLight: "#D4874D",
  accentBg: "rgba(196, 120, 61, 0.10)",
  accentBorder: "rgba(196, 120, 61, 0.25)",
  accentAlt: "#6B8F4E",
  accentAltLight: "#8BA86A",
  accentAltBg: "rgba(107, 143, 78, 0.10)",
  navBg: "rgba(253, 251, 247, 0.92)",
  navBorder: "rgba(232, 224, 212, 0.8)",
  searchBarBg: "rgba(255, 255, 255, 0.7)",
  searchBarBorder: "rgba(232, 224, 212, 0.6)",
  chipBg: "rgba(247, 243, 236, 0.8)",
  chipBorder: "rgba(232, 224, 212, 0.6)",
  chipHoverBg: "rgba(196, 120, 61, 0.08)",
  cardShadow: "rgba(44, 37, 32, 0.06)",
  overlayBg: "rgba(44, 37, 32, 0.55)",
  errorBg: "rgba(220, 70, 60, 0.08)",
  errorBorder: "rgba(220, 70, 60, 0.2)",
  errorText: "#C0392B",
  successText: "#27AE60",
  successBg: "rgba(39, 174, 96, 0.08)",
  successBorder: "rgba(39, 174, 96, 0.2)",
  warningText: "#D4874D",
  skeleton: "#F0EAE0",
  skeletonShine: "#F7F3EC",
};

// ─── Warm Dark Mode Palette ───────────────────────────────────

const DARK: ThemeColors = {
  bg: "#1E1A17",
  bgAlt: "#252019",
  surface: "#2C2620",
  surfaceHover: "#362F28",
  border: "#423B34",
  borderLight: "#4A423A",
  text: "#F5EDE4",
  textSecondary: "#D4C8BA",
  muted: "#A89A8C",
  accent: "#E09A5C",
  accentLight: "#EAA96E",
  accentBg: "rgba(224, 154, 92, 0.12)",
  accentBorder: "rgba(224, 154, 92, 0.30)",
  accentAlt: "#A3C285",
  accentAltLight: "#B5D19A",
  accentAltBg: "rgba(163, 194, 133, 0.12)",
  navBg: "rgba(30, 26, 23, 0.92)",
  navBorder: "rgba(66, 59, 52, 0.7)",
  searchBarBg: "rgba(44, 38, 32, 0.6)",
  searchBarBorder: "rgba(66, 59, 52, 0.5)",
  chipBg: "rgba(44, 38, 32, 0.6)",
  chipBorder: "rgba(66, 59, 52, 0.5)",
  chipHoverBg: "rgba(224, 154, 92, 0.10)",
  cardShadow: "rgba(0, 0, 0, 0.25)",
  overlayBg: "rgba(0, 0, 0, 0.7)",
  errorBg: "rgba(239, 68, 68, 0.12)",
  errorBorder: "rgba(239, 68, 68, 0.30)",
  errorText: "#F87171",
  successText: "#4ADE80",
  successBg: "rgba(34, 197, 94, 0.12)",
  successBorder: "rgba(34, 197, 94, 0.25)",
  warningText: "#EAA96E",
  skeleton: "#362F28",
  skeletonShine: "#423B34",
};

// ─── Context ──────────────────────────────────────────────────

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  colors: ThemeColors;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("gallery-theme") as Theme | null;
    if (stored === "light" || stored === "dark") {
      setTheme(stored);
    }
    setMounted(true);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "light" ? "dark" : "light";
      localStorage.setItem("gallery-theme", next);
      return next;
    });
  }, []);

  const colors = theme === "light" ? LIGHT : DARK;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, colors }}>
      {mounted ? children : (
        <div style={{ visibility: "hidden" }}>
          {children}
        </div>
      )}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
