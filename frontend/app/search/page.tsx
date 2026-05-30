"use client";

import { useCallback, useState, useEffect, useRef } from "react";
import { useSearch } from "@/hooks/useSearch";
import { resolveImageUrl, SearchResultItem, submitFeedback, SearchResponse } from "@/lib/api";

// ─── Icons (inline SVG agar zero-dependency) ─────────────────

const IconSearch = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);
const IconX = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const IconText = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 7V4h16v3" /><path d="M9 20h6" /><path d="M12 4v16" />
  </svg>
);
const IconImage = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" />
  </svg>
);
const IconUpload = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17,8 12,3 7,8" /><line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

// ─── Main Page ────────────────────────────────────────────────

type SearchMode = "text" | "image";

export default function SearchPage() {
  const { results, loading, error, searchText, searchImage, clear } = useSearch();

  const [mode, setMode] = useState<SearchMode>("text");
  const [query, setQuery] = useState("");
  const [topK, setTopK] = useState(12);
  const [selectedItem, setSelectedItem] = useState<SearchResultItem | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Feedback Toast state ──
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [feedbackQuery, setFeedbackQuery] = useState<{ query: string; results: SearchResponse } | null>(null);
  const [searchTimestamp, setSearchTimestamp] = useState<string>("");

  const hasResults = !!results;

  // ── Text search submit ──
  const handleTextSubmit = useCallback(async () => {
    if (!query.trim()) return;
    const ts = new Date().toISOString();
    setSearchTimestamp(ts);
    setShowFeedback(false);
    setFeedbackSent(false);
    await searchText(query, topK);
  }, [query, topK, searchText]);

  // ── Image search submit ──
  const handleImageSubmit = useCallback(async () => {
    if (!imageFile) return;
    const ts = new Date().toISOString();
    setSearchTimestamp(ts);
    setShowFeedback(false);
    setFeedbackSent(false);
    await searchImage(imageFile, topK);
  }, [imageFile, topK, searchImage]);

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
        query_text: feedbackQuery.query,
        category: mode === "text" ? "text" : "image",
        is_relevant: isRelevant,
        timestamp: searchTimestamp,
        elapsed_ms: feedbackQuery.results.elapsed_ms,
        top_k: topK,
        total_results: feedbackQuery.results.total,
      });
    } catch (e) {
      console.error("Gagal mengirim feedback:", e);
    }
    // Toast akan menampilkan terima kasih, lalu auto-dismiss
    setTimeout(() => setShowFeedback(false), 2000);
  }, [feedbackQuery, searchTimestamp, topK, mode]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) handleTextSubmit();
  };

  // ── Image file handling ──
  const handleFileSelect = (file: File) => {
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) handleFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClear = () => {
    clear();
    setQuery("");
    clearImage();
  };

  const handleModeChange = (newMode: SearchMode) => {
    setMode(newMode);
    handleClear();
  };

  const handleTopKChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newK = Number(e.target.value);
    setTopK(newK);
    
    // Automatically re-fetch if there are already results
    if (hasResults) {
      if (mode === "text" && query.trim()) {
        const ts = new Date().toISOString();
        setSearchTimestamp(ts);
        setShowFeedback(false);
        setFeedbackSent(false);
        await searchText(query, newK);
      } else if (mode === "image" && imageFile) {
        const ts = new Date().toISOString();
        setSearchTimestamp(ts);
        setShowFeedback(false);
        setFeedbackSent(false);
        await searchImage(imageFile, newK);
      }
    }
  };

  const canSubmitText = !loading && !!query.trim();
  const canSubmitImage = !loading && !!imageFile;

  return (
    <div style={styles.page}>
      {/* CSS Animations */}
      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        .mode-tab { cursor: pointer; transition: all 0.25s ease; border: none; }
        .mode-tab:hover { background: rgba(59, 130, 246, 0.12) !important; }
        .search-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 20px rgba(59, 130, 246, 0.4); }
        .upload-zone:hover { border-color: #3b82f6 !important; background: rgba(59, 130, 246, 0.06) !important; }
        .result-card { transition: all 0.2s ease; cursor: pointer; }
        .result-card:hover { transform: translateY(-3px); border-color: #475569 !important; box-shadow: 0 8px 24px rgba(0,0,0,0.3); }
      `}</style>

      <main style={{
        ...styles.main,
        ...(hasResults ? {} : styles.mainCentered),
      }}>
        {/* ── Search Section ── */}
        <section style={{
          ...styles.searchSection,
          ...(hasResults ? {} : styles.searchSectionCentered),
          animation: "fadeInUp 0.5s ease forwards",
        }}>
          {/* Title & CTA */}
          {!hasResults && (
            <div style={styles.heroText}>
              <h1 style={styles.heroTitle}>Cari Gambar dengan AI</h1>
              <p style={styles.heroSubtitle}>
                Sistem ini dapat mencari dari koleksi 1.000 foto kehidupan nyata yang mencakup aktivitas manusia, hewan, alam, dan lingkungan sehari-hari. Deskripsikan gambar yang kamu bayangkan dalam Bahasa Indonesia, dan sistem akan menemukan foto yang paling relevan.
              </p>
            </div>
          )}

          {/* Mode Toggle Tabs */}
          <div style={styles.modeTabs}>
            <button
              className="mode-tab"
              style={{
                ...styles.modeTab,
                ...(mode === "text" ? styles.modeTabActive : {}),
              }}
              onClick={() => handleModeChange("text")}
            >
              <IconText />
              <span>Cari dengan Teks</span>
            </button>
            <button
              className="mode-tab"
              style={{
                ...styles.modeTab,
                ...(mode === "image" ? styles.modeTabActive : {}),
              }}
              onClick={() => handleModeChange("image")}
            >
              <IconImage />
              <span>Cari dengan Gambar</span>
            </button>
          </div>

          {/* Search Panel */}
          <div style={styles.searchPanel}>
            {mode === "text" ? (
              /* ── Text Search Mode ── */
              <>
                <p style={styles.ctaText}>Masukkan deskripsi teks untuk mencari gambar</p>
                <div style={styles.textInputRow}>
                  <div style={styles.textInputWrapper}>
                    <span style={styles.searchIcon}><IconSearch /></span>
                    <input
                      style={styles.textInput}
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="misal: anak bermain di pantai, kucing tidur di sofa..."
                      autoFocus
                    />
                    {query && (
                      <button style={styles.clearBtn} onClick={() => setQuery("")}>
                        <IconX />
                      </button>
                    )}
                  </div>
                </div>
                <div style={styles.options}>
                  <label style={styles.optLabel}>
                    Jumlah hasil:
                    <select
                      style={styles.optSelect}
                      value={topK}
                      onChange={handleTopKChange}
                    >
                      {[6, 12, 24, 48].map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </label>
                  <button
                    className="search-btn"
                    style={{ ...styles.searchBtn, ...(canSubmitText ? {} : styles.searchBtnDisabled) }}
                    onClick={handleTextSubmit}
                    disabled={!canSubmitText}
                  >
                    {loading ? (
                      <span style={styles.spinner} />
                    ) : (
                      <><IconSearch /><span>Cari</span></>
                    )}
                  </button>
                </div>
              </>
            ) : (
              /* ── Image Search Mode ── */
              <>
                <p style={styles.ctaText}>Upload gambar untuk menemukan gambar serupa</p>

                {!imagePreview ? (
                  <div
                    className="upload-zone"
                    style={{
                      ...styles.uploadZone,
                      ...(isDragging ? styles.uploadZoneDragging : {}),
                    }}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <IconUpload />
                    <p style={styles.uploadTitle}>
                      {isDragging ? "Lepaskan gambar di sini..." : "Klik atau seret gambar ke sini"}
                    </p>
                    <p style={styles.uploadHint}>Format: JPG, PNG, WEBP · Maks 10MB</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      style={{ display: "none" }}
                      onChange={handleFileInput}
                    />
                  </div>
                ) : (
                  <div style={styles.previewContainer}>
                    <div style={styles.previewImageWrapper}>
                      <img src={imagePreview} alt="Preview" style={styles.previewImage} />
                      <button style={styles.previewRemoveBtn} onClick={clearImage}>
                        <IconX />
                      </button>
                    </div>
                    <p style={styles.previewFilename}>{imageFile?.name}</p>
                  </div>
                )}

                <div style={styles.options}>
                  <label style={styles.optLabel}>
                    Jumlah hasil:
                    <select
                      style={styles.optSelect}
                      value={topK}
                      onChange={handleTopKChange}
                    >
                      {[6, 12, 24, 48].map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </label>
                  <button
                    className="search-btn"
                    style={{ ...styles.searchBtn, ...(canSubmitImage ? {} : styles.searchBtnDisabled) }}
                    onClick={handleImageSubmit}
                    disabled={!canSubmitImage}
                  >
                    {loading ? (
                      <span style={styles.spinner} />
                    ) : (
                      <><IconSearch /><span>Cari</span></>
                    )}
                  </button>
                </div>
              </>
            )}

            {/* Error */}
            {error && (
              <div style={styles.errorBox}>
                ⚠️ {error}
              </div>
            )}
          </div>
        </section>

        {/* ── Results ── */}
        {results && (
          <section style={styles.resultsSection}>
            <div style={styles.resultsHeader}>
              <span style={styles.resultCount}>
                {results.total} gambar ditemukan
              </span>
              <span style={styles.resultMeta}>
                {results.elapsed_ms}ms
                {results.query_text && <> · &quot;{results.query_text}&quot;</>}
                {!results.query_text && results.query_type === "image" && <> · pencarian gambar</>}
              </span>
              <button style={styles.clearResultsBtn} onClick={handleClear}>
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

        {/* Empty state hint */}
        {!results && !loading && (
          <div style={styles.emptyHints}>
            <div style={styles.hintCard}>
              <span style={styles.hintIcon}>💡</span>
              <p style={styles.hintText}>Coba: <em>&quot;seorang pria bermain gitar&quot;</em></p>
            </div>
            <div style={styles.hintCard}>
              <span style={styles.hintIcon}>🌊</span>
              <p style={styles.hintText}>Coba: <em>&quot;pemandangan pantai saat senja&quot;</em></p>
            </div>
            <div style={styles.hintCard}>
              <span style={styles.hintIcon}>🐕</span>
              <p style={styles.hintText}>Coba: <em>&quot;anjing berlari di taman&quot;</em></p>
            </div>
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
    <div className="result-card" style={styles.card} onClick={onClick}>
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
const BG = "#0f172a";
const SURFACE = "#1e293b";
const BORDER = "#334155";
const TEXT = "#f1f5f9";
const MUTED = "#94a3b8";

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    backgroundColor: BG,
    color: TEXT,
    fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
  },
  main: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "32px 24px",
  },
  mainCentered: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "calc(100vh - 56px)",
    padding: "0 24px",
  },

  // ── Search Section ──
  searchSection: {
    width: "100%",
    maxWidth: 680,
    margin: "0 auto",
  },
  searchSectionCentered: {
    marginBottom: 40,
  },

  // ── Hero Text ──
  heroText: {
    textAlign: "center",
    marginBottom: 32,
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: 800,
    letterSpacing: "-0.5px",
    marginBottom: 10,
    background: "linear-gradient(135deg, #f1f5f9 0%, #3b82f6 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    lineHeight: 1.2,
  },
  heroSubtitle: {
    fontSize: 16,
    color: MUTED,
    margin: 0,
    lineHeight: 1.5,
  },

  // ── Mode Tabs ──
  modeTabs: {
    display: "flex",
    gap: 4,
    marginBottom: 16,
    background: "rgba(15, 23, 42, 0.6)",
    border: `1px solid ${BORDER}`,
    borderRadius: 12,
    padding: 4,
  },
  modeTab: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: "10px 16px",
    borderRadius: 8,
    background: "transparent",
    color: MUTED,
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.25s ease",
  },
  modeTabActive: {
    background: "rgba(59, 130, 246, 0.15)",
    color: TEXT,
    fontWeight: 600,
  },

  // ── Search Panel ──
  searchPanel: {
    background: SURFACE,
    border: `1px solid ${BORDER}`,
    borderRadius: 16,
    padding: 24,
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  ctaText: {
    fontSize: 13,
    color: MUTED,
    margin: 0,
    textAlign: "center",
  },
  textInputRow: { display: "flex", gap: 12 },
  textInputWrapper: {
    flex: 1, display: "flex", alignItems: "center",
    background: BG, border: `1px solid ${BORDER}`,
    borderRadius: 10, padding: "0 14px",
    transition: "border-color 0.2s",
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
    transition: "all 0.2s ease",
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

  // ── Upload Zone ──
  uploadZone: {
    border: `2px dashed ${BORDER}`,
    borderRadius: 12,
    padding: "32px 24px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
    cursor: "pointer",
    color: MUTED,
    transition: "all 0.2s ease",
    background: "transparent",
  },
  uploadZoneDragging: {
    borderColor: ACCENT,
    background: "rgba(59, 130, 246, 0.08)",
    color: TEXT,
  },
  uploadTitle: {
    fontSize: 14,
    fontWeight: 500,
    margin: 0,
  },
  uploadHint: {
    fontSize: 12,
    color: MUTED,
    margin: 0,
    opacity: 0.7,
  },

  // ── Image Preview ──
  previewContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
  },
  previewImageWrapper: {
    position: "relative",
    borderRadius: 12,
    overflow: "hidden",
    border: `1px solid ${BORDER}`,
    maxWidth: 280,
  },
  previewImage: {
    width: "100%",
    maxHeight: 200,
    objectFit: "cover",
    display: "block",
  },
  previewRemoveBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    background: "rgba(0,0,0,0.7)",
    border: "1px solid rgba(255,255,255,0.2)",
    color: "#fff",
    borderRadius: 6,
    padding: 4,
    cursor: "pointer",
    display: "flex",
  },
  previewFilename: {
    fontSize: 12,
    color: MUTED,
    margin: 0,
  },

  // ── Empty State Hints ──
  emptyHints: {
    display: "flex",
    gap: 12,
    justifyContent: "center",
    flexWrap: "wrap",
    marginTop: 8,
    animation: "fadeInUp 0.6s ease 0.2s both",
  },
  hintCard: {
    background: "rgba(30, 41, 59, 0.5)",
    border: `1px solid rgba(51, 65, 85, 0.5)`,
    borderRadius: 10,
    padding: "12px 18px",
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  hintIcon: {
    fontSize: 18,
  },
  hintText: {
    fontSize: 13,
    color: MUTED,
    margin: 0,
  },

  // ── Results ──
  resultsSection: { marginTop: 32 },
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
    transition: "transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease",
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
