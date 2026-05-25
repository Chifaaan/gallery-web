"use client";

import { useEffect, useState } from "react";
import { resolveImageUrl, listIndexImages, IndexListResponse } from "@/lib/api";

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
  const [samples, setSamples] = useState<SampleImage[]>([]);
  const [loadingSamples, setLoadingSamples] = useState(true);

  useEffect(() => {
    const fetchSamples = async () => {
      try {
        const data = await listIndexImages(1, 6);
        setSamples(
          data.items.map((item) => ({
            image_id: item.image_id,
            url: item.url,
            captions_id: item.captions_id,
            captions_en: item.captions_en,
            filename: item.filename,
          }))
        );
      } catch {
        console.error("Gagal memuat contoh gambar");
      } finally {
        setLoadingSamples(false);
      }
    };
    fetchSamples();
  }, []);

  return (
    <div style={S.page}>
      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
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
          <h1 style={S.heroTitle}>About this Gallery</h1>
          <p style={S.heroSubtitle}>
            Memahami dataset yang digunakan dalam sistem pencarian gambar ini
          </p>
        </div>
      </header>

      <main style={S.main}>
        {/* ── Dataset Overview ── */}
        <section style={{ ...S.section, animation: "fadeInUp 0.5s ease forwards" }}>
          <div style={S.sectionHeader}>
            <span style={S.sectionIcon}>🖼️</span>
            <h2 style={S.sectionTitle}>Flickr8k Dataset</h2>
          </div>
          <div style={S.contentCard}>
            <p style={S.paragraph}>
              <strong>Flickr8k</strong> adalah kumpulan dataset gambar yang bersumber dari platform 
              Flickr. Dataset ini berisi sekitar <strong>8.000 gambar</strong> yang menampilkan berbagai 
              aktivitas sehari-hari, mulai dari orang-orang yang beraktivitas, hewan peliharaan, 
              pemandangan alam, hingga kegiatan olahraga dan rekreasi.
            </p>
            <p style={S.paragraph}>
              Setiap gambar dalam dataset ini dilengkapi dengan deskripsi teks yang menjelaskan 
              isi gambar secara detail. Deskripsi-deskripsi ini ditulis oleh anotator manusia 
              untuk menangkap konteks visual dari setiap gambar.
            </p>
            <p style={S.paragraph}>
              Dataset Flickr8k banyak digunakan dalam penelitian <em>image-text retrieval</em>,
              yaitu mencari gambar berdasarkan deskripsi teks dan sebaliknya. Dataset ini menjadi 
              salah satu benchmark populer dalam bidang <em>computer vision</em> dan 
              <em> natural language processing</em>.
            </p>
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
                Seluruh deskripsi gambar dalam galeri ini tersedia dalam Bahasa Indonesia, 
                memungkinkan pencarian gambar dengan query berbahasa Indonesia secara alami dan intuitif.
              </p>
            </div>
          </div>
        </section>

        {/* ── Technology ── */}
        <section style={{ ...S.section, animation: "fadeInUp 0.5s ease 0.2s both" }}>
          <div style={S.sectionHeader}>
            <span style={S.sectionIcon}>🤖</span>
            <h2 style={S.sectionTitle}>Teknologi di Balik Pencarian</h2>
          </div>
          <div style={S.contentCard}>
            <p style={S.paragraph}>
              Sistem pencarian ini menggunakan model <strong>CLIP ViT-B/32</strong> (Contrastive Language-Image
              Pre-training) yang telah di-<em>fine-tune</em> pada dataset Flickr30K-Indonesia untuk
              mengoptimalkan kemampuan pencarian gambar berbahasa Indonesia.
            </p>
            <p style={S.paragraph}>
              Dengan pendekatan ini, sistem dapat memahami hubungan antara teks berbahasa Indonesia
              dengan gambar, sehingga memungkinkan pencarian gambar secara semantik — bukan hanya
              mencocokkan kata kunci, tetapi memahami <em>makna</em> dari deskripsi yang diberikan.
            </p>
            <div style={S.techFeatures}>
              <div style={S.techFeature}>
                <span style={S.techFeatureIcon}>🔍</span>
                <div>
                  <strong style={S.techFeatureTitle}>Pencarian Teks</strong>
                  <p style={S.techFeatureDesc}>Cari gambar menggunakan deskripsi dalam Bahasa Indonesia</p>
                </div>
              </div>
              <div style={S.techFeature}>
                <span style={S.techFeatureIcon}>🖼️</span>
                <div>
                  <strong style={S.techFeatureTitle}>Pencarian Gambar</strong>
                  <p style={S.techFeatureDesc}>Temukan gambar serupa dengan mengupload gambar referensi</p>
                </div>
              </div>
              <div style={S.techFeature}>
                <span style={S.techFeatureIcon}>⚡</span>
                <div>
                  <strong style={S.techFeatureTitle}>Pencarian Cepat</strong>
                  <p style={S.techFeatureDesc}>Menggunakan cosine similarity pada embedding 512 dimensi</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Sample Images ── */}
        <section style={{ ...S.section, animation: "fadeInUp 0.5s ease 0.3s both" }}>
          <div style={S.sectionHeader}>
            <span style={S.sectionIcon}>📸</span>
            <h2 style={S.sectionTitle}>Contoh Gambar dalam Dataset</h2>
          </div>
          <p style={{ ...S.paragraph, marginBottom: 20 }}>
            Berikut adalah beberapa contoh gambar beserta deskripsinya yang terdapat dalam galeri ini:
          </p>

          {loadingSamples ? (
            <div style={S.loadingGrid}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={S.skeletonCard}>
                  <div style={S.skeletonImage} />
                  <div style={S.skeletonText} />
                  <div style={{ ...S.skeletonText, width: "60%" }} />
                </div>
              ))}
            </div>
          ) : samples.length > 0 ? (
            <div style={S.sampleGrid}>
              {samples.map((img) => (
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
          ) : (
            <div style={S.emptyState}>
              <span style={{ fontSize: 40 }}>📂</span>
              <p>Belum ada gambar dalam index. Tambahkan gambar melalui halaman Kelola Index.</p>
            </div>
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
const ACCENT = "#3b82f6";

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
    maxWidth: 800,
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
    fontSize: 40,
    fontWeight: 800,
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

  // ── Language Cards ──
  languageCards: {
    display: "grid",
    gridTemplateColumns: "1fr",
    maxWidth: 480,
    gap: 16,
  },
  langCard: {
    background: SURFACE,
    border: `1px solid ${BORDER}`,
    borderRadius: 14,
    padding: 24,
    textAlign: "center",
  },
  langFlag: {
    fontSize: 36,
    marginBottom: 10,
  },
  langTitle: {
    fontSize: 16,
    fontWeight: 600,
    marginBottom: 8,
  },
  langDesc: {
    fontSize: 13,
    color: MUTED,
    lineHeight: 1.6,
    margin: 0,
  },

  // ── Tech Features ──
  techFeatures: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    marginTop: 20,
    paddingTop: 20,
    borderTop: `1px solid ${BORDER}`,
  },
  techFeature: {
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
    padding: "10px 14px",
    background: "rgba(15, 23, 42, 0.5)",
    borderRadius: 10,
  },
  techFeatureIcon: {
    fontSize: 20,
    flexShrink: 0,
    marginTop: 2,
  },
  techFeatureTitle: {
    fontSize: 14,
    color: TEXT,
    display: "block",
    marginBottom: 2,
  },
  techFeatureDesc: {
    fontSize: 13,
    color: MUTED,
    margin: 0,
    lineHeight: 1.4,
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

  // ── Empty State ──
  emptyState: {
    textAlign: "center",
    padding: "48px 24px",
    color: MUTED,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
    background: SURFACE,
    border: `1px solid ${BORDER}`,
    borderRadius: 12,
  },
};
