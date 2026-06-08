"use client";

import { useCallback, useEffect, useState } from "react";
import { useIndexManagement } from "@/hooks/useSearch";
import { resolveImageUrl } from "@/lib/api";

export default function ManagePage() {
  const {
    stats, list, error,
    fetchStats, fetchList, removeImage,
  } = useIndexManagement();

  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchStats();
    fetchList(1, 20);
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus gambar ini dari index?")) return;
    const ok = await removeImage(id);
    if (ok) fetchList(currentPage, 20);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchList(page, 20);
  };

  return (
    <div style={S.page}>
      <style>{`
        /* ── Mobile Responsive for Manage Page ── */
        @media (max-width: 768px) {
          .manage-header {
            padding: 20px 16px 16px !important;
          }
          .manage-layout {
            grid-template-columns: 1fr !important;
            padding: 16px !important;
            gap: 16px !important;
          }
          .manage-image-grid {
            grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)) !important;
          }
          .manage-stat-grid {
            grid-template-columns: 1fr 1fr !important;
          }
          .manage-list-header {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 8px !important;
          }
          .manage-list-card {
            padding: 16px !important;
          }
          .manage-stats-card {
            padding: 16px !important;
          }
          .manage-pagination {
            flex-wrap: wrap !important;
          }
        }

        @media (max-width: 480px) {
          .manage-image-grid {
            grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)) !important;
          }
          .manage-h1 {
            font-size: 20px !important;
          }
        }
        
        .imageItem:hover .imageOverlay {
          opacity: 1 !important;
        }
      `}</style>

      <header className="manage-header" style={S.header}>
        <h1 className="manage-h1" style={S.h1}>Manajemen Index</h1>
        <p style={S.subtitle}>Lihat dan kelola gambar dalam search index</p>
      </header>

      <div className="manage-layout" style={S.layout}>
        {/* ── Left: Stats ── */}
        <div style={S.leftCol}>

          {/* Stats */}
          {stats && (
            <div className="manage-stats-card" style={S.statsCard}>
              <h3 style={S.cardTitle}>Statistik Index</h3>
              <div className="manage-stat-grid" style={S.statGrid}>
                <Stat label="Total Gambar" value={stats.total_images.toLocaleString()} />
                <Stat label="Dimensi" value={`${stats.index_shape[1] ?? "—"}d`} />
                <Stat label="Device" value={stats.device.toUpperCase()} accent />
                <Stat label="Model" value={stats.model_loaded ? "✅ Loaded" : "❌ Error"} />
              </div>
            </div>
          )}

          {error && (
            <div style={S.errorMsg}>⚠️ {error}</div>
          )}
        </div>

        {/* ── Right: Image List ── */}
        <div style={S.rightCol}>
          <div className="manage-list-card" style={S.listCard}>
            <div className="manage-list-header" style={S.listHeader}>
              <h3 style={S.cardTitle}>Gambar dalam Index</h3>
              {list && (
                <span style={S.listMeta}>
                  {list.total} total · halaman {list.page}/{list.total_pages}
                </span>
              )}
            </div>

            {list && list.items.length > 0 ? (
              <>
                <div className="manage-image-grid" style={S.imageGrid}>
                  {list.items.map((item) => (
                    <div key={item.image_id} style={S.imageItem} className="imageItem">
                      <img
                        src={resolveImageUrl(item.url)}
                        style={S.imageThumb}
                        alt=""
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = "none";
                        }}
                      />
                      <div style={S.imageOverlay} className="imageOverlay">
                        <span style={S.imageCaption}>
                          {item.captions_id[0] ?? item.filename ?? item.image_id.slice(0, 8)}
                        </span>
                        <button
                          style={S.deleteBtn}
                          onClick={() => handleDelete(item.image_id)}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {list.total_pages > 1 && (
                  <div className="manage-pagination" style={S.pagination}>
                    <button
                      style={{ ...S.pageBtn, ...(currentPage <= 1 ? S.pageBtnDisabled : {}) }}
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage <= 1}
                    >
                      ←
                    </button>
                    {Array.from({ length: Math.min(list.total_pages, 7) }, (_, i) => i + 1).map((p) => (
                      <button
                        key={p}
                        style={{ ...S.pageBtn, ...(p === currentPage ? S.pageBtnActive : {}) }}
                        onClick={() => handlePageChange(p)}
                      >
                        {p}
                      </button>
                    ))}
                    <button
                      style={{ ...S.pageBtn, ...(currentPage >= list.total_pages ? S.pageBtnDisabled : {}) }}
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage >= list.total_pages}
                    >
                      →
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div style={S.emptyList}>
                <span style={{ fontSize: 40 }}>📂</span>
                <p>Belum ada gambar dalam index</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={S.statItem}>
      <span style={S.statLabel}>{label}</span>
      <span style={{ ...S.statValue, ...(accent ? { color: "#3b82f6" } : {}) }}>{value}</span>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────

const BG = "#0f172a", SURFACE = "#1e293b", BORDER = "#334155";
const TEXT = "#f1f5f9", MUTED = "#94a3b8", ACCENT = "#3b82f6";

const S: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: BG, color: TEXT, fontFamily: "'DM Sans', system-ui, sans-serif", padding: "0 0 60px" },
  header: { padding: "32px 40px 24px", borderBottom: `1px solid ${BORDER}` },
  h1: { fontSize: 24, fontWeight: 700, margin: "0 0 4px" },
  subtitle: { color: MUTED, margin: 0, fontSize: 14 },
  layout: { display: "grid", gridTemplateColumns: "300px 1fr", gap: 24, padding: "28px 40px", alignItems: "start" },
  leftCol: { display: "flex", flexDirection: "column", gap: 20 },
  rightCol: {},
  cardTitle: { fontSize: 14, fontWeight: 600, color: TEXT, margin: "0 0 14px", textTransform: "uppercase", letterSpacing: "0.06em" },
  statsCard: { background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20 },
  statGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  statItem: { background: BG, borderRadius: 8, padding: "10px 14px" },
  statLabel: { display: "block", fontSize: 11, color: MUTED, marginBottom: 4, textTransform: "uppercase" },
  statValue: { fontSize: 18, fontWeight: 700 },
  errorMsg: { marginTop: 10, background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "8px 14px", fontSize: 13, color: "#fca5a5" },
  listCard: { background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 24 },
  listHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  listMeta: { fontSize: 13, color: MUTED },
  imageGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 },
  imageItem: { position: "relative", aspectRatio: "1", borderRadius: 8, overflow: "hidden", background: BG, cursor: "pointer" },
  imageThumb: { width: "100%", height: "100%", objectFit: "cover" },
  imageOverlay: {
    position: "absolute", inset: 0,
    background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 60%)",
    display: "flex", flexDirection: "column", justifyContent: "flex-end",
    padding: 8, opacity: 0,
    transition: "opacity 0.15s",
  },
  imageCaption: { fontSize: 11, color: "#fff", lineHeight: 1.3 },
  deleteBtn: { position: "absolute", top: 6, right: 6, background: "rgba(0,0,0,0.6)", border: "none", borderRadius: 4, padding: "2px 5px", cursor: "pointer", fontSize: 13 },
  emptyList: { textAlign: "center", padding: "48px 24px", color: MUTED, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 },
  pagination: { display: "flex", gap: 6, justifyContent: "center", marginTop: 20 },
  pageBtn: { background: BG, border: `1px solid ${BORDER}`, color: TEXT, borderRadius: 6, padding: "6px 12px", cursor: "pointer", fontSize: 13 },
  pageBtnActive: { background: ACCENT, borderColor: ACCENT },
  pageBtnDisabled: { opacity: 0.4, cursor: "not-allowed" },
};
