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
  searchMultimodal,
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

  // ── Multimodal search ──
  const searchMulti = useCallback(
    async (query: string, file: File, textWeight = 0.5, topK = 10) => {
      setLoading();
      try {
        const res = await searchMultimodal({ query, file, text_weight: textWeight, top_k: topK });
        setState({
          results  : res,
          loading  : false,
          error    : null,
          lastQuery: query,
        });
      } catch (e) {
        setError(e);
      }
    },
    [],
  );

  const clear = useCallback(() =>
    setState({ results: null, loading: false, error: null, lastQuery: null }), []);

  return { ...state, searchText, searchImage, searchMulti, clear };
}


/**
 * hooks/useIndexManagement.ts
 * Custom hook untuk manajemen index gambar
 */
import { addImages, deleteImage, getIndexStats, listIndexImages, IndexStats, IndexListResponse, AddImagesResponse } from "@/lib/api";

interface IndexState {
  stats    : IndexStats | null;
  list     : IndexListResponse | null;
  uploading: boolean;
  error    : string | null;
}

export function useIndexManagement() {
  const [state, setState] = useState<IndexState>({
    stats    : null,
    list     : null,
    uploading: false,
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

  const uploadImages = useCallback(
    async (
      files      : File[],
      captionsId ?: string[][],
      captionsEn ?: string[][],
    ): Promise<AddImagesResponse | null> => {
      setState((s) => ({ ...s, uploading: true, error: null }));
      try {
        const res = await addImages({
          files,
          captions_id: captionsId ?? files.map(() => []),
          captions_en: captionsEn ?? files.map(() => []),
        });
        setState((s) => ({ ...s, uploading: false }));
        await fetchStats();
        return res;
      } catch (e) {
        const msg = e instanceof APIError ? e.message : String(e);
        setState((s) => ({ ...s, uploading: false, error: msg }));
        return null;
      }
    },
    [fetchStats],
  );

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

  return { ...state, fetchStats, fetchList, uploadImages, removeImage };
}
