"use client";

import { useCallback, useState, useEffect } from "react";
import { useSearch } from "@/hooks/useSearch";
import { resolveImageUrl, SearchResultItem, submitFeedback, SearchResponse } from "@/lib/api";

// ─── Icons (inline SVG agar zero-dependency) ─────────────────

const IconSearch = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);
const IconX = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

// ─── Main Page ────────────────────────────────────────────────

export default function SearchPage() {
  const { results, loading, error, searchText, clear } = useSearch();

  const [query, setQuery]         = useState("");
  const [topK, setTopK]           = useState(12);
  const [selectedItem, setSelectedItem] = useState<SearchResultItem | null>(null);

  // ── Feedback Toast state ──
  const [showFeedback, setShowFeedback]   = useState(false);
  const [feedbackSent, setFeedbackSent]   = useState(false);
  const [feedbackQuery, setFeedbackQuery] = useState<{ query: string; results: SearchResponse } | null>(null);
  const [searchTimestamp, setSearchTimestamp] = useState<string>("");

  const handleSubmit = useCallback(async () => {
    if (!query.trim()) return;
    const ts = new Date().toISOString();
    setSearchTimestamp(ts);
    setShowFeedback(false);
    setFeedbackSent(false);
    await searchText(query, topK);
  }, [query, topK, searchText]);

  // Trigger feedback toast setelah results berubah (pencarian selesai)
  useEffect(() => {
    if (!results || loading || feedbackSent) return;
    setFeedbackQuery({
      query: results.query_text ?? "",
      results,
    });
    const timer = setTimeout(() => setShowFeedback(true), 1500);
    return () => clearTimeout(timer);
  }, [results, loading]);

  const handleFeedback = useCallback(async (isRelevant: boolean) => {
    if (!feedbackQuery) return;
    setFeedbackSent(true);
    try {
      await submitFeedback({
        query_text   : feedbackQuery.query,
        category     : "text",
        is_relevant  : isRelevant,
        timestamp    : searchTimestamp,
        elapsed_ms   : feedbackQuery.results.elapsed_ms,
        top_k        : topK,
        total_results: feedbackQuery.results.total,
      });
    } catch (e) {
      console.error("Gagal mengirim feedback:", e);
    }
    // Toast akan menampilkan terima kasih, lalu auto-dismiss
    setTimeout(() => setShowFeedback(false), 2000);
  }, [feedbackQuery, searchTimestamp, topK]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) handleSubmit();
  };

  const canSubmit = !loading && !!query.trim();

  return (
    <div style={styles.page}>
      {/* ── Header ── */}
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.logo}>
            <span style={styles.logoFlag}>🇮🇩</span>
            <span style={styles.logoText}>CLIP<span style={styles.logoAccent}>Indo</span></span>
          </div>
          <p style={styles.tagline}>Pencarian gambar multibahasa berbasis AI</p>
        </div>
      </header>

      {/* ── Search Panel ── */}
      <main style={styles.main}>
        <section style={styles.searchPanel}>

          {/* Text input */}
          <div style={styles.textInputRow}>
            <div style={styles.textInputWrapper}>
              <span style={styles.searchIcon}><IconSearch /></span>
              <input
                style={styles.textInput}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Cari gambar dalam bahasa Indonesia, misal: anak bermain di pantai"
                autoFocus
              />
              {query && (
                <button style={styles.clearBtn} onClick={() => setQuery("")}>
                  <IconX />
                </button>
              )}
            </div>
          </div>

          {/* Options */}
          <div style={styles.options}>
            <label style={styles.optLabel}>
              Jumlah hasil:
              <select
                style={styles.optSelect}
                value={topK}
                onChange={(e) => setTopK(Number(e.target.value))}
              >
                {[6, 12, 24, 48].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </label>

            <button
              style={{ ...styles.searchBtn, ...(canSubmit ? {} : styles.searchBtnDisabled) }}
              onClick={handleSubmit}
              disabled={!canSubmit}
            >
              {loading ? (
                <span style={styles.spinner} />
              ) : (
                <><IconSearch /><span>Cari</span></>
              )}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div style={styles.errorBox}>
              ⚠️ {error}
            </div>
          )}
        </section>

        {/* ── Results ── */}
        {results && (
          <section style={styles.resultsSection}>
            <div style={styles.resultsHeader}>
              <span style={styles.resultCount}>
                {results.total} gambar ditemukan
              </span>
              <span style={styles.resultMeta}>
                {results.elapsed_ms}ms · &quot;{results.query_text}&quot;
              </span>
              <button style={styles.clearResultsBtn} onClick={clear}>
                Bersihkan
              </button>
            </div>

            <div style={styles.grid}>
              {results.results.map((item) => (
                <ResultCard
                  key={item.image_id}
                  item={item}
                  onClick={() => setSelectedItem(item)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {!results && !loading && (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>🖼️</div>
            <p style={styles.emptyTitle}>Mulai pencarian gambar</p>
            <p style={styles.emptyHint}>
              Ketik deskripsi dalam bahasa Indonesia untuk mencari gambar yang relevan
            </p>
          </div>
        )}
      </main>

      {/* ── Modal detail ── */}
      {selectedItem && (
        <DetailModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}

      {/* ── Feedback Toast ── */}
      {showFeedback && (
        <FeedbackToast
          onFeedback={handleFeedback}
          feedbackSent={feedbackSent}
          onDismiss={() => setShowFeedback(false)}
        />
      )}
    </div>
  );
}

// ─── Result Card ──────────────────────────────────────────────

function ResultCard({ item, onClick }: { item: SearchResultItem; onClick: () => void }) {
  const [imgError, setImgError] = useState(false);
  const scorePercent = Math.round(item.score * 100);
  const scoreColor =
    item.score > 0.7 ? "#22c55e" :
    item.score > 0.4 ? "#f59e0b" : "#94a3b8";

  return (
    <div style={styles.card} onClick={onClick}>
      <div style={styles.cardImgWrapper}>
        {!imgError ? (
          <img
            src={resolveImageUrl(item.url)}
            alt={item.captions_id[0] ?? item.filename}
            style={styles.cardImg}
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div style={styles.cardImgFallback}>🖼️</div>
        )}
        <div style={{ ...styles.scoreBadge, backgroundColor: scoreColor }}>
          {scorePercent}%
        </div>
        <div style={styles.rankBadge}>#{item.rank}</div>
      </div>
      <div style={styles.cardBody}>
        {item.captions_id[0] && (
          <p style={styles.cardCaption}>{item.captions_id[0]}</p>
        )}
      </div>
    </div>
  );
}

// ─── Detail Modal (Info Only) ─────────────────────────────────

function DetailModal({
  item,
  onClose,
}: {
  item: SearchResultItem;
  onClose: () => void;
}) {
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button style={styles.modalClose} onClick={onClose}><IconX /></button>
        <img
          src={resolveImageUrl(item.url)}
          alt={item.captions_id[0] ?? ""}
          style={styles.modalImg}
        />

        <div style={styles.modalBody}>
          <div style={styles.modalScoreRow}>
            <span style={styles.modalScore}>Skor: {(item.score * 100).toFixed(1)}%</span>
            <span style={styles.modalRank}>Peringkat #{item.rank}</span>
          </div>
          {item.captions_id.length > 0 && (
            <>
              <h4 style={styles.modalCapLabel}>Caption (ID)</h4>
              {item.captions_id.map((c, i) => <p key={i} style={styles.modalCapText}>{c}</p>)}
            </>
          )}
          {item.captions_en.length > 0 && (
            <>
              <h4 style={styles.modalCapLabel}>Caption (EN)</h4>
              {item.captions_en.map((c, i) => <p key={i} style={styles.modalCapText}>{c}</p>)}
            </>
          )}
          <p style={styles.modalId}>ID: {item.image_id}</p>
        </div>
      </div>
    </div>
  );
}


// ─── Feedback Toast Component ────────────────────────────────

function FeedbackToast({
  onFeedback,
  feedbackSent,
  onDismiss,
}: {
  onFeedback: (isRelevant: boolean) => void;
  feedbackSent: boolean;
  onDismiss: () => void;
}) {
  // Auto-dismiss setelah 15 detik jika belum dijawab
  useEffect(() => {
    if (feedbackSent) return;
    const timer = setTimeout(() => onDismiss(), 15000);
    return () => clearTimeout(timer);
  }, [feedbackSent, onDismiss]);

  return (
    <>
      {/* CSS Keyframes for animation */}
      <style>{`
        @keyframes toastSlideUp {
          from { transform: translateY(120%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes toastSlideDown {
          from { transform: translateY(0);    opacity: 1; }
          to   { transform: translateY(120%); opacity: 0; }
        }
        @keyframes toastPulse {
          0%, 100% { box-shadow: 0 8px 32px rgba(59, 130, 246, 0.15); }
          50%      { box-shadow: 0 8px 32px rgba(59, 130, 246, 0.3); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes checkPop {
          0%   { transform: scale(0); opacity: 0; }
          50%  { transform: scale(1.2); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
      <div style={toastStyles.wrapper}>
        <div style={toastStyles.container}>
          {!feedbackSent ? (
            <>
              <div style={toastStyles.content}>
                <span style={toastStyles.icon}>💬</span>
                <div>
                  <p style={toastStyles.title}>Bagaimana hasil pencariannya?</p>
                  <p style={toastStyles.subtitle}>Apakah hasil yang ditampilkan sesuai?</p>
                </div>
              </div>
              <div style={toastStyles.actions}>
                <button
                  style={toastStyles.btnPositive}
                  onClick={() => onFeedback(true)}
                  title="Hasil sesuai"
                >
                  <span style={{ fontSize: 18 }}>👍</span>
                  <span>Sesuai</span>
                </button>
                <button
                  style={toastStyles.btnNegative}
                  onClick={() => onFeedback(false)}
                  title="Hasil tidak sesuai"
                >
                  <span style={{ fontSize: 18 }}>👎</span>
                  <span>Tidak</span>
                </button>
                <button
                  style={toastStyles.btnDismiss}
                  onClick={onDismiss}
                  title="Tutup"
                >
                  <IconX />
                </button>
              </div>
            </>
          ) : (
            <div style={toastStyles.thankYou}>
              <span style={toastStyles.checkIcon}>✓</span>
              <span>Terima kasih atas feedback Anda!</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Toast Styles ─────────────────────────────────────────────

const toastStyles: Record<string, React.CSSProperties> = {
  wrapper: {
    position: "fixed",
    bottom: 24,
    right: 24,
    zIndex: 200,
    animation: "toastSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards",
  },
  container: {
    background: "rgba(30, 41, 59, 0.92)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    border: "1px solid rgba(59, 130, 246, 0.25)",
    borderRadius: 16,
    padding: "16px 20px",
    display: "flex",
    alignItems: "center",
    gap: 16,
    minWidth: 340,
    maxWidth: 440,
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(59, 130, 246, 0.1)",
    animation: "toastPulse 3s ease-in-out infinite",
  },
  content: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  icon: {
    fontSize: 24,
    flexShrink: 0,
  },
  title: {
    fontSize: 14,
    fontWeight: 600,
    color: "#f1f5f9",
    margin: 0,
    lineHeight: 1.3,
  },
  subtitle: {
    fontSize: 12,
    color: "#94a3b8",
    margin: "2px 0 0 0",
  },
  actions: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  btnPositive: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    padding: "8px 14px",
    borderRadius: 10,
    border: "1px solid rgba(34, 197, 94, 0.3)",
    background: "rgba(34, 197, 94, 0.12)",
    color: "#4ade80",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.15s",
  },
  btnNegative: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    padding: "8px 14px",
    borderRadius: 10,
    border: "1px solid rgba(239, 68, 68, 0.3)",
    background: "rgba(239, 68, 68, 0.12)",
    color: "#f87171",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.15s",
  },
  btnDismiss: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 28,
    height: 28,
    borderRadius: 8,
    border: "1px solid rgba(148, 163, 184, 0.2)",
    background: "transparent",
    color: "#64748b",
    cursor: "pointer",
    transition: "all 0.15s",
    padding: 0,
  },
  thankYou: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    color: "#4ade80",
    fontSize: 14,
    fontWeight: 600,
    padding: "4px 0",
  },
  checkIcon: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 24,
    height: 24,
    borderRadius: "50%",
    background: "rgba(34, 197, 94, 0.2)",
    color: "#4ade80",
    fontSize: 14,
    fontWeight: 700,
    animation: "checkPop 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards",
  },
};

// ─── Styles (CSS-in-JS) ───────────────────────────────────────

const ACCENT = "#3b82f6";
const BG     = "#0f172a";
const SURFACE= "#1e293b";
const BORDER = "#334155";
const TEXT   = "#f1f5f9";
const MUTED  = "#94a3b8";

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    backgroundColor: BG,
    color: TEXT,
    fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
  },
  header: {
    borderBottom: `1px solid ${BORDER}`,
    padding: "20px 0",
    background: `linear-gradient(135deg, ${BG} 0%, #0f2148 100%)`,
  },
  headerInner: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "0 24px",
    display: "flex",
    alignItems: "center",
    gap: 16,
  },
  logo: { display: "flex", alignItems: "center", gap: 8 },
  logoFlag: { fontSize: 28 },
  logoText: { fontSize: 24, fontWeight: 800, letterSpacing: "-0.5px" },
  logoAccent: { color: ACCENT },
  tagline: { color: MUTED, fontSize: 14, margin: 0 },
  main: { maxWidth: 1200, margin: "0 auto", padding: "32px 24px" },

  // ── Search panel ──
  searchPanel: {
    background: SURFACE,
    border: `1px solid ${BORDER}`,
    borderRadius: 16,
    padding: 28,
    marginBottom: 32,
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  textInputRow: { display: "flex", gap: 12 },
  textInputWrapper: {
    flex: 1, display: "flex", alignItems: "center",
    background: BG, border: `1px solid ${BORDER}`,
    borderRadius: 10, padding: "0 14px",
  },
  searchIcon: { color: MUTED, flexShrink: 0, display: "flex" },
  textInput: {
    flex: 1, background: "transparent", border: "none",
    outline: "none", color: TEXT, fontSize: 15, padding: "13px 10px",
  },
  clearBtn: {
    background: "transparent", border: "none",
    color: MUTED, cursor: "pointer", display: "flex", padding: 4,
  },
  options: {
    display: "flex", alignItems: "center",
    gap: 20, flexWrap: "wrap",
  },
  optLabel: {
    display: "flex", alignItems: "center",
    gap: 8, fontSize: 13, color: MUTED,
  },
  optSelect: {
    background: BG, border: `1px solid ${BORDER}`,
    color: TEXT, borderRadius: 6, padding: "5px 10px", fontSize: 13,
  },
  searchBtn: {
    marginLeft: "auto", display: "flex", alignItems: "center",
    gap: 8, padding: "11px 28px", borderRadius: 10,
    background: ACCENT, border: "none", color: "#fff",
    fontSize: 15, fontWeight: 600, cursor: "pointer",
    transition: "opacity 0.15s",
  },
  searchBtnDisabled: { opacity: 0.45, cursor: "not-allowed" },
  spinner: {
    width: 18, height: 18,
    border: "2.5px solid rgba(255,255,255,0.3)",
    borderTop: "2.5px solid #fff",
    borderRadius: "50%",
    display: "inline-block",
    animation: "spin 0.7s linear infinite",
  },
  errorBox: {
    background: "rgba(239,68,68,0.12)",
    border: "1px solid rgba(239,68,68,0.35)",
    borderRadius: 8, padding: "10px 16px",
    color: "#fca5a5", fontSize: 13,
  },

  // ── Results ──
  resultsSection: {},
  resultsHeader: {
    display: "flex", alignItems: "center",
    gap: 12, marginBottom: 20, flexWrap: "wrap",
  },
  resultCount: { fontWeight: 700, fontSize: 16 },
  resultMeta: { color: MUTED, fontSize: 13, flex: 1 },
  clearResultsBtn: {
    background: "transparent", border: `1px solid ${BORDER}`,
    color: MUTED, borderRadius: 6, padding: "5px 14px",
    fontSize: 12, cursor: "pointer",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
    gap: 16,
  },

  // ── Card ──
  card: {
    background: SURFACE, border: `1px solid ${BORDER}`,
    borderRadius: 12, overflow: "hidden", cursor: "pointer",
    transition: "transform 0.15s, border-color 0.15s",
  },
  cardImgWrapper: { position: "relative", aspectRatio: "4/3", overflow: "hidden" },
  cardImg: { width: "100%", height: "100%", objectFit: "cover" },
  cardImgFallback: {
    width: "100%", height: "100%",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 32, background: "#1a2a3a",
  },
  scoreBadge: {
    position: "absolute", top: 8, right: 8,
    borderRadius: 6, padding: "2px 8px",
    fontSize: 11, fontWeight: 700, color: "#fff",
  },
  rankBadge: {
    position: "absolute", top: 8, left: 8,
    background: "rgba(0,0,0,0.6)", borderRadius: 6,
    padding: "2px 7px", fontSize: 11, color: "#fff",
  },
  cardBody: { padding: "10px 12px" },
  cardCaption: {
    fontSize: 12, color: MUTED, margin: 0,
    display: "-webkit-box", WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical", overflow: "hidden",
  },

  // ── Empty state ──
  emptyState: {
    textAlign: "center", padding: "80px 24px", color: MUTED,
  },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: 600, color: TEXT, marginBottom: 8 },
  emptyHint: { fontSize: 14, maxWidth: 400, margin: "0 auto" },

  // ── Modal ──
  overlay: {
    position: "fixed", inset: 0,
    background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 100, padding: 24,
  },
  modal: {
    background: SURFACE, border: `1px solid ${BORDER}`,
    borderRadius: 16, maxWidth: 780, width: "100%",
    maxHeight: "90vh", overflow: "auto", position: "relative",
  },
  modalClose: {
    position: "absolute", top: 12, right: 12,
    background: BG, border: `1px solid ${BORDER}`,
    color: MUTED, borderRadius: 6, padding: 6,
    cursor: "pointer", display: "flex", zIndex: 1,
  },
  modalImg: { width: "100%", maxHeight: 340, objectFit: "contain", background: BG },
  modalBody: { padding: "20px 24px" },
  modalScoreRow: {
    display: "flex", alignItems: "center",
    gap: 16, marginBottom: 16,
  },
  modalScore: {
    background: "rgba(59,130,246,0.15)",
    border: "1px solid rgba(59,130,246,0.3)",
    borderRadius: 6, padding: "4px 12px", fontSize: 14, fontWeight: 600,
  },
  modalRank: { color: MUTED, fontSize: 13 },
  modalCapLabel: { fontSize: 12, color: MUTED, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 },
  modalCapText: { fontSize: 14, marginBottom: 6, lineHeight: 1.6 },
  modalId: { fontSize: 11, color: MUTED, marginTop: 12, fontFamily: "monospace" },
};
