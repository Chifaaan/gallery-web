/**
 * hooks/useSearch.ts
 * Custom hook untuk semua operasi pencarian gambar
 */

"use client";

import { useCallback, useState } from "react";
import {
  SearchResponse,
  searchByText,
  searchByImage,
  APIError,
} from "@/lib/api";

export type SearchMode = "text" | "image" | "multimodal";

interface SearchState {
  results   : SearchResponse | null;
  loading   : boolean;
  error     : string | null;
  lastQuery : string | null;
}

export function useSearch() {
  const [state, setState] = useState<SearchState>({
    results  : null,
    loading  : false,
    error    : null,
    lastQuery: null,
  });

  const setLoading = () =>
    setState((s) => ({ ...s, loading: true, error: null }));

  const setError = (err: unknown) => {
    const msg =
      err instanceof APIError
        ? `Error ${err.status}: ${err.message}`
        : err instanceof Error
        ? err.message
        : "Terjadi kesalahan tak terduga";
    setState((s) => ({ ...s, loading: false, error: msg }));
  };

  // ── Text search ──
  const searchText = useCallback(async (query: string, topK = 10) => {
    if (!query.trim()) return;
    setLoading();
    try {
      const res = await searchByText(query.trim(), topK);
      setState({ results: res, loading: false, error: null, lastQuery: query });
    } catch (e) {
      setError(e);
    }
  }, []);

  // ── Image search ──
  const searchImage = useCallback(async (file: File, topK = 10) => {
    setLoading();
    try {
      const res = await searchByImage(file, topK);
      setState({
        results  : res,
        loading  : false,
        error    : null,
        lastQuery: `[gambar: ${file.name}]`,
      });
    } catch (e) {
      setError(e);
    }
  }, []);

  const clear = useCallback(() =>
    setState({ results: null, loading: false, error: null, lastQuery: null }), []);

  return { ...state, searchText, searchImage, clear };
}


/**
 * hooks/useIndexManagement.ts
 * Custom hook untuk manajemen index gambar
 */
import { deleteImage, getIndexStats, listIndexImages, IndexStats, IndexListResponse } from "@/lib/api";

interface IndexState {
  stats    : IndexStats | null;
  list     : IndexListResponse | null;
  error    : string | null;
}

export function useIndexManagement() {
  const [state, setState] = useState<IndexState>({
    stats    : null,
    list     : null,
    error    : null,
  });

  const fetchStats = useCallback(async () => {
    try {
      const stats = await getIndexStats();
      setState((s) => ({ ...s, stats }));
    } catch (e) {
      setState((s) => ({ ...s, error: String(e) }));
    }
  }, []);

  const fetchList = useCallback(async (page = 1, limit = 20) => {
    try {
      const list = await listIndexImages(page, limit);
      setState((s) => ({ ...s, list }));
    } catch (e) {
      setState((s) => ({ ...s, error: String(e) }));
    }
  }, []);

  const removeImage = useCallback(
    async (imageId: string): Promise<boolean> => {
      try {
        await deleteImage(imageId);
        await fetchStats();
        return true;
      } catch (e) {
        setState((s) => ({ ...s, error: String(e) }));
        return false;
      }
    },
    [fetchStats],
  );

  return { ...state, fetchStats, fetchList, removeImage };
}
