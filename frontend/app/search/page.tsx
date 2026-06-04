"use client";

import { useCallback, useState, useEffect, useRef } from "react";
import { useSearch } from "@/hooks/useSearch";
import { useTheme, type ThemeColors } from "@/app/ThemeContext";
import {
  resolveImageUrl,
  SearchResultItem,
  submitFeedback,
  SearchResponse,
  listIndexImages,
} from "@/lib/api";

// ─── Icons (inline SVG) ───────────────────────────────────────

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
const IconSettings = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
  </svg>
);
const IconRefresh = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>
  </svg>
);

// ─── Dynamic Placeholder ──────────────────────────────────────

const PLACEHOLDERS = [
  "Cari: Orang sedang memasak di dapur...",
  "Cari: Macet di jalan raya...",
  "Cari: Anak bermain di taman...",
  "Cari: Barista membuat kopi...",
  "Cari: Orang bersepeda di pagi hari...",
  "Cari: Keluarga piknik di taman...",
  "Cari: Nelayan memperbaiki jala...",
  "Cari: Petani menanam padi di sawah...",
];

function useDynamicPlaceholder(paused: boolean) {
  const [index, setIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % PLACEHOLDERS.length);
        setFade(true);
      }, 300);
    }, 3500);
    return () => clearInterval(timer);
  }, [paused]);

  return { placeholder: PLACEHOLDERS[index], fade };
}

// ─── Suggestion Chips Data ────────────────────────────────────

interface ChipGroup {
  label: string;
  emoji: string;
  chips: { emoji: string; text: string; query: string }[];
}

const CHIP_GROUPS: ChipGroup[] = [
  {
    label: "Rutinitas Pagi",
    emoji: "☀️",
    chips: [
      { emoji: "☕", text: "Minum kopi di pagi hari", query: "orang minum kopi di pagi hari" },
      { emoji: "🏃‍♂️", text: "Olahraga di taman", query: "orang olahraga lari di taman" },
      { emoji: "🚲", text: "Bersepeda di jalan", query: "orang bersepeda di jalan" },
      { emoji: "🍳", text: "Memasak di dapur", query: "orang memasak di dapur" },
    ],
  },
  {
    label: "Waktu Luang",
    emoji: "🌙",
    chips: [
      { emoji: "🎸", text: "Bermain musik", query: "orang bermain gitar musik" },
      { emoji: "👨‍👩‍👧", text: "Keluarga berkumpul", query: "keluarga berkumpul bersama" },
      { emoji: "🌅", text: "Pemandangan senja", query: "pemandangan matahari terbenam senja" },
      { emoji: "🚗", text: "Aktivitas berkendara", query: "orang berkendara di jalan" },
    ],
  },
  {
    label: "Kerja & Belajar",
    emoji: "💻",
    chips: [
      { emoji: "🏢", text: "Orang bekerja di kantor", query: "orang bekerja di kantor" },
      { emoji: "📚", text: "Membaca buku", query: "orang membaca buku" },
      { emoji: "🎓", text: "Kegiatan kampus", query: "mahasiswa belajar di kampus" },
      { emoji: "🤝", text: "Rapat bersama", query: "orang sedang rapat diskusi" },
    ],
  },
  {
    label: "Liburan & Alam",
    emoji: "🌲",
    chips: [
      { emoji: "🏖️", text: "Bermain di pantai", query: "orang bermain di pantai laut" },
      { emoji: "⛰️", text: "Mendaki gunung", query: "orang mendaki gunung alam" },
      { emoji: "🏕️", text: "Berkemah", query: "orang berkemah di hutan" },
      { emoji: "📷", text: "Fotografi alam", query: "orang memotret pemandangan" },
    ],
  },
  {
    label: "Kegiatan Sosial",
    emoji: "🗣️",
    chips: [
      { emoji: "🍽️", text: "Makan bersama", query: "orang makan bersama di restoran" },
      { emoji: "🛍️", text: "Berbelanja", query: "orang berbelanja di pasar" },
      { emoji: "🎉", text: "Merayakan pesta", query: "orang merayakan pesta" },
      { emoji: "🐕", text: "Jalan bersama hewan peliharaan", query: "orang membawa anjing jalan-jalan" },
    ],
  }
];

// ─── Sample Image for Masonry ─────────────────────────────────

interface SampleImage {
  image_id: string;
  url: string;
  captions_id: string[];
  filename: string;
}

// ─── Main Page ────────────────────────────────────────────────

type SearchMode = "text" | "image";

export default function SearchPage() {
  const { results, loading, error, searchText, searchImage, clear } = useSearch();
  const { colors, theme } = useTheme();

  const [mode, setMode] = useState<SearchMode>("text");
  const [query, setQuery] = useState("");
  const [topK, setTopK] = useState(12);
  const [selectedItem, setSelectedItem] = useState<SearchResultItem | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { placeholder, fade } = useDynamicPlaceholder(query.length > 0);

  // ── Settings popover ──
  const [showSettings, setShowSettings] = useState(false);

  // ── Masonry sample images ──
  const [sampleImages, setSampleImages] = useState<SampleImage[]>([]);
  const [samplesLoaded, setSamplesLoaded] = useState(false);

  // ── Feedback Toast state ──
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [feedbackQuery, setFeedbackQuery] = useState<{ query: string; results: SearchResponse } | null>(null);
  const [searchTimestamp, setSearchTimestamp] = useState<string>("");

  // ── Active chip highlight ──
  const [activeChipIdx, setActiveChipIdx] = useState<string | null>(null);
  const [activeGroupIndex, setActiveGroupIndex] = useState(0);

  useEffect(() => {
    setActiveGroupIndex(Math.floor(Math.random() * CHIP_GROUPS.length));
  }, []);

  const hasResults = !!results;

  // ── Fetch sample images for masonry grid ──
  useEffect(() => {
    let cancelled = false;
    async function fetchSamples() {
      try {
        const data = await listIndexImages(1, 8);
        if (!cancelled) {
          setSampleImages(
            data.items.map((item) => ({
              image_id: item.image_id,
              url: item.url,
              captions_id: item.captions_id,
              filename: item.filename,
            }))
          );
          setSamplesLoaded(true);
        }
      } catch {
        console.error("Failed to load sample images");
      }
    }
    fetchSamples();
    return () => { cancelled = true; };
  }, []);

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

  // ── Chip click handler ──
  const handleChipClick = useCallback(
    (chipQuery: string) => {
      setQuery(chipQuery);
      setMode("text");
      // Auto-submit after setting query
      const ts = new Date().toISOString();
      setSearchTimestamp(ts);
      setShowFeedback(false);
      setFeedbackSent(false);
      searchText(chipQuery, topK);
    },
    [searchText, topK]
  );

  // Trigger feedback toast setelah results berubah
  useEffect(() => {
    if (!results || loading || feedbackSent) return;
    setFeedbackQuery({
      query: results.query_text ?? "",
      results,
    });
    const timer = setTimeout(() => setShowFeedback(true), 1500);
    return () => clearTimeout(timer);
  }, [results, loading, feedbackSent]);

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

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const clearImage = () => { setImageFile(null); setImagePreview(null); if (fileInputRef.current) fileInputRef.current.value = ""; };

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

  // ─── Build dynamic styles ────────────────────────────────────
  const S = buildStyles(colors);

  return (
    <div style={S.page}>
      {/* CSS Animations */}
      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes placeholderFadeIn { from { opacity: 0; } to { opacity: 0.5; } }
        @keyframes placeholderFadeOut { from { opacity: 0.5; } to { opacity: 0; } }
        @keyframes staggerFadeIn {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        .mode-tab-warm {
          cursor: pointer;
          transition: all 0.25s ease;
          border: none;
          font-family: 'Inter', 'DM Sans', system-ui, sans-serif;
        }
        .refresh-btn-warm {
          transition: all 0.3s ease;
        }
        .refresh-btn-warm:hover {
          color: ${colors.accent} !important;
          border-color: ${colors.accentBorder} !important;
          transform: rotate(180deg);
          background: ${colors.surfaceHover} !important;
        }
        .mode-tab-warm:hover {
          background: ${colors.accentBg} !important;
          color: ${colors.text} !important;
        }
        .search-btn-warm:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px ${colors.accent}44;
        }
        .upload-zone-warm:hover {
          border-color: ${colors.accent} !important;
          background: ${colors.accentBg} !important;
        }
        .result-card-warm {
          transition: all 0.25s ease;
          cursor: pointer;
        }
        .result-card-warm:hover {
          transform: translateY(-4px);
          border-color: ${colors.accent} !important;
          box-shadow: 0 12px 32px ${colors.cardShadow};
        }
        .chip-warm {
          transition: all 0.2s ease;
          cursor: pointer;
          border: none;
          font-family: 'Inter', 'DM Sans', system-ui, sans-serif;
        }
        .chip-warm:hover {
          background: ${colors.chipHoverBg} !important;
          border-color: ${colors.accentBorder} !important;
          transform: translateY(-1px);
        }
        .masonry-img-warm {
          transition: all 0.3s ease;
        }
        .masonry-img-warm:hover {
          transform: scale(1.02);
          box-shadow: 0 8px 28px ${colors.cardShadow};
        }
        .settings-btn-warm {
          transition: all 0.2s ease;
          cursor: pointer;
        }
        .settings-btn-warm:hover {
          background: ${colors.accentBg} !important;
          color: ${colors.accent} !important;
        }
        .step-card-warm {
          transition: all 0.25s ease;
        }
        .step-card-warm:hover {
          transform: translateY(-3px);
          border-color: ${colors.accentBorder} !important;
          box-shadow: 0 8px 24px ${colors.cardShadow};
        }
      `}</style>

      <main style={{
        ...S.main,
        ...(hasResults ? {} : S.mainCentered),
      }}>
        {/* ── Search Section ── */}
        <section style={{
          ...S.searchSection,
          ...(hasResults ? {} : S.searchSectionCentered),
          animation: "fadeInUp 0.5s ease forwards",
        }}>
          {/* Hero Text */}
          {!hasResults && (
            <div style={S.heroText}>
              <div style={S.heroBadge}>
                <span>📷</span>
                <span>Dikurasi dari Flickr</span>
              </div>
              <h1 style={S.heroTitle}>Temukan Momen Keseharian</h1>
              <p style={S.heroSubtitle}>
                Jelajahi ribuan foto autentik kegiatan manusia sehari-hari, dikurasi dari fotografer Flickr.
              </p>
            </div>
          )}

          {/* Mode Toggle Tabs */}
          <div style={S.modeTabs}>
            <button
              className="mode-tab-warm"
              style={{
                ...S.modeTab,
                ...(mode === "text" ? S.modeTabActive : {}),
              }}
              onClick={() => handleModeChange("text")}
            >
              <IconText />
              <span>Cari berdasarkan Deskripsi</span>
            </button>
            <button
              className="mode-tab-warm"
              style={{
                ...S.modeTab,
                ...(mode === "image" ? S.modeTabActive : {}),
              }}
              onClick={() => handleModeChange("image")}
            >
              <IconImage />
              <span>Cari berdasarkan Referensi</span>
            </button>
          </div>

          {/* Search Panel — Glassmorphism */}
          <div style={S.searchPanel}>
            {mode === "text" ? (
              /* ── Text Search Mode ── */
              <>
                <div style={S.textInputRow}>
                  <div style={S.textInputWrapper}>
                    <span style={S.searchIcon}><IconSearch /></span>
                    <input
                      style={{
                        ...S.textInput,
                        ...(fade ? {} : { opacity: 0.3 }),
                      }}
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={placeholder}
                      autoFocus
                    />
                    {query && (
                      <button style={S.clearBtn} onClick={handleClear}>
                        <IconX />
                      </button>
                    )}
                    {/* Settings gear icon — topK selector */}
                    <div style={{ position: "relative" }}>
                      <button
                        className="settings-btn-warm"
                        style={S.settingsBtn}
                        onClick={() => setShowSettings(!showSettings)}
                        title="Pengaturan jumlah hasil"
                      >
                        <IconSettings />
                      </button>
                      {showSettings && (
                        <div style={S.settingsPopover}>
                          <label style={S.settingsLabel}>
                            Jumlah hasil:
                            <select
                              style={S.settingsSelect}
                              value={topK}
                              onChange={(e) => {
                                handleTopKChange(e);
                                setShowSettings(false);
                              }}
                            >
                              {[6, 12, 24, 48].map((n) => (
                                <option key={n} value={n}>{n}</option>
                              ))}
                            </select>
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    className="search-btn-warm"
                    style={{ ...S.searchBtn, ...(canSubmitText ? {} : S.searchBtnDisabled) }}
                    onClick={handleTextSubmit}
                    disabled={!canSubmitText}
                  >
                    {loading ? (
                      <span style={S.spinner} />
                    ) : (
                      <><IconSearch /><span>Cari</span></>
                    )}
                  </button>
                </div>
              </>
            ) : (
              /* ── Image Search Mode ── */
              <>
                <p style={S.ctaText}>Upload gambar untuk menemukan gambar serupa</p>

                {!imagePreview ? (
                  <div
                    className="upload-zone-warm"
                    style={{
                      ...S.uploadZone,
                      ...(isDragging ? S.uploadZoneDragging : {}),
                    }}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <IconUpload />
                    <p style={S.uploadTitle}>
                      {isDragging ? "Lepaskan gambar di sini..." : "Klik atau seret gambar ke sini"}
                    </p>
                    <p style={S.uploadHint}>Format: JPG, PNG, WEBP · Maks 10MB</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      style={{ display: "none" }}
                      onChange={handleFileInput}
                    />
                  </div>
                ) : (
                  <div style={S.previewContainer}>
                    <div style={S.previewImageWrapper}>
                      <img src={imagePreview} alt="Preview" style={S.previewImage} />
                      <button style={S.previewRemoveBtn} onClick={clearImage}>
                        <IconX />
                      </button>
                    </div>
                    <p style={S.previewFilename}>{imageFile?.name}</p>
                  </div>
                )}

                <div style={S.imageSearchActions}>
                  <div style={{ position: "relative" }}>
                    <button
                      className="settings-btn-warm"
                      style={S.settingsBtn}
                      onClick={() => setShowSettings(!showSettings)}
                      title="Pengaturan jumlah hasil"
                    >
                      <IconSettings />
                      <span style={{ fontSize: 12 }}>{topK}</span>
                    </button>
                    {showSettings && (
                      <div style={S.settingsPopover}>
                        <label style={S.settingsLabel}>
                          Jumlah hasil:
                          <select
                            style={S.settingsSelect}
                            value={topK}
                            onChange={(e) => {
                              handleTopKChange(e);
                              setShowSettings(false);
                            }}
                          >
                            {[6, 12, 24, 48].map((n) => (
                              <option key={n} value={n}>{n}</option>
                            ))}
                          </select>
                        </label>
                      </div>
                    )}
                  </div>
                  <button
                    className="search-btn-warm"
                    style={{ ...S.searchBtn, ...(canSubmitImage ? {} : S.searchBtnDisabled) }}
                    onClick={handleImageSubmit}
                    disabled={!canSubmitImage}
                  >
                    {loading ? (
                      <span style={S.spinner} />
                    ) : (
                      <><IconSearch /><span>Cari</span></>
                    )}
                  </button>
                </div>
              </>
            )}

            {/* Error */}
            {error && (
              <div style={S.errorBox}>
                ⚠️ {error}
              </div>
            )}
          </div>
        </section>

        {/* ── Suggestion Chips (only before results) ── */}
        {!results && !loading && mode === "text" && (
          <section style={{
            ...S.chipsSection,
            animation: "fadeInUp 0.6s ease 0.15s both",
          }}>
            {[CHIP_GROUPS[activeGroupIndex]].map((group) => (
              <div key={group.label} style={S.chipGroup}>
                <div style={S.chipsHeader}>
                  <span style={S.chipsCta}>✨ Coba ini</span>
                  <button 
                    className="refresh-btn-warm"
                    style={S.chipsRefreshBtn} 
                    onClick={() => setActiveGroupIndex((prev) => (prev + 1) % CHIP_GROUPS.length)}
                    title="Tampilkan rekomendasi lain"
                  >
                    <IconRefresh />
                  </button>
                </div>
                <div style={S.chipGroupLabel}>
                  <span>{group.emoji}</span>
                  <span>{group.label}</span>
                </div>
                <div style={S.chipRow}>
                  {group.chips.map((chip) => (
                    <button
                      key={chip.query}
                      className="chip-warm"
                      style={{
                        ...S.chip,
                        ...(activeChipIdx === chip.query ? S.chipActive : {}),
                      }}
                      onClick={() => handleChipClick(chip.query)}
                      onMouseEnter={() => setActiveChipIdx(chip.query)}
                      onMouseLeave={() => setActiveChipIdx(null)}
                    >
                      <span style={S.chipEmoji}>{chip.emoji}</span>
                      <span>{chip.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </section>
        )}

        {/* ── Masonry Visual Proof Grid (only before results) ── */}
        {!results && !loading && samplesLoaded && sampleImages.length > 0 && (
          <section style={{
            ...S.masonrySection,
            animation: "fadeInUp 0.7s ease 0.3s both",
          }}>
            <div style={S.masonrySectionHeader}>
              <span style={S.masonrySectionIcon}>📸</span>
              <span style={S.masonrySectionTitle}>Contoh Galeri</span>
            </div>
            <div style={S.masonryGrid}>
              {sampleImages.map((img, i) => (
                <div
                  key={img.image_id}
                  className="masonry-img-warm"
                  style={{
                    ...S.masonryItem,
                    animation: `staggerFadeIn 0.5s ease ${0.1 * i}s both`,
                  }}
                >
                  <img
                    src={resolveImageUrl(img.url)}
                    alt={img.captions_id[0] ?? img.filename}
                    style={S.masonryImage}
                    loading="lazy"
                  />
                  {img.captions_id[0] && (
                    <div style={S.masonryCaption}>
                      <p style={S.masonryCaptionText}>{img.captions_id[0]}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Trust Section ── */}
        {!results && !loading && (
          <section style={{
            ...S.trustSection,
            animation: "fadeInUp 0.7s ease 0.45s both",
          }}>
            <h3 style={S.trustTitle}>Bagaimana cara kerjanya?</h3>
            <div style={S.trustSteps}>
              <div className="step-card-warm" style={S.stepCard}>
                <span style={S.stepEmoji}>✍️</span>
                <span style={S.stepNumber}>1</span>
                <p style={S.stepText}>Tulis deskripsi aktivitas</p>
                <p style={S.stepDesc}>Deskripsikan gambar yang kamu bayangkan dalam Bahasa Indonesia</p>
              </div>
              <div style={S.stepConnector}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.muted} strokeWidth="2" strokeLinecap="round">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </div>
              <div className="step-card-warm" style={S.stepCard}>
                <span style={S.stepEmoji}>🔍</span>
                <span style={S.stepNumber}>2</span>
                <p style={S.stepText}>AI cari foto terbaik dari Flickr</p>
                <p style={S.stepDesc}>Model AI mencocokkan deskripsi dengan ribuan foto asli</p>
              </div>
              <div style={S.stepConnector}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.muted} strokeWidth="2" strokeLinecap="round">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </div>
              <div className="step-card-warm" style={S.stepCard}>
                <span style={S.stepEmoji}>🖼️</span>
                <span style={S.stepNumber}>3</span>
                <p style={S.stepText}>Unduh / Gunakan fotonya</p>
                <p style={S.stepDesc}>Lihat detail, caption, dan gunakan foto yang ditemukan</p>
              </div>
            </div>
          </section>
        )}

        {/* ── Results ── */}
        {results && (
          <section style={S.resultsSection}>
            <div style={S.resultsHeader}>
              <span style={S.resultCount}>
                {results.total} gambar ditemukan
              </span>
              <span style={S.resultMeta}>
                {results.elapsed_ms}ms
                {results.query_text && <> · &quot;{results.query_text}&quot;</>}
                {!results.query_text && results.query_type === "image" && <> · pencarian gambar</>}
              </span>
              {/* TopK selector inline in results */}
              <label style={S.resultsTopK}>
                Tampilkan:
                <select
                  style={S.resultsTopKSelect}
                  value={topK}
                  onChange={handleTopKChange}
                >
                  {[6, 12, 24, 48].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </label>
              <button style={S.clearResultsBtn} onClick={handleClear}>
                Bersihkan
              </button>
            </div>

            <div style={S.grid}>
              {results.results.map((item) => (
                <ResultCard
                  key={item.image_id}
                  item={item}
                  colors={colors}
                  onClick={() => setSelectedItem(item)}
                />
              ))}
            </div>
          </section>
        )}
      </main>

      {/* ── Modal detail ── */}
      {selectedItem && (
        <DetailModal
          item={selectedItem}
          colors={colors}
          onClose={() => setSelectedItem(null)}
        />
      )}

      {/* ── Feedback Toast ── */}
      {showFeedback && (
        <FeedbackToast
          colors={colors}
          onFeedback={handleFeedback}
          feedbackSent={feedbackSent}
          onDismiss={() => setShowFeedback(false)}
        />
      )}
    </div>
  );
}

// ─── Result Card ──────────────────────────────────────────────

function ResultCard({ item, colors, onClick }: { item: SearchResultItem; colors: ThemeColors; onClick: () => void }) {
  const [imgError, setImgError] = useState(false);
  const scorePercent = Math.round(item.score * 100);
  const scoreColor =
    item.score > 0.7 ? "#27AE60" :
      item.score > 0.4 ? "#D4874D" : colors.muted;

  return (
    <div className="result-card-warm" style={{
      background: colors.surface,
      border: `1px solid ${colors.border}`,
      borderRadius: 14,
      overflow: "hidden",
      cursor: "pointer",
    }} onClick={onClick}>
      <div style={{ position: "relative", aspectRatio: "4/3", overflow: "hidden" }}>
        {!imgError ? (
          <img
            src={resolveImageUrl(item.url)}
            alt={item.captions_id[0] ?? item.filename}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div style={{
            width: "100%", height: "100%",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 32, background: colors.bgAlt,
          }}>🖼️</div>
        )}
        <div style={{
          position: "absolute", top: 8, right: 8,
          borderRadius: 8, padding: "3px 10px",
          fontSize: 11, fontWeight: 700, color: "#fff",
          backgroundColor: scoreColor,
          backdropFilter: "blur(4px)",
        }}>
          {scorePercent}%
        </div>
        <div style={{
          position: "absolute", top: 8, left: 8,
          background: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(4px)",
          borderRadius: 8, padding: "3px 9px",
          fontSize: 11, color: "#fff", fontWeight: 600,
        }}>
          #{item.rank}
        </div>
      </div>
      <div style={{ padding: "10px 14px" }}>
        {item.captions_id[0] && (
          <p style={{
            fontSize: 13, color: colors.textSecondary, margin: 0,
            display: "-webkit-box", WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical", overflow: "hidden",
            lineHeight: 1.5,
          }}>{item.captions_id[0]}</p>
        )}
      </div>
    </div>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────

function DetailModal({ item, colors, onClose }: { item: SearchResultItem; colors: ThemeColors; onClose: () => void }) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const imgUrl = resolveImageUrl(item.url);
      const res = await fetch(imgUrl);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = item.image_id || "image.jpg";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Download gagal:", err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: colors.overlayBg, backdropFilter: "blur(6px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 100, padding: 24,
    }} onClick={onClose}>
      <div style={{
        background: colors.surface, border: `1px solid ${colors.border}`,
        borderRadius: 18, maxWidth: 780, width: "100%",
        maxHeight: "90vh", overflow: "auto", position: "relative",
        boxShadow: `0 24px 64px ${colors.cardShadow}`,
      }} onClick={(e) => e.stopPropagation()}>
        <button style={{
          position: "absolute", top: 12, right: 12,
          background: colors.bg, border: `1px solid ${colors.border}`,
          color: colors.muted, borderRadius: 8, padding: 6,
          cursor: "pointer", display: "flex", zIndex: 1,
        }} onClick={onClose}><IconX /></button>
        <img
          src={resolveImageUrl(item.url)}
          alt={item.captions_id[0] ?? ""}
          style={{ width: "100%", maxHeight: 380, objectFit: "contain", background: colors.bgAlt }}
        />
        <div style={{ padding: "20px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
            <span style={{
              background: colors.accentBg,
              border: `1px solid ${colors.accentBorder}`,
              borderRadius: 8, padding: "5px 14px", fontSize: 14, fontWeight: 600,
              color: colors.accent,
            }}>Skor: {(item.score * 100).toFixed(1)}%</span>
            <span style={{ color: colors.muted, fontSize: 13 }}>Peringkat #{item.rank}</span>
            <button
              onClick={handleDownload}
              disabled={downloading}
              style={{
                marginLeft: "auto",
                display: "inline-flex", alignItems: "center", gap: 6,
                background: colors.accent, color: "#fff",
                border: "none", borderRadius: 10, padding: "8px 18px",
                fontSize: 13, fontWeight: 600, cursor: downloading ? "wait" : "pointer",
                opacity: downloading ? 0.7 : 1,
                transition: "all 0.2s ease",
                boxShadow: `0 2px 8px ${colors.accent}44`,
              }}
              onMouseEnter={(e) => { if (!downloading) { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = `0 4px 16px ${colors.accent}66`; }}}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = `0 2px 8px ${colors.accent}44`; }}
            >
              {downloading ? (
                <span style={{
                  width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)",
                  borderTopColor: "#fff", borderRadius: "50%",
                  animation: "spin 0.6s linear infinite", display: "inline-block",
                }} />
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7,10 12,15 17,10" /><line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              )}
              <span>{downloading ? "Mengunduh..." : "Unduh Gambar"}</span>
            </button>
          </div>
          {item.captions_id.length > 0 && (
            <>
              <h4 style={{ fontSize: 12, color: colors.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Caption (ID)</h4>
              {item.captions_id.map((c, i) => <p key={i} style={{ fontSize: 14, marginBottom: 6, lineHeight: 1.6, color: colors.text }}>{c}</p>)}
            </>
          )}
          {item.captions_en.length > 0 && (
            <>
              <h4 style={{ fontSize: 12, color: colors.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4, marginTop: 12 }}>Caption (EN)</h4>
              {item.captions_en.map((c, i) => <p key={i} style={{ fontSize: 14, marginBottom: 6, lineHeight: 1.6, color: colors.textSecondary }}>{c}</p>)}
            </>
          )}
          <p style={{ fontSize: 11, color: colors.muted, marginTop: 12, fontFamily: "monospace" }}>ID: {item.image_id}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Feedback Toast ───────────────────────────────────────────

function FeedbackToast({ colors, onFeedback, feedbackSent, onDismiss }: {
  colors: ThemeColors;
  onFeedback: (isRelevant: boolean) => void;
  feedbackSent: boolean;
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (feedbackSent) return;
    const timer = setTimeout(() => onDismiss(), 15000);
    return () => clearTimeout(timer);
  }, [feedbackSent, onDismiss]);

  return (
    <>
      <style>{`
        @keyframes toastSlideUp { from { transform: translateY(120%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes checkPop { 0% { transform: scale(0); } 50% { transform: scale(1.2); } 100% { transform: scale(1); } }
      `}</style>
      <div style={{
        position: "fixed", bottom: 24, right: 24, zIndex: 200,
        animation: "toastSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards",
      }}>
        <div style={{
          background: colors.surface,
          backdropFilter: "blur(16px)",
          border: `1px solid ${colors.accentBorder}`,
          borderRadius: 16, padding: "16px 20px",
          display: "flex", alignItems: "center", gap: 16,
          minWidth: 340, maxWidth: 440,
          boxShadow: `0 8px 32px ${colors.cardShadow}`,
        }}>
          {!feedbackSent ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
                <span style={{ fontSize: 24 }}>💬</span>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: colors.text, margin: 0 }}>Bagaimana hasil pencariannya?</p>
                  <p style={{ fontSize: 12, color: colors.muted, margin: "2px 0 0 0" }}>Apakah hasil yang ditampilkan sesuai?</p>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "8px 14px", borderRadius: 10,
                  border: `1px solid ${colors.successBorder}`,
                  background: colors.successBg, color: colors.successText,
                  fontSize: 13, fontWeight: 600, cursor: "pointer",
                }} onClick={() => onFeedback(true)}>
                  <span style={{ fontSize: 18 }}>👍</span><span>Sesuai</span>
                </button>
                <button style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "8px 14px", borderRadius: 10,
                  border: `1px solid ${colors.errorBorder}`,
                  background: colors.errorBg, color: colors.errorText,
                  fontSize: 13, fontWeight: 600, cursor: "pointer",
                }} onClick={() => onFeedback(false)}>
                  <span style={{ fontSize: 18 }}>👎</span><span>Tidak</span>
                </button>
                <button style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: 28, height: 28, borderRadius: 8,
                  border: `1px solid ${colors.border}`, background: "transparent",
                  color: colors.muted, cursor: "pointer", padding: 0,
                }} onClick={onDismiss}>
                  <IconX />
                </button>
              </div>
            </>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 10, color: colors.successText, fontSize: 14, fontWeight: 600 }}>
              <span style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 24, height: 24, borderRadius: "50%",
                background: colors.successBg, color: colors.successText,
                fontSize: 14, fontWeight: 700,
                animation: "checkPop 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards",
              }}>✓</span>
              <span>Terima kasih atas feedback Anda!</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Styles Builder ───────────────────────────────────────────

function buildStyles(c: ThemeColors): Record<string, React.CSSProperties> {
  return {
    page: {
      minHeight: "100vh",
      backgroundColor: c.bg,
      color: c.text,
      fontFamily: "'Inter', 'DM Sans', 'Segoe UI', system-ui, sans-serif",
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
      justifyContent: "flex-start",
      minHeight: "calc(100vh - 56px)",
      padding: "48px 24px 80px",
    },

    // ── Search Section ──
    searchSection: {
      width: "100%",
      maxWidth: 720,
      margin: "0 auto",
    },
    searchSectionCentered: {
      marginBottom: 32,
    },

    // ── Hero Text ──
    heroText: {
      textAlign: "center",
      marginBottom: 36,
    },
    heroBadge: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      background: c.accentBg,
      border: `1px solid ${c.accentBorder}`,
      borderRadius: 20,
      padding: "5px 14px",
      fontSize: 12,
      fontWeight: 600,
      color: c.accent,
      marginBottom: 16,
    },
    heroTitle: {
      fontSize: 42,
      fontWeight: 900,
      letterSpacing: "-0.5px",
      marginBottom: 12,
      backgroundImage: `linear-gradient(135deg, ${c.text} 0%, ${c.accent} 100%)`,
      backgroundClip: "text",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      color: "transparent",
      lineHeight: 1.15,
    },
    heroSubtitle: {
      fontSize: 16,
      color: c.muted,
      margin: 0,
      lineHeight: 1.6,
      maxWidth: 520,
      marginLeft: "auto",
      marginRight: "auto",
    },

    // ── Mode Tabs ──
    modeTabs: {
      display: "flex",
      gap: 4,
      marginBottom: 14,
      background: c.bgAlt,
      border: `1px solid ${c.border}`,
      borderRadius: 14,
      padding: 4,
    },
    modeTab: {
      flex: 1,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      padding: "10px 16px",
      borderRadius: 10,
      background: "transparent",
      color: c.muted,
      fontSize: 13,
      fontWeight: 500,
      cursor: "pointer",
      transition: "all 0.25s ease",
    },
    modeTabActive: {
      background: c.accentBg,
      color: c.text,
      fontWeight: 600,
      border: `1px solid ${c.accentBorder}`,
    },

    // ── Search Panel (Glassmorphism) ──
    searchPanel: {
      background: c.searchBarBg,
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      border: `1px solid ${c.searchBarBorder}`,
      borderRadius: 18,
      padding: "20px 22px",
      display: "flex",
      flexDirection: "column",
      gap: 14,
      boxShadow: `0 4px 24px ${c.cardShadow}`,
    },
    ctaText: {
      fontSize: 13,
      color: c.muted,
      margin: 0,
      textAlign: "center",
    },
    textInputRow: { display: "flex", gap: 10 },
    textInputWrapper: {
      flex: 1, display: "flex", alignItems: "center",
      background: c.surface, border: `1px solid ${c.border}`,
      borderRadius: 12, padding: "0 12px",
      transition: "border-color 0.2s, box-shadow 0.2s",
    },
    searchIcon: { color: c.muted, flexShrink: 0, display: "flex" },
    textInput: {
      flex: 1, background: "transparent", border: "none",
      outline: "none", color: c.text, fontSize: 15, padding: "13px 10px",
      fontFamily: "'Inter', 'DM Sans', system-ui, sans-serif",
      transition: "opacity 0.3s ease",
    },
    clearBtn: {
      background: "transparent", border: "none",
      color: c.muted, cursor: "pointer", display: "flex", padding: 4,
    },
    settingsBtn: {
      display: "flex", alignItems: "center", gap: 4,
      background: "transparent", border: "none",
      color: c.muted, padding: "6px 8px", borderRadius: 8,
      fontSize: 13,
    },
    settingsPopover: {
      position: "absolute", top: "calc(100% + 6px)", right: 0,
      background: c.surface, border: `1px solid ${c.border}`,
      borderRadius: 10, padding: "12px 16px",
      boxShadow: `0 8px 24px ${c.cardShadow}`,
      zIndex: 10, minWidth: 160,
    },
    settingsLabel: {
      display: "flex", alignItems: "center",
      gap: 8, fontSize: 13, color: c.textSecondary,
    },
    settingsSelect: {
      background: c.bg, border: `1px solid ${c.border}`,
      color: c.text, borderRadius: 6, padding: "5px 10px", fontSize: 13,
    },
    imageSearchActions: {
      display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10,
    },
    searchBtn: {
      display: "flex", alignItems: "center",
      gap: 8, padding: "11px 28px", borderRadius: 12,
      background: c.accent, border: "none", color: "#fff",
      fontSize: 15, fontWeight: 600, cursor: "pointer",
      transition: "all 0.2s ease",
      fontFamily: "'Inter', 'DM Sans', system-ui, sans-serif",
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
      background: c.errorBg,
      border: `1px solid ${c.errorBorder}`,
      borderRadius: 10, padding: "10px 16px",
      color: c.errorText, fontSize: 13,
    },

    // ── Upload Zone ──
    uploadZone: {
      border: `2px dashed ${c.border}`,
      borderRadius: 14,
      padding: "32px 24px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 8,
      cursor: "pointer",
      color: c.muted,
      transition: "all 0.2s ease",
      background: "transparent",
    },
    uploadZoneDragging: {
      borderColor: c.accent,
      background: c.accentBg,
      color: c.text,
    },
    uploadTitle: { fontSize: 14, fontWeight: 500, margin: 0 },
    uploadHint: { fontSize: 12, color: c.muted, margin: 0, opacity: 0.7 },

    // ── Image Preview ──
    previewContainer: { display: "flex", flexDirection: "column", alignItems: "center", gap: 8 },
    previewImageWrapper: {
      position: "relative", borderRadius: 14,
      overflow: "hidden", border: `1px solid ${c.border}`, maxWidth: 280,
    },
    previewImage: { width: "100%", maxHeight: 200, objectFit: "cover", display: "block" },
    previewRemoveBtn: {
      position: "absolute", top: 8, right: 8,
      background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.2)",
      color: "#fff", borderRadius: 8, padding: 4, cursor: "pointer", display: "flex",
    },
    previewFilename: { fontSize: 12, color: c.muted, margin: 0 },

    // ── Suggestion Chips ──
    chipsSection: {
      width: "100%",
      maxWidth: 720,
      margin: "0 auto",
      display: "flex",
      flexDirection: "column",
      gap: 16,
      marginTop: 4,
      marginBottom: 24,
    },
    chipsHeader: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
      marginBottom: 8,
    },
    chipsCta: {
      fontSize: 14,
      fontWeight: 600,
      color: c.textSecondary,
    },
    chipsRefreshBtn: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: c.surface,
      border: `1px solid ${c.border}`,
      color: c.muted,
      borderRadius: "50%",
      width: 28,
      height: 28,
      cursor: "pointer",
    },
    chipGroup: {
      display: "flex",
      flexDirection: "column",
      gap: 8,
    },
    chipGroupLabel: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      fontSize: 13,
      fontWeight: 600,
      color: c.muted,
    },
    chipRow: {
      display: "flex",
      gap: 8,
      flexWrap: "wrap",
    },
    chip: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: "8px 16px",
      borderRadius: 20,
      background: c.chipBg,
      border: `1px solid ${c.chipBorder}`,
      color: c.textSecondary,
      fontSize: 13,
      fontWeight: 500,
    },
    chipActive: {
      background: c.chipHoverBg,
      borderColor: c.accentBorder,
      color: c.accent,
    },
    chipEmoji: {
      fontSize: 15,
    },

    // ── Masonry Grid ──
    masonrySection: {
      width: "100%",
      maxWidth: 900,
      margin: "0 auto 32px auto",
    },
    masonrySectionHeader: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      marginBottom: 16,
      justifyContent: "center",
    },
    masonrySectionIcon: { fontSize: 18 },
    masonrySectionTitle: { fontSize: 15, fontWeight: 600, color: c.muted },
    masonryGrid: {
      columnCount: 4,
      columnGap: "12px",
    },
    masonryItem: {
      breakInside: "avoid",
      marginBottom: 12,
      borderRadius: 14,
      overflow: "hidden",
      position: "relative",
      border: `1px solid ${c.borderLight}`,
      background: c.surface,
    },
    masonryImage: {
      width: "100%",
      display: "block",
    },
    masonryCaption: {
      padding: "8px 12px",
    },
    masonryCaptionText: {
      fontSize: 12,
      color: c.muted,
      margin: 0,
      lineHeight: 1.4,
      display: "-webkit-box",
      WebkitLineClamp: 2,
      WebkitBoxOrient: "vertical",
      overflow: "hidden",
    },

    // ── Trust Section ──
    trustSection: {
      width: "100%",
      maxWidth: 800,
      margin: "0 auto",
      textAlign: "center",
      padding: "24px 0 40px",
    },
    trustTitle: {
      fontSize: 18,
      fontWeight: 700,
      color: c.text,
      marginBottom: 24,
    },
    trustSteps: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
      flexWrap: "wrap",
    },
    stepCard: {
      flex: "1 1 180px",
      maxWidth: 220,
      background: c.surface,
      border: `1px solid ${c.border}`,
      borderRadius: 16,
      padding: "24px 18px 20px",
      textAlign: "center",
      position: "relative",
    },
    stepEmoji: {
      fontSize: 32,
      display: "block",
      marginBottom: 8,
    },
    stepNumber: {
      position: "absolute",
      top: 10,
      right: 12,
      fontSize: 11,
      fontWeight: 700,
      color: c.accent,
      background: c.accentBg,
      borderRadius: 6,
      padding: "2px 8px",
    },
    stepText: {
      fontSize: 14,
      fontWeight: 600,
      color: c.text,
      margin: "0 0 6px 0",
      lineHeight: 1.4,
    },
    stepDesc: {
      fontSize: 12,
      color: c.muted,
      margin: 0,
      lineHeight: 1.5,
    },
    stepConnector: {
      display: "flex",
      alignItems: "center",
      color: c.muted,
      flexShrink: 0,
    },

    // ── Results ──
    resultsSection: { marginTop: 32 },
    resultsHeader: {
      display: "flex", alignItems: "center",
      gap: 12, marginBottom: 20, flexWrap: "wrap",
    },
    resultCount: { fontWeight: 700, fontSize: 16, color: c.text },
    resultMeta: { color: c.muted, fontSize: 13, flex: 1 },
    resultsTopK: {
      display: "flex", alignItems: "center", gap: 6,
      fontSize: 12, color: c.muted,
    },
    resultsTopKSelect: {
      background: c.surface, border: `1px solid ${c.border}`,
      color: c.text, borderRadius: 6, padding: "4px 8px", fontSize: 12,
    },
    clearResultsBtn: {
      background: "transparent", border: `1px solid ${c.border}`,
      color: c.muted, borderRadius: 8, padding: "6px 16px",
      fontSize: 12, cursor: "pointer",
      fontFamily: "'Inter', 'DM Sans', system-ui, sans-serif",
    },
    grid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))",
      gap: 16,
    },
  };
}
