"use client";

import { useEffect, useState } from "react";
import { useTheme, type ThemeColors } from "@/app/ThemeContext";
import { resolveImageUrl, listIndexImages } from "@/lib/api";

// ─── Types ───────────────────────────────────────────────────

interface SampleImage {
  image_id: string;
  url: string;
  captions_id: string[];
  filename: string;
}

// ─── Main Page ───────────────────────────────────────────────

export default function AboutPage() {
  const { colors } = useTheme();
  const [sampleImages, setSampleImages] = useState<SampleImage[]>([]);
  const [samplesLoaded, setSamplesLoaded] = useState(false);

  // Fetch 12 images for the Masonry Grid
  useEffect(() => {
    let cancelled = false;
    async function fetchSamples() {
      try {
        const data = await listIndexImages(1, 12);
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
    return () => {
      cancelled = true;
    };
  }, []);

  const S = buildStyles(colors);

  return (
    <div style={S.page}>
      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes staggerFadeIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        
        .masonry-img-warm { transition: all 0.3s ease; }
        .masonry-img-warm:hover { transform: scale(1.02); box-shadow: 0 8px 28px ${colors.cardShadow}; }
        
        .pipeline-card { transition: all 0.25s ease; }
        .pipeline-card:hover { transform: translateY(-4px); box-shadow: 0 12px 24px ${colors.cardShadow}; border-color: ${colors.accentBorder} !important; }
        
        .guide-card { transition: all 0.25s ease; }
        .guide-card:hover { transform: translateY(-3px); box-shadow: 0 8px 24px ${colors.cardShadow}; }

        /* ── Mobile Responsive ── */
        @media (max-width: 768px) {
          .about-main {
            padding: 24px 14px !important;
          }
          .about-main-title {
            font-size: 26px !important;
          }
          .about-main-desc {
            font-size: 15px !important;
          }
          .about-masonry-grid {
            column-count: 2 !important;
            column-gap: 10px !important;
            padding: 4px !important;
          }
          .about-tech-section {
            padding: 40px 16px !important;
          }
          .about-tech-title {
            font-size: 1.5rem !important;
          }
          .about-tech-desc {
            font-size: 0.95rem !important;
          }
          .about-pipeline-step {
            gap: 16px !important;
            margin-bottom: 24px !important;
          }
          .about-pipeline-icon {
            width: 44px !important;
            height: 44px !important;
            min-width: 44px !important;
          }
          .about-pipeline-emoji {
            font-size: 20px !important;
          }
          .about-pipeline-content {
            padding: 16px !important;
          }
          .about-pipeline-title {
            font-size: 16px !important;
          }
          .about-pipeline-desc {
            font-size: 14px !important;
          }
          .about-timeline-line {
            left: 22px !important;
            top: 22px !important;
            bottom: 22px !important;
          }
          .about-guide-grid {
            grid-template-columns: 1fr !important;
          }
          .about-guide-card {
            padding: 24px !important;
          }
          .about-guide-card-title {
            font-size: 17px !important;
          }
          .about-guide-list-item {
            font-size: 14px !important;
          }
          .about-section {
            margin-bottom: 48px !important;
          }
          .about-text-center {
            margin-bottom: 24px !important;
          }
          .about-id-badge {
            padding: 8px 16px !important;
            font-size: 13px !important;
          }
        }

        @media (max-width: 480px) {
          .about-main-title {
            font-size: 22px !important;
          }
          .about-masonry-grid {
            column-count: 2 !important;
          }
          .about-tech-title {
            font-size: 1.25rem !important;
          }
        }
      `}</style>

      <main className="about-main" style={S.main}>

        {/* ── SECTION 1: KONTEN GALERI ── */}
        <section className="about-section" style={{ ...S.section, animation: "fadeInUp 0.6s ease forwards" }}>
          <div className="about-text-center" style={S.textCenter}>
            <h1 className="about-main-title" style={S.mainTitle}>30.000 Momen Nyata Kehidupan Manusia</h1>
            <p className="about-main-desc" style={S.mainDesc}>
              Galeri ini diisi oleh foto-foto autentik dari platform Flickr, menangkap ribuan aktivitas, interaksi, dan rutinitas sehari-hari manusia dari seluruh dunia.
            </p>
          </div>

          {samplesLoaded && sampleImages.length > 0 && (
            <div className="about-masonry-grid" style={S.masonryGrid}>
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
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── SECTION 2: TEKNOLOGI ── */}
        <section className="about-tech-section" style={{
          padding: "80px 24px",
          maxWidth: "800px",
          margin: "0 auto",
          animation: "fadeInUp 0.6s ease 0.2s both"
        }}>
          <div style={{ textAlign: "center", marginBottom: "60px" }}>
            <h2 className="about-tech-title" style={{
              fontSize: "2.25rem",
              fontWeight: "800",
              color: colors.text,
              marginBottom: "12px",
              lineHeight: 1.2
            }}>
              Dipahami oleh AI, Bukan Sekadar Dicari Kata Per Kata
            </h2>
            <p className="about-tech-desc" style={{ fontSize: "1.1rem", color: colors.muted, maxWidth: "600px", margin: "0 auto" }}>
              Ikuti perjalanan pencarian Anda dari kata-kata menjadi gambar dalam hitungan milidetik.
            </p>
          </div>

          <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: "0" }}>

            {/* Garis Penghubung Vertikal Utama (Di belakang kartu) */}
            <div className="about-timeline-line" style={{
              position: "absolute",
              left: "28px",
              top: "28px",
              bottom: "28px",
              width: "2px",
              background: `linear-gradient(to bottom, ${colors.border}, ${colors.borderLight}, ${colors.border})`,
              zIndex: 0
            }}></div>

            {/* Step 1 */}
            <div className="about-pipeline-step" style={{ ...S.pipelineStep, position: "relative", zIndex: 1 }}>
              <div className="about-pipeline-icon" style={S.pipelineIconBg}><span className="about-pipeline-emoji" style={S.pipelineEmoji}>⌨️</span></div>
              <div className="about-pipeline-content" style={S.pipelineContent}>
                <h3 className="about-pipeline-title" style={S.pipelineTitle}>Anda Mengetik</h3>
                <p className="about-pipeline-desc" style={S.pipelineDesc}>Masukkan deskripsi dalam Bahasa Indonesia, misal <strong>"Seorang pria bermain gitar"</strong>.</p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="about-pipeline-step" style={{ ...S.pipelineStep, position: "relative", zIndex: 1 }}>
              <div className="about-pipeline-icon" style={S.pipelineIconBg}><span className="about-pipeline-emoji" style={S.pipelineEmoji}>🧠</span></div>
              <div className="about-pipeline-content" style={S.pipelineContent}>
                <h3 className="about-pipeline-title" style={S.pipelineTitle}>AI Memahami</h3>
                <p className="about-pipeline-desc" style={S.pipelineDesc}>Model CLIP vanilla yang di-fine-tune <strong>membaca dan memahami konteks</strong> kalimat Anda secara mendalam.</p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="about-pipeline-step" style={{ ...S.pipelineStep, position: "relative", zIndex: 1 }}>
              <div className="about-pipeline-icon" style={S.pipelineIconBg}><span className="about-pipeline-emoji" style={S.pipelineEmoji}>🎯</span></div>
              <div className="about-pipeline-content" style={S.pipelineContent}>
                <h3 className="about-pipeline-title" style={S.pipelineTitle}>Sidik Jari Makna</h3>
                <p className="about-pipeline-desc" style={S.pipelineDesc}>Teks Anda diterjemahkan menjadi <strong>representasi makna unik</strong> (seperti koordinat peta), bukan sekadar kata per kata.</p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="about-pipeline-step" style={{ ...S.pipelineStep, position: "relative", zIndex: 1 }}>
              <div className="about-pipeline-icon" style={S.pipelineIconBg}><span className="about-pipeline-emoji" style={S.pipelineEmoji}>🔍</span></div>
              <div className="about-pipeline-content" style={S.pipelineContent}>
                <h3 className="about-pipeline-title" style={S.pipelineTitle}>Pencocokan Visual</h3>
                <p className="about-pipeline-desc" style={S.pipelineDesc}>Sistem mencari foto di galeri yang memiliki <strong>"sidik jari makna" paling selaras</strong> dengan teks Anda.</p>
              </div>
            </div>

            {/* Step 5 */}
            <div className="about-pipeline-step" style={{ ...S.pipelineStep, position: "relative", zIndex: 1 }}>
              <div className="about-pipeline-icon" style={S.pipelineIconBg}><span className="about-pipeline-emoji" style={S.pipelineEmoji}>⚡</span></div>
              <div className="about-pipeline-content" style={S.pipelineContent}>
                <h3 className="about-pipeline-title" style={S.pipelineTitle}>Hasil Instan</h3>
                <p className="about-pipeline-desc" style={S.pipelineDesc}>Foto yang paling relevan ditemukan dalam hitungan <strong>milidetik!</strong></p>
              </div>
            </div>

          </div>
        </section>

        {/* ── SECTION 3: PANDUAN PENCARIAN ── */}
        <section className="about-section" style={{ ...S.section, animation: "fadeInUp 0.6s ease 0.4s both", paddingBottom: "60px" }}>
          <div className="about-text-center" style={S.textCenter}>
            <h2 className="about-main-title" style={{ ...S.mainTitle, fontSize: 32 }}>Tips Mencari yang Tepat</h2>
          </div>

          <div className="about-guide-grid" style={S.guideGrid}>
            {/* Card Cocok */}
            <div className="guide-card about-guide-card" style={S.guideCardSuccess}>
              <h3 className="about-guide-card-title" style={S.guideCardTitleSuccess}>✅ Cocok Dicari</h3>
              <ul style={S.guideList}>
                <li className="about-guide-list-item" style={S.guideListItem}><strong>Aktivitas manusia</strong> (cth: "orang sedang memasak")</li>
                <li className="about-guide-list-item" style={S.guideListItem}><strong>Suasana / setting</strong> (cth: "pemandangan kota saat hujan")</li>
                <li className="about-guide-list-item" style={S.guideListItem}><strong>Obyek umum</strong> (cth: "kucing hitam di atas meja")</li>
              </ul>
            </div>

            {/* Card Kurang Tepat */}
            <div className="guide-card about-guide-card" style={S.guideCardError}>
              <h3 className="about-guide-card-title" style={S.guideCardTitleError}>❌ Kurang Tepat Dicari</h3>
              <ul style={S.guideList}>
                <li className="about-guide-list-item" style={S.guideListItem}><strong>Nama orang spesifik</strong> (cth: "Joko Widodo")</li>
                <li className="about-guide-list-item" style={S.guideListItem}><strong>Landmark spesifik</strong> (cth: "Candi Borobudur")</li>
                <li className="about-guide-list-item" style={S.guideListItem}><strong>Teks tidak bermakna</strong> (cth: "asdfghjkl")</li>
              </ul>
            </div>
          </div>

          <div style={S.badgeWrapper}>
            <span className="about-id-badge" style={S.idBadge}>
              🇮🇩 Dioptimalkan untuk Pencarian Bahasa Indonesia
            </span>
          </div>
        </section>

      </main>
    </div>
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
      padding: "48px 24px",
    },
    section: {
      marginBottom: 80,
    },
    textCenter: {
      textAlign: "center",
      maxWidth: 800,
      margin: "0 auto 40px auto",
    },
    mainTitle: {
      fontSize: 40,
      fontWeight: 900,
      letterSpacing: "-0.5px",
      marginBottom: 16,
      backgroundImage: `linear-gradient(135deg, ${c.text} 0%, ${c.accent} 100%)`,
      backgroundClip: "text",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      color: "transparent",
      lineHeight: 1.15,
    },
    mainDesc: {
      fontSize: 18,
      color: c.muted,
      lineHeight: 1.6,
      margin: 0,
    },

    // ── Masonry Grid ──
    masonryGrid: {
      columnCount: 4,
      columnGap: "16px",
      padding: "10px",
    },
    masonryItem: {
      breakInside: "avoid",
      marginBottom: 16,
      borderRadius: 16,
      overflow: "hidden",
      border: `1px solid ${c.borderLight}`,
      background: c.surface,
    },
    masonryImage: {
      width: "100%",
      display: "block",
    },

    // ── Pipeline (Vertical Timeline) ──
    pipelineContainer: {
      position: "relative",
      display: "flex",
      flexDirection: "column",
      gap: 0,
      maxWidth: 800,
      margin: "0 auto",
    },
    pipelineStep: {
      display: "flex",
      alignItems: "flex-start",
      gap: "24px",
      marginBottom: "32px",
      position: "relative",
      zIndex: 1,
    },
    pipelineIconBg: {
      width: 56,
      height: 56,
      minWidth: 56,
      borderRadius: "50%",
      background: c.surface,
      border: `2px solid ${c.border}`,
      boxShadow: `0 4px 6px -1px ${c.cardShadow}`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
      zIndex: 2,
      transition: "all 0.25s ease",
    },
    pipelineEmoji: {
      fontSize: 24,
    },
    pipelineContent: {
      background: c.surface,
      border: `1px solid ${c.borderLight}`,
      borderRadius: 16,
      padding: "20px 24px",
      boxShadow: `0 2px 4px ${c.cardShadow}`,
      width: "100%",
      textAlign: "left",
    },
    pipelineTitle: {
      fontSize: 18,
      fontWeight: 700,
      color: c.text,
      marginBottom: 8,
      lineHeight: 1.4,
    },
    pipelineDesc: {
      fontSize: 15,
      color: c.muted,
      lineHeight: 1.6,
      margin: 0,
    },
    pipelineConnector: {
      display: "none",
    },
    abstractVisual: {
      position: "relative",
      zIndex: 1,
      height: 80,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      marginLeft: "8px",
      marginBottom: "32px",
    },

    // ── Guide Cards ──
    guideGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
      gap: 24,
      maxWidth: 900,
      margin: "0 auto",
    },
    guideCardSuccess: {
      background: c.successBg,
      border: `1px solid ${c.successBorder}`,
      borderRadius: 16,
      padding: "32px",
    },
    guideCardTitleSuccess: {
      fontSize: 20,
      fontWeight: 700,
      color: c.successText,
      marginBottom: 20,
      display: "flex",
      alignItems: "center",
      gap: 8,
    },
    guideCardError: {
      background: c.errorBg,
      border: `1px solid ${c.errorBorder}`,
      borderRadius: 16,
      padding: "32px",
    },
    guideCardTitleError: {
      fontSize: 20,
      fontWeight: 700,
      color: c.errorText,
      marginBottom: 20,
      display: "flex",
      alignItems: "center",
      gap: 8,
    },
    guideList: {
      listStyleType: "disc",
      paddingLeft: 24,
      margin: 0,
    },
    guideListItem: {
      fontSize: 16,
      color: c.textSecondary,
      marginBottom: 12,
      lineHeight: 1.5,
    },
    badgeWrapper: {
      display: "flex",
      justifyContent: "center",
      marginTop: 40,
    },
    idBadge: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      background: c.surface,
      border: `1px solid ${c.border}`,
      borderRadius: 24,
      padding: "10px 24px",
      fontSize: 14,
      fontWeight: 600,
      color: c.text,
      boxShadow: `0 4px 12px ${c.cardShadow}`,
    },
  };
}
