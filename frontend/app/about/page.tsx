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
      `}</style>

      <main style={S.main}>

        {/* ── SECTION 1: KONTEN GALERI ── */}
        <section style={{ ...S.section, animation: "fadeInUp 0.6s ease forwards" }}>
          <div style={S.textCenter}>
            <h1 style={S.mainTitle}>30.000 Momen Nyata Kehidupan Manusia</h1>
            <p style={S.mainDesc}>
              Galeri ini diisi oleh foto-foto autentik dari platform Flickr, menangkap ribuan aktivitas, interaksi, dan rutinitas sehari-hari manusia dari seluruh dunia.
            </p>
          </div>

          {samplesLoaded && sampleImages.length > 0 && (
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
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── SECTION 2: TEKNOLOGI ── */}
        <section style={{
          padding: "80px 24px",
          maxWidth: "800px",
          margin: "0 auto",
          animation: "fadeInUp 0.6s ease 0.2s both"
        }}>
          <div style={{ textAlign: "center", marginBottom: "60px" }}>
            <h2 style={{
              fontSize: "2.25rem",
              fontWeight: "800",
              color: "#1F2937", /* Charcoal hangat */
              marginBottom: "12px",
              lineHeight: 1.2
            }}>
              Dipahami oleh AI, Bukan Sekadar Dicari Kata Per Kata
            </h2>
            <p style={{ fontSize: "1.1rem", color: "#6B7280", maxWidth: "600px", margin: "0 auto" }}>
              Ikuti perjalanan pencarian Anda dari kata-kata menjadi gambar dalam hitungan milidetik.
            </p>
          </div>

          <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: "0" }}>

            {/* Garis Penghubung Vertikal Utama (Di belakang kartu) */}
            <div style={{
              position: "absolute",
              left: "28px", // Posisi tengah ikon (Ukuran ikon 56px / 2 = 28px)
              top: "28px",
              bottom: "28px",
              width: "2px",
              background: "linear-gradient(to bottom, #E5E7EB, #D1D5DB, #E5E7EB)", // Abu-abu lembut
              zIndex: 0
            }}></div>

            {/* Step 1 */}
            <div style={{ ...S.pipelineStep, position: "relative", zIndex: 1 }}>
              <div style={S.pipelineIconBg}><span style={S.pipelineEmoji}>⌨️</span></div>
              <div style={S.pipelineContent}>
                <h3 style={S.pipelineTitle}>Anda Mengetik</h3>
                <p style={S.pipelineDesc}>Masukkan deskripsi dalam Bahasa Indonesia, misal <strong>"Seorang pria bermain gitar"</strong>.</p>
              </div>
            </div>

            {/* Step 2 */}
            <div style={{ ...S.pipelineStep, position: "relative", zIndex: 1 }}>
              <div style={S.pipelineIconBg}><span style={S.pipelineEmoji}>🧠</span></div>
              <div style={S.pipelineContent}>
                <h3 style={S.pipelineTitle}>AI Memahami</h3>
                <p style={S.pipelineDesc}>Model XLM-RoBERTa <strong>membaca dan memahami konteks</strong> kalimat Anda secara mendalam.</p>
              </div>
            </div>

            {/* Step 3 */}
            <div style={{ ...S.pipelineStep, position: "relative", zIndex: 1 }}>
              <div style={S.pipelineIconBg}><span style={S.pipelineEmoji}>🎯</span></div>
              <div style={S.pipelineContent}>
                <h3 style={S.pipelineTitle}>Sidik Jari Makna</h3>
                <p style={S.pipelineDesc}>Teks Anda diterjemahkan menjadi <strong>representasi makna unik</strong> (seperti koordinat peta), bukan sekadar kata per kata.</p>
              </div>
            </div>

            {/* Step 4 */}
            <div style={{ ...S.pipelineStep, position: "relative", zIndex: 1 }}>
              <div style={S.pipelineIconBg}><span style={S.pipelineEmoji}>🔍</span></div>
              <div style={S.pipelineContent}>
                <h3 style={S.pipelineTitle}>Pencocokan Visual</h3>
                <p style={S.pipelineDesc}>Sistem mencari foto di galeri yang memiliki <strong>"sidik jari makna" paling selaras</strong> dengan teks Anda.</p>
              </div>
            </div>

            {/* Step 5 */}
            <div style={{ ...S.pipelineStep, position: "relative", zIndex: 1 }}>
              <div style={S.pipelineIconBg}><span style={S.pipelineEmoji}>⚡</span></div>
              <div style={S.pipelineContent}>
                <h3 style={S.pipelineTitle}>Hasil Instan</h3>
                <p style={S.pipelineDesc}>Foto yang paling relevan ditemukan dalam hitungan <strong>milidetik!</strong></p>
              </div>
            </div>

          </div>
        </section>

        {/* ── SECTION 3: PANDUAN PENCARIAN ── */}
        <section style={{ ...S.section, animation: "fadeInUp 0.6s ease 0.4s both", paddingBottom: "60px" }}>
          <div style={S.textCenter}>
            <h2 style={{ ...S.mainTitle, fontSize: 32 }}>Tips Mencari yang Tepat</h2>
          </div>

          <div style={S.guideGrid}>
            {/* Card Cocok */}
            <div className="guide-card" style={S.guideCardSuccess}>
              <h3 style={S.guideCardTitleSuccess}>✅ Cocok Dicari</h3>
              <ul style={S.guideList}>
                <li style={S.guideListItem}><strong>Aktivitas manusia</strong> (cth: "orang sedang memasak")</li>
                <li style={S.guideListItem}><strong>Suasana / setting</strong> (cth: "pemandangan kota saat hujan")</li>
                <li style={S.guideListItem}><strong>Obyek umum</strong> (cth: "kucing hitam di atas meja")</li>
              </ul>
            </div>

            {/* Card Kurang Tepat */}
            <div className="guide-card" style={S.guideCardError}>
              <h3 style={S.guideCardTitleError}>❌ Kurang Tepat Dicari</h3>
              <ul style={S.guideList}>
                <li style={S.guideListItem}><strong>Nama orang spesifik</strong> (cth: "Joko Widodo")</li>
                <li style={S.guideListItem}><strong>Landmark spesifik</strong> (cth: "Candi Borobudur")</li>
                <li style={S.guideListItem}><strong>Teks tidak bermakna</strong> (cth: "asdfghjkl")</li>
              </ul>
            </div>
          </div>

          <div style={S.badgeWrapper}>
            <span style={S.idBadge}>
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

    // ── Pipeline (UPDATED: Vertical Timeline) ──
    pipelineContainer: {
      position: "relative",
      display: "flex",
      flexDirection: "column", // Diubah ke vertikal
      gap: 0,
      maxWidth: 800, // Batasi lebar agar mudah dibaca
      margin: "0 auto",
    },
    pipelineStep: {
      display: "flex",
      alignItems: "flex-start", // Ikon dan teks sejajar atas
      gap: "24px",
      marginBottom: "32px",
      position: "relative",
      zIndex: 1, // Di atas garis timeline
    },
    pipelineIconBg: {
      width: 56,
      height: 56,
      minWidth: 56, // Cegah menyusut
      borderRadius: "50%", // Diubah jadi lingkaran
      background: c.surface,
      border: `2px solid ${c.border}`,
      boxShadow: `0 4px 6px -1px ${c.cardShadow}`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
      zIndex: 2, // Pastikan di atas garis timeline
      transition: "all 0.25s ease", // Untuk efek hover ikon
    },
    pipelineEmoji: {
      fontSize: 24, // Sesuaikan ukuran emoji
    },
    pipelineContent: { // BARU: Wrapper untuk kartu teks
      background: c.surface,
      border: `1px solid ${c.borderLight}`,
      borderRadius: 16,
      padding: "20px 24px",
      boxShadow: `0 2px 4px ${c.cardShadow}`,
      width: "100%",
      textAlign: "left", // Teks rata kiri
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
    pipelineConnector: { // Tidak dipakai lagi di JSX, tapi disimpan agar tidak error
      display: "none",
    },
    abstractVisual: { // Posisi untuk SVG embedding di tengah timeline
      position: "relative",
      zIndex: 1,
      height: 80,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      marginLeft: "8px", // Sedikit masuk ke tengah untuk efek menyatu
      marginBottom: "32px", // Sama dengan jarak step
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
