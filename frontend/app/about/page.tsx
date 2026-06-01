"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { resolveImageUrl, listIndexImages } from "@/lib/api";

// ─── Types ───────────────────────────────────────────────────

interface SampleImage {
  image_id: string;
  url: string;
  captions_id: string[];
  captions_en: string[];
  filename: string;
}

// ─── Main Page ───────────────────────────────────────────────

export default function AboutPage() {
  const [exploreSamples, setExploreSamples] = useState<SampleImage[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loaderRef = useRef<HTMLDivElement | null>(null);

  // ── Infinite Scroll Fetching ──
  const fetchExploreImages = useCallback(async (pageToFetch: number) => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const data = await listIndexImages(pageToFetch, 12);
      const newImages = data.items.map((item) => ({
        image_id: item.image_id,
        url: item.url,
        captions_id: item.captions_id,
        captions_en: item.captions_en,
        filename: item.filename,
      }));
      
      setExploreSamples((prev) => {
        const existingIds = new Set(prev.map(img => img.image_id));
        const filteredNew = newImages.filter(img => !existingIds.has(img.image_id));
        return [...prev, ...filteredNew];
      });
      setHasMore(data.page < data.total_pages);
      setPage(pageToFetch + 1);
    } catch {
      console.error("Gagal memuat gambar eksplorasi");
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore]);

  // Initial load
  useEffect(() => {
    fetchExploreImages(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Intersection Observer setup
  useEffect(() => {
    if (loadingMore) return;
    
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore) {
        fetchExploreImages(page);
      }
    });

    if (loaderRef.current) {
      observerRef.current.observe(loaderRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [loadingMore, hasMore, fetchExploreImages, page]);


  return (
    <div style={S.page}>
      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        @keyframes pulseBorder { 0%, 100% { border-color: rgba(59, 130, 246, 0.3); } 50% { border-color: rgba(59, 130, 246, 0.8); } }
        .about-card { transition: all 0.2s ease; }
        .about-card:hover { transform: translateY(-2px); border-color: #475569 !important; }
        .sample-card { transition: all 0.25s ease; }
        .sample-card:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.3); border-color: #3b82f6 !important; }
      `}</style>

      {/* ── Hero Section ── */}
      <header style={S.hero}>
        <div style={S.heroInner}>
          <div style={S.heroTag}>
            <span style={S.heroTagIcon}>📚</span>
            <span>Tentang Dataset</span>
          </div>
          <h1 style={S.heroTitle}>Flickr30K Indonesia</h1>
          <p style={S.heroSubtitle}>
            Memahami dataset yang digunakan dalam sistem pencarian gambar ini
          </p>
          
          {/* Top 3 Frames Example */}
          <div style={{ display: "flex", gap: "16px", justifyContent: "center", marginTop: "32px", flexWrap: "wrap" }}>
            <div style={S.topFrame}>
              <img src={resolveImageUrl("/images/1007129816.jpg")} alt="Frame 1" style={S.topFrameImg} />
            </div>
            <div style={S.topFrame}>
              <img src={resolveImageUrl("/images/1009434119.jpg")} alt="Frame 2" style={S.topFrameImg} />
            </div>
            <div style={S.topFrame}>
              <img src={resolveImageUrl("/images/101362133.jpg")} alt="Frame 3" style={S.topFrameImg} />
            </div>
          </div>
        </div>
      </header>

      <main style={S.main}>
        {/* ── Dataset Overview ── */}
        <section style={{ ...S.section, animation: "fadeInUp 0.5s ease forwards" }}>
          <div style={S.sectionHeader}>
            <span style={S.sectionIcon}>🖼️</span>
            <h2 style={S.sectionTitle}>Flickr30K Dataset</h2>
          </div>
          <div style={S.contentCard}>
            <p style={S.paragraph}>
              <strong>Flickr30K</strong> adalah kumpulan dataset gambar yang bersumber dari platform 
              Flickr. Dataset aslinya berisi sekitar <strong>31.000 gambar</strong> yang menampilkan berbagai 
              aktivitas sehari-hari, mulai dari orang-orang yang beraktivitas, hewan peliharaan, 
              pemandangan alam, hingga kegiatan olahraga dan rekreasi.
            </p>
            
            <div style={S.alertBox}>
              <strong style={{ display: "block", marginBottom: 6, color: "#f87171" }}>⚠️ Panduan Pencarian:</strong>
              <ul style={{ margin: 0, paddingLeft: 20, color: "#f1f5f9", fontSize: 14, lineHeight: 1.6 }}>
                <li><strong>Yang BISA dicari:</strong> Deskripsi visual benda, aktivitas, bentuk, warna, jumlah orang, dan ekspresi. <em>(Misal: "Seorang anak kecil berbaju merah sedang bermain bola di taman hijau")</em></li>
                <li><strong>Yang TIDAK BISA dicari:</strong> Nama orang spesifik (misal: "Jokowi"), Nama tempat/gedung spesifik (misal: "Monas", "Jakarta"), atau Merek/Brand spesifik (misal: "iPhone", "Nike").</li>
              </ul>
              <p style={{ marginTop: 10, marginBottom: 0, fontSize: 13, color: "#94a3b8" }}>
                Gunakan deskripsi yang menggambarkan apa yang terlihat oleh mata secara langsung.
              </p>
            </div>
          </div>
        </section>

        {/* ── Language Info ── */}
        <section style={{ ...S.section, animation: "fadeInUp 0.5s ease 0.1s both" }}>
          <div style={S.sectionHeader}>
            <span style={S.sectionIcon}>🌐</span>
            <h2 style={S.sectionTitle}>Bahasa yang Digunakan</h2>
          </div>
          <div style={S.languageCards}>
            <div className="about-card" style={S.langCard}>
              <div style={S.langFlag}>🇮🇩</div>
              <h3 style={S.langTitle}>Bahasa Indonesia</h3>
              <p style={S.langDesc}>
                Seluruh deskripsi gambar dalam model ini diproses dengan pemahaman Bahasa Indonesia, 
                memungkinkan pencarian gambar dengan kalimat kompleks secara semantik dan intuitif.
              </p>
            </div>
          </div>
        </section>

        {/* ── Explore (Infinite Scroll) ── */}
        <section style={{ ...S.section, animation: "fadeInUp 0.5s ease 0.2s both" }}>
          <div style={S.sectionHeader}>
            <span style={S.sectionIcon}>📸</span>
            <h2 style={S.sectionTitle}>Eksplorasi Galeri</h2>
          </div>
          <p style={{ ...S.paragraph, marginBottom: 20 }}>
            Gulir ke bawah untuk mengeksplorasi berbagai gambar dalam koleksi ini.
          </p>

          <div style={S.sampleGrid}>
            {exploreSamples.map((img) => (
              <div key={img.image_id} className="sample-card" style={S.sampleCard}>
                <div style={S.sampleImgWrapper}>
                  <img
                    src={resolveImageUrl(img.url)}
                    alt={img.captions_id[0] ?? img.filename}
                    style={S.sampleImg}
                    loading="lazy"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
                <div style={S.sampleBody}>
                  {img.captions_id[0] && (
                    <p style={S.sampleCaptionId}>
                      <span style={S.captionBadge}>ID</span>
                      {img.captions_id[0]}
                    </p>
                  )}
                  {img.captions_en[0] && (
                    <p style={S.sampleCaptionEn}>
                      <span style={{ ...S.captionBadge, background: "rgba(34, 197, 94, 0.15)", color: "#4ade80" }}>EN</span>
                      {img.captions_en[0]}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Loading Indicator for Infinite Scroll */}
          {loadingMore && (
            <div style={S.loadingGrid}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={`loader-${i}`} style={S.skeletonCard}>
                  <div style={S.skeletonImage} />
                  <div style={S.skeletonText} />
                  <div style={{ ...S.skeletonText, width: "60%" }} />
                </div>
              ))}
            </div>
          )}

          {/* Infinite Scroll sentinel */}
          <div ref={loaderRef} style={{ height: "40px", marginTop: "20px" }} />
          
          {!hasMore && exploreSamples.length > 0 && (
            <p style={{ textAlign: "center", color: "#94a3b8", marginTop: 20 }}>
              Semua gambar telah dimuat.
            </p>
          )}

        </section>
      </main>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────

const BG = "#0f172a";
const SURFACE = "#1e293b";
const BORDER = "#334155";
const TEXT = "#f1f5f9";
const MUTED = "#94a3b8";

const S: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: BG,
    color: TEXT,
    fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
  },

  // ── Hero ──
  hero: {
    background: `linear-gradient(135deg, ${BG} 0%, #0f2148 50%, #1a1040 100%)`,
    borderBottom: `1px solid ${BORDER}`,
    padding: "48px 24px 40px",
  },
  heroInner: {
    maxWidth: 900,
    margin: "0 auto",
    textAlign: "center",
  },
  heroTag: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    background: "rgba(59, 130, 246, 0.12)",
    border: "1px solid rgba(59, 130, 246, 0.25)",
    borderRadius: 20,
    padding: "6px 16px",
    fontSize: 13,
    fontWeight: 500,
    color: "#93c5fd",
    marginBottom: 16,
  },
  heroTagIcon: {
    fontSize: 14,
  },
  heroTitle: {
    fontSize: 48,
    fontWeight: 900, // BOLD
    letterSpacing: "-0.5px",
    marginBottom: 12,
    background: "linear-gradient(135deg, #f1f5f9 0%, #93c5fd 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    lineHeight: 1.2,
  },
  heroSubtitle: {
    fontSize: 16,
    color: MUTED,
    margin: 0,
    lineHeight: 1.6,
  },
  
  // ── Top Frames ──
  topFrame: {
    width: 140,
    height: 140,
    borderRadius: 16,
    border: "4px solid rgba(255, 255, 255, 0.1)",
    overflow: "hidden",
    boxShadow: "0 10px 25px rgba(0,0,0,0.4)",
    transform: "rotate(-2deg)",
    transition: "transform 0.3s ease",
    background: "#1e293b",
  },
  topFrameImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },

  // ── Main ──
  main: {
    maxWidth: 900,
    margin: "0 auto",
    padding: "40px 24px 80px",
  },

  // ── Section ──
  section: {
    marginBottom: 40,
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  sectionIcon: {
    fontSize: 22,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 700,
    margin: 0,
  },

  // ── Content Card ──
  contentCard: {
    background: SURFACE,
    border: `1px solid ${BORDER}`,
    borderRadius: 14,
    padding: "24px 28px",
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 1.75,
    color: "#cbd5e1",
    margin: "0 0 14px 0",
  },
  alertBox: {
    background: "rgba(239, 68, 68, 0.1)",
    border: "1px solid rgba(239, 68, 68, 0.25)",
    borderRadius: 10,
    padding: "16px 20px",
    marginTop: 20,
  },

  // ── Language Cards ──
  languageCards: {
    display: "flex",
    width: "100%",
  },
  langCard: {
    background: SURFACE,
    border: `1px solid ${BORDER}`,
    borderRadius: 14,
    padding: 24,
    flex: 1, // Full width now
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
  },
  langFlag: {
    fontSize: 36,
    marginBottom: 10,
  },
  langTitle: {
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 8,
  },
  langDesc: {
    fontSize: 14,
    color: MUTED,
    lineHeight: 1.6,
    margin: 0,
  },

  // ── Sample Grid ──
  sampleGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
    gap: 16,
  },
  sampleCard: {
    background: SURFACE,
    border: `1px solid ${BORDER}`,
    borderRadius: 12,
    overflow: "hidden",
  },
  sampleImgWrapper: {
    aspectRatio: "4/3",
    overflow: "hidden",
    background: "#1a2a3a",
  },
  sampleImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  sampleBody: {
    padding: "12px 14px",
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  sampleCaptionId: {
    fontSize: 13,
    color: "#cbd5e1",
    margin: 0,
    lineHeight: 1.5,
    display: "flex",
    alignItems: "flex-start",
    gap: 6,
  },
  sampleCaptionEn: {
    fontSize: 12,
    color: MUTED,
    margin: 0,
    lineHeight: 1.5,
    display: "flex",
    alignItems: "flex-start",
    gap: 6,
  },
  captionBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    padding: "1px 6px",
    borderRadius: 4,
    fontSize: 10,
    fontWeight: 700,
    background: "rgba(59, 130, 246, 0.15)",
    color: "#93c5fd",
    marginTop: 2,
  },

  // ── Loading Skeleton ──
  loadingGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
    gap: 16,
    marginTop: 16,
  },
  skeletonCard: {
    background: SURFACE,
    border: `1px solid ${BORDER}`,
    borderRadius: 12,
    overflow: "hidden",
    padding: 0,
  },
  skeletonImage: {
    aspectRatio: "4/3",
    background: `linear-gradient(90deg, ${SURFACE} 25%, #283548 50%, ${SURFACE} 75%)`,
    backgroundSize: "200% 100%",
    animation: "shimmer 1.5s infinite",
  },
  skeletonText: {
    height: 12,
    background: `linear-gradient(90deg, ${SURFACE} 25%, #283548 50%, ${SURFACE} 75%)`,
    backgroundSize: "200% 100%",
    animation: "shimmer 1.5s infinite",
    borderRadius: 4,
    margin: "12px 14px 0",
    width: "80%",
  },
};
