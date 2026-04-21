/**
 * CatalogClient — Client component for the catalog page.
 * Receives server-fetched data as initial props, then handles client-side interactions.
 */
"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "../Navbar";
import Footer from "../Footer";
import Scanlines from "../Scanlines";
import MovieModal from "../MovieModal";
import Settings from "../Settings";
import WatchlistPanel from "../WatchlistPanel";
import OfflineDetector from "../OfflineDetector";
import ErrorBoundary from "../ErrorBoundary";
import RandomPicker from "../RandomPicker";
import ImageWithFallback from "../ImageWithFallback";
import { useStore } from "@/store/useStore";
import { useDeviceCapability, isDataSaverActive } from "@/hooks/useDeviceCapability";
import {
  GENRE_MAP,
  TV_GENRE_MAP,
  POSTER_SIZES,
  COMBINED_GENRE_MAP,
} from "@/lib/tmdb/client";
import type { MediaItem } from "@/lib/tmdb/types";
import { NuqsAdapter } from "nuqs/adapters/react";

interface CatalogFilters {
  q: string;
  type: string;
  genre: string;
  sort: string;
  yf: string;
  yt: string;
  r: string;
  lang: string;
  page: string;
}

interface CatalogInitialData {
  items: MediaItem[];
  totalPages: number;
  totalResults: number;
  currentPage: number;
  filters: CatalogFilters;
}

const MOVIE_SORT_OPTIONS = [
  { key: "trending", label: "TRENDING" },
  { key: "popular", label: "POPULAR" },
  { key: "top_rated", label: "TOP RATED" },
  { key: "now_playing", label: "NOW PLAYING" },
  { key: "upcoming", label: "UPCOMING" },
];

const TV_SORT_OPTIONS = [
  { key: "trending", label: "TRENDING" },
  { key: "popular", label: "POPULAR" },
  { key: "top_rated", label: "TOP RATED" },
];

const LANGUAGE_OPTIONS = [
  { code: "en", label: "English" },
  { code: "ko", label: "Korean" },
  { code: "ja", label: "Japanese" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "zh", label: "Chinese" },
  { code: "hi", label: "Hindi" },
  { code: "it", label: "Italian" },
  { code: "pt", label: "Portuguese" },
  { code: "ru", label: "Russian" },
  { code: "th", label: "Thai" },
  { code: "tr", label: "Turkish" },
  { code: "pl", label: "Polish" },
  { code: "nl", label: "Dutch" },
  { code: "sv", label: "Swedish" },
  { code: "da", label: "Danish" },
  { code: "id", label: "Indonesian" },
];

// COMBINED_GENRE_MAP imported from @/lib/tmdb/client

export default function CatalogClient({ initialData }: { initialData: CatalogInitialData }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { tier } = useDeviceCapability();
  const { setSelectedMedia, signalLostOpen } = useStore();

  const [items, setItems] = useState(initialData.items);
  const [totalPages, setTotalPages] = useState(initialData.totalPages);
  const [totalResults, setTotalResults] = useState(initialData.totalResults);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [searchInput, setSearchInput] = useState(initialData.filters.q);
  const [dataSaverOn] = useState(() => isDataSaverActive());

  const gridRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isTv = initialData.filters.type === "tv";
  const sortOptions = isTv ? TV_SORT_OPTIONS : MOVIE_SORT_OPTIONS;
  const genreOptions = isTv ? TV_GENRE_MAP : GENRE_MAP;
  const posterSize =
    tier === "high" || tier === "medium"
      ? POSTER_SIZES.w500
      : tier === "low"
      ? POSTER_SIZES.w342
      : POSTER_SIZES.w185;

  // Update URL with new params
  const updateParams = useCallback(
    (updates: Partial<CatalogFilters>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value && value !== "movie" && value !== "trending" && value !== "1") {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      });
      // Always set type and defaults
      if (updates.type) params.set("type", updates.type);
      router.push(`/catalog?${params.toString()}`);
    },
    [router, searchParams]
  );

  // Debounced search
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchInput(value);
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = setTimeout(() => {
        updateParams({ q: value, page: "1" });
      }, 400);
    },
    [updateParams]
  );

  // Page numbers
  const pageNumbers = useMemo(() => {
    const current = initialData.currentPage;
    const total = totalPages;
    const pages: (number | string)[] = [];
    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      pages.push(1);
      if (current > 3) pages.push("...");
      const start = Math.max(2, current - 1);
      const end = Math.min(total - 1, current + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (current < total - 2) pages.push("...");
      pages.push(total);
    }
    return pages;
  }, [initialData.currentPage, totalPages]);

  // Keyboard nav
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const current = initialData.currentPage;
      if (e.key === "ArrowLeft" && current > 1) {
        updateParams({ page: String(current - 1) });
      } else if (e.key === "ArrowRight" && current < totalPages) {
        updateParams({ page: String(current + 1) });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [initialData.currentPage, totalPages, updateParams]);

  // Show start/end for pagination
  const start = (initialData.currentPage - 1) * 20 + 1;
  const end = Math.min(initialData.currentPage * 20, totalResults);

  return (
    <div className="relative min-h-screen bg-[#0A0A0A]">
      <Scanlines />
      <OfflineDetector />
      <Navbar />

      <main className="relative z-10 pt-20" id="catalog-section" ref={gridRef}>
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
          {/* Section Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-2 h-2 bg-[#E4002B]" />
            <h1 className="text-[#E0E0E0] text-xl tracking-[0.3em] font-retro">CATALOG</h1>
            <div className="flex-1 h-px bg-[#1a1a1a]" />
            <span className="text-[#444444] text-[10px] tracking-wider">
              {totalResults.toLocaleString()} RECORDS
            </span>
          </div>

          {/* Controls Bar */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#444444] text-xs">⌕</span>
              <input
                value={searchInput}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search archive..."
                className="w-full pl-8 pr-8 py-2 bg-[#0d0d0d] border border-[#1a1a1a] text-[#B8B8B8] text-xs font-mono tracking-wider outline-none focus:border-[#E4002B]/50 transition-colors"
                id="catalog-search-input"
              />
              {searchInput && (
                <button
                  onClick={() => handleSearchChange("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#444444] hover:text-[#E4002B] text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Type Toggle */}
            <div className="flex border border-[#1a1a1a]">
              <button
                onClick={() => updateParams({ type: "movie", genre: "", sort: "", page: "1" })}
                className={`px-4 py-2 text-[10px] tracking-[0.2em] transition-colors ${
                  !isTv
                    ? "bg-[#E4002B] text-white"
                    : "text-[#444444] hover:text-[#B8B8B8]"
                }`}
              >
                MOVIES
              </button>
              <button
                onClick={() => updateParams({ type: "tv", genre: "", sort: "", page: "1" })}
                className={`px-4 py-2 text-[10px] tracking-[0.2em] transition-colors ${
                  isTv
                    ? "bg-[#E4002B] text-white"
                    : "text-[#444444] hover:text-[#B8B8B8]"
                }`}
              >
                TV SHOWS
              </button>
            </div>

            {/* Filters Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 border text-[10px] tracking-[0.2em] transition-colors ${
                showFilters
                  ? "border-[#E4002B]/50 text-[#E4002B]"
                  : "border-[#1a1a1a] text-[#444444] hover:border-[#E4002B]/30"
              }`}
            >
              FILTERS {showFilters ? "▲" : "▼"}
            </button>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mb-6 p-4 bg-[#0d0d0d] border border-[#1a1a1a] overflow-hidden"
            >
              {/* Sort */}
              <div className="mb-4">
                <div className="text-[9px] text-[#E4002B] tracking-[0.3em] mb-2">SORT BY</div>
                <div className="flex flex-wrap gap-2">
                  {sortOptions.map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => updateParams({ sort: opt.key, page: "1" })}
                      className={`px-3 py-1 text-[10px] tracking-wider border transition-colors ${
                        initialData.filters.sort === opt.key
                          ? "border-[#E4002B]/50 text-[#E4002B] bg-[#E4002B]/10"
                          : "border-[#1a1a1a] text-[#444444] hover:border-[#E4002B]/30"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Genres */}
              <div className="mb-4">
                <div className="text-[9px] text-[#E4002B] tracking-[0.3em] mb-2">GENRE</div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(genreOptions).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => updateParams({ genre: initialData.filters.genre === key ? "" : key, page: "1" })}
                      className={`px-3 py-1 text-[9px] tracking-wider border transition-colors ${
                        initialData.filters.genre === key
                          ? "border-[#E4002B]/50 text-[#E4002B] bg-[#E4002B]/10"
                          : "border-[#1a1a1a] text-[#444444] hover:border-[#E4002B]/30"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Advanced Filters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-[9px] text-[#E4002B] tracking-[0.3em] mb-2">YEAR RANGE</div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="FROM"
                      value={initialData.filters.yf}
                      onChange={(e) => updateParams({ yf: e.target.value, page: "1" })}
                      className="w-full px-2 py-1 bg-[#0a0a0a] border border-[#1a1a1a] text-[10px] text-[#B8B8B8] font-mono outline-none focus:border-[#E4002B]/50"
                      min={1900}
                      max={2030}
                    />
                    <span className="text-[#333333] text-xs">—</span>
                    <input
                      type="number"
                      placeholder="TO"
                      value={initialData.filters.yt}
                      onChange={(e) => updateParams({ yt: e.target.value, page: "1" })}
                      className="w-full px-2 py-1 bg-[#0a0a0a] border border-[#1a1a1a] text-[10px] text-[#B8B8B8] font-mono outline-none focus:border-[#E4002B]/50"
                      min={1900}
                      max={2030}
                    />
                  </div>
                </div>
                <div>
                  <div className="text-[9px] text-[#E4002B] tracking-[0.3em] mb-2">MIN RATING</div>
                  <input
                    type="range"
                    min={0}
                    max={10}
                    step={0.5}
                    value={initialData.filters.r ? parseFloat(initialData.filters.r) : 0}
                    onChange={(e) => updateParams({ r: e.target.value, page: "1" })}
                    className="w-full accent-[#E4002B]"
                  />
                  <div className="text-[10px] text-[#444444] mt-1">
                    {initialData.filters.r ? `≥ ${initialData.filters.r}` : "ANY"}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] text-[#E4002B] tracking-[0.3em] mb-2">LANGUAGE</div>
                  <select
                    value={initialData.filters.lang}
                    onChange={(e) => updateParams({ lang: e.target.value, page: "1" })}
                    className="w-full px-2 py-1 bg-[#0a0a0a] border border-[#1a1a1a] text-[10px] text-[#B8B8B8] font-mono outline-none focus:border-[#E4002B]/50"
                  >
                    <option value="">ALL LANGUAGES</option>
                    {LANGUAGE_OPTIONS.map((l) => (
                      <option key={l.code} value={l.code}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </motion.div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-20">
              <div className="text-[#E4002B] text-sm font-mono mb-4">✕ {error}</div>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 border border-[#E4002B]/50 text-[#E4002B] text-[10px] tracking-wider hover:bg-[#E4002B]/10"
              >
                RETRY CONNECTION
              </button>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {Array.from({ length: 20 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-[2/3] bg-[#1a1a1a] mb-2" />
                  <div className="h-3 bg-[#1a1a1a] w-3/4 mb-1" />
                  <div className="h-2 bg-[#1a1a1a] w-1/2" />
                </div>
              ))}
            </div>
          )}

          {/* Movie Grid */}
          {!loading && !error && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {items.map((item) => (
                  <motion.button
                    key={`${item.id}-${item.mediaType}`}
                    onClick={() => setSelectedMedia(item)}
                    className="text-left group glitch-card"
                    whileHover={{ y: -4 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="relative aspect-[2/3] overflow-hidden bg-[#0d0d0d] mb-2">
                      <ImageWithFallback
                        src={item.posterPath ? `${posterSize}${item.posterPath}` : ""}
                        alt={item.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      {item.rating != null && (
                        <div className="absolute top-1 right-1 px-1.5 py-0.5 bg-black/70 text-[9px] text-[#B8B8B8] font-mono">
                          {Math.round(item.rating * 10)}%
                        </div>
                      )}
                      <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/70 text-[8px] font-mono tracking-wider">
                        {item.mediaType === "tv" ? (
                          <span className="text-[#E4002B]">TV</span>
                        ) : (
                          <span className="text-[#666666]">FILM</span>
                        )}
                      </div>
                    </div>
                    <div className="text-[11px] text-[#B8B8B8] font-mono truncate group-hover:text-white transition-colors">
                      {item.title}
                    </div>
                    <div className="text-[10px] text-[#444444] font-mono">
                      {item.year || "—"}{" "}
                      {item.genres?.[0] ? COMBINED_GENRE_MAP[item.genres[0]] || "" : ""}
                    </div>
                  </motion.button>
                ))}
              </div>

              {/* Empty State */}
              {items.length === 0 && (
                <div className="text-center py-20">
                  <div className="text-[#333333] text-4xl mb-4">∅</div>
                  <div className="text-[#444444] text-xs font-mono tracking-wider mb-4">
                    NO RECORDS FOUND
                  </div>
                  {(initialData.filters.q || initialData.filters.genre) && (
                    <button
                      onClick={() => router.push("/catalog")}
                      className="px-4 py-2 border border-[#1a1a1a] text-[#444444] text-[10px] tracking-wider hover:border-[#E4002B]/30"
                    >
                      CLEAR ALL FILTERS
                    </button>
                  )}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && items.length > 0 && (
                <div className="mt-8 border-t border-[#1a1a1a] pt-6">
                  {/* Progress bar */}
                  <div className="w-full h-[2px] bg-[#1a1a1a] mb-4">
                    <div
                      className="h-full bg-[#E4002B] transition-all"
                      style={{ width: `${(initialData.currentPage / totalPages) * 100}%` }}
                    />
                  </div>

                  {/* Info row */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] text-[#444444] font-mono tracking-wider">
                      SHOWING {start}–{end} OF {totalResults.toLocaleString()} RECORDS
                    </span>
                    <span className="text-[10px] text-[#444444] font-mono tracking-wider">
                      PAGE {initialData.currentPage}/{totalPages}
                    </span>
                  </div>

                  {/* Page buttons */}
                  <div className="flex items-center justify-center gap-1 flex-wrap">
                    <button
                      onClick={() => updateParams({ page: "1" })}
                      disabled={initialData.currentPage === 1}
                      className="px-2 py-1 text-[9px] tracking-wider text-[#444444] border border-[#1a1a1a] hover:border-[#E4002B]/30 disabled:opacity-30"
                    >
                      ⟪
                    </button>
                    <button
                      onClick={() => updateParams({ page: String(initialData.currentPage - 1) })}
                      disabled={initialData.currentPage === 1}
                      className="px-3 py-1 text-[9px] tracking-wider text-[#444444] border border-[#1a1a1a] hover:border-[#E4002B]/30 disabled:opacity-30"
                    >
                      ◀ PREV
                    </button>

                    {pageNumbers.map((p, i) =>
                      typeof p === "string" ? (
                        <span key={`ellipsis-${i}`} className="px-1 text-[#333333] text-xs">
                          ⋯
                        </span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => updateParams({ page: String(p) })}
                          className={`min-w-[28px] px-2 py-1 text-[9px] tracking-wider border transition-colors ${
                            initialData.currentPage === p
                              ? "border-[#E4002B] text-[#E4002B] bg-[#E4002B]/10 shadow-[0_0_8px_rgba(228,0,43,0.2)]"
                              : "border-[#1a1a1a] text-[#444444] hover:border-[#E4002B]/30"
                          }`}
                        >
                          {p}
                        </button>
                      )
                    )}

                    <button
                      onClick={() => updateParams({ page: String(initialData.currentPage + 1) })}
                      disabled={initialData.currentPage === totalPages}
                      className="px-3 py-1 text-[9px] tracking-wider text-[#444444] border border-[#1a1a1a] hover:border-[#E4002B]/30 disabled:opacity-30"
                    >
                      NEXT ▶
                    </button>
                    <button
                      onClick={() => updateParams({ page: String(totalPages) })}
                      disabled={initialData.currentPage === totalPages}
                      className="px-2 py-1 text-[9px] tracking-wider text-[#444444] border border-[#1a1a1a] hover:border-[#E4002B]/30 disabled:opacity-30"
                    >
                      ⟫
                    </button>
                  </div>
                  <div className="text-center mt-2 text-[9px] text-[#333333] tracking-wider">
                    ← → NAVIGATE PAGES
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <Footer />
      </main>

      <MovieModal />
      <Settings />
      <WatchlistPanel />
      {signalLostOpen && <RandomPicker />}
    </div>
  );
}
