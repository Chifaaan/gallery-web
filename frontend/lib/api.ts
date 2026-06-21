/**
 * lib/api.ts
 * Type-safe API client untuk CLIP Indonesia Search API
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

// ─── Types ───────────────────────────────────────────────────

export interface SearchResultItem {
  rank       : number;
  score      : number;
  image_id   : string;
  url        : string;
  captions_id: string[];
  captions_en: string[];
  filename   : string;
}

export interface SearchResponse {
  query_type : "text" | "image" | "multimodal";
  query_text : string | null;
  total      : number;
  results    : SearchResultItem[];
  elapsed_ms : number;
}

export interface IndexStats {
  total_images: number;
  index_shape : number[];
  device      : string;
  model_loaded: boolean;
}

export interface IndexListResponse {
  total      : number;
  page       : number;
  limit      : number;
  total_pages: number;
  items      : Omit<SearchResultItem, "rank" | "score">[];
}

// ─── Helpers ─────────────────────────────────────────────────

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new APIError(res.status, body.detail ?? "Terjadi kesalahan pada server");
  }
  return res.json() as Promise<T>;
}

export class APIError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "APIError";
  }
}

// ─── Search ──────────────────────────────────────────────────

/** Cari gambar berdasarkan teks Bahasa Indonesia */
export async function searchByText(
  query : string,
  top_k : number = 10,
): Promise<SearchResponse> {
  const res = await fetch(`${API_BASE}/search/text`, {
    method : "POST",
    headers: { "Content-Type": "application/json" },
    body   : JSON.stringify({ query, top_k }),
  });
  return handleResponse<SearchResponse>(res);
}

/** Cari gambar serupa berdasarkan gambar query */
export async function searchByImage(
  file : File,
  top_k: number = 10,
): Promise<SearchResponse> {
  const form = new FormData();
  form.append("file", file);
  form.append("top_k", String(top_k));

  const res = await fetch(`${API_BASE}/search/image`, {
    method: "POST",
    body  : form,
  });
  return handleResponse<SearchResponse>(res);
}

/** Pencarian multimodal: teks + gambar */
export async function searchMultimodal(opts: {
  query      : string;
  file       : File;
  text_weight: number;
  top_k      : number;
}): Promise<SearchResponse> {
  const form = new FormData();
  form.append("query"      , opts.query);
  form.append("file"       , opts.file);
  form.append("text_weight", String(opts.text_weight));
  form.append("top_k"      , String(opts.top_k));

  const res = await fetch(`${API_BASE}/search/multimodal`, {
    method: "POST",
    body  : form,
  });
  return handleResponse<SearchResponse>(res);
}

// ─── Index Management ────────────────────────────────────────

/** Statistik index */
export async function getIndexStats(): Promise<IndexStats> {
  const res = await fetch(`${API_BASE}/index/stats`);
  return handleResponse<IndexStats>(res);
}

/** Daftar gambar dalam index (paginated) */
export async function listIndexImages(
  page : number = 1,
  limit: number = 20,
): Promise<IndexListResponse> {
  const res = await fetch(`${API_BASE}/index/list?page=${page}&limit=${limit}`);
  return handleResponse<IndexListResponse>(res);
}

/** Health check */
export async function checkHealth(): Promise<{ status: string }> {
  const res = await fetch(`${API_BASE}/health`);
  return handleResponse<{ status: string }>(res);
}

// ─── URL Helper ──────────────────────────────────────────────

/** Ubah URL relatif dari API menjadi URL absolut */
export function resolveImageUrl(url: string): string {
  if (url.startsWith("http")) return url;
  const base = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace("/api/v1", "");
  return `${base}${url}`;
}
