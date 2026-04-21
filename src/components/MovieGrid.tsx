'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCatalogParams, YEAR_MIN, YEAR_MAX, LANGUAGE_OPTIONS } from '../hooks/useCatalogParams';
import MovieCard from './MovieCard';
import SignalLost from './SignalLost';
import {
  getTrendingMovies,
  getPopularMovies,
  getTopRatedMovies,
  getNowPlayingMovies,
  getUpcomingMovies,
  getTrendingTv,
  getPopularTv,
  getTopRatedTv,
  searchMovies,
  searchTv,
  discoverMovies,
  discoverTv,
  movieToMediaItem,
  tvToMediaItem,
  GENRE_ID_MAP,
  TV_GENRE_ID_MAP,
} from '@/lib/tmdb/client';
import type { MediaItem } from '../lib/tmdb/types';

/** Skeleton loader */
function SkeletonCard({ index }: { index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.03 }}
    >
      <div className="border border-[#1a1a1a] bg-[#111111] overflow-hidden">
        <div className="aspect-[3/4] bg-[#0d0d0d] animate-pulse" />
        <div className="p-3 space-y-2 border-t border-[#1a1a1a]">
          <div className="h-3 bg-[#1a1a1a] rounded w-3/4 animate-pulse" />
          <div className="h-2 bg-[#1a1a1a] rounded w-1/2 animate-pulse" />
          <div className="flex gap-1.5">
            <div className="h-3 bg-[#1a1a1a] rounded w-10 animate-pulse" />
            <div className="h-3 bg-[#1a1a1a] rounded w-10 animate-pulse" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function MovieGrid() {
  const {
    query,
    mediaType,
    genre,
    sort,
    page,
    yearFrom,
    yearTo,
    minRating,
    language,
    sortOptions,
    genreOptions,
    advancedActive,
    searchInput,
    setSearchInput,
    setMediaType,
    setGenre,
    setSort,
    setPage,
    setYearFrom,
    setYearTo,
    setMinRating,
    setLanguage,
    clearAll,
    clearAdvanced,
  } = useCatalogParams();

  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  // Pick the correct genre ID map
  const genreIdMap = mediaType === 'tv' ? TV_GENRE_ID_MAP : GENRE_ID_MAP;

  // ─── Scroll to top on page change ─────────────────────
  useEffect(() => {
    if (page > 1 && gridRef.current) {
      gridRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [page]);

  // ─── Keyboard navigation ──────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowLeft' && page > 1) {
        e.preventDefault();
        setPage(page - 1);
      } else if (e.key === 'ArrowRight' && page < totalPages) {
        e.preventDefault();
        setPage(page + 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [page, totalPages, setPage]);

  // ─── Fetch data ──────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      let items: MediaItem[] = [];
      let totalPagesResult = 1;
      let totalResultsResult = 0;

      // Determine genre ID for server-side filtering
      const genreId = genre !== 'ALL' ? genreIdMap[genre] : undefined;

      // If searching, use search API
      if (query.trim()) {
        if (mediaType === 'movie') {
          const data = await searchMovies(query, page);
          items = data.results.map(movieToMediaItem);
          totalPagesResult = data.total_pages;
          totalResultsResult = data.total_results;
        } else {
          const data = await searchTv(query, page);
          items = data.results.map(tvToMediaItem);
          totalPagesResult = data.total_pages;
          totalResultsResult = data.total_results;
        }
      }
      // If genre is selected or advanced filters active, use discover API
      else if (genreId || yearFrom > YEAR_MIN || yearTo < YEAR_MAX || minRating > 0 || language) {
        const sortBy = sort === 'trending' ? 'popularity.desc' : sort === 'popular' ? 'popularity.desc' : sort === 'top_rated' ? 'vote_average.desc' : sort === 'now_playing' ? 'popularity.desc' : 'release_date.desc';
        if (mediaType === 'movie') {
          const movieParams: Record<string, string | number> = { page, sort_by: sortBy };
          if (genreId) movieParams.with_genres = String(genreId);
          if (yearFrom === yearTo && yearFrom > YEAR_MIN) movieParams.primary_release_year = yearFrom;
          if (minRating > 0) { movieParams.vote_average_gte = minRating; movieParams.vote_count_gte = 200; }
          if (language) movieParams.with_original_language = language;
          const data = await discoverMovies(movieParams);
          items = data.results.map(movieToMediaItem);
          totalPagesResult = data.total_pages;
          totalResultsResult = data.total_results;
        } else {
          const data = await discoverTv({
            page,
            sort_by: sortBy === 'release_date.desc' ? 'popularity.desc' : sortBy,
            ...(genreId ? { with_genres: String(genreId) } : {}),
            ...(yearFrom === yearTo && yearFrom > YEAR_MIN ? { first_air_date_year: yearFrom } : {}),
            ...(minRating > 0 ? { vote_average_gte: minRating, vote_count_gte: 100 } : {}),
            ...(language ? { with_original_language: language } : {}),
          });
          items = data.results.map(tvToMediaItem);
          totalPagesResult = data.total_pages;
          totalResultsResult = data.total_results;
        }
      }
      // Otherwise fetch based on sort
      else {
        if (mediaType === 'movie') {
          let data;
          switch (sort) {
            case 'popular':
              data = await getPopularMovies(page);
              break;
            case 'top_rated':
              data = await getTopRatedMovies(page);
              break;
            case 'now_playing':
              data = await getNowPlayingMovies(page);
              break;
            case 'upcoming':
              data = await getUpcomingMovies(page);
              break;
            default:
              data = await getTrendingMovies(page);
          }
          items = data.results.map(movieToMediaItem);
          totalPagesResult = data.total_pages;
          totalResultsResult = data.total_results;
        } else {
          let data;
          switch (sort) {
            case 'popular':
              data = await getPopularTv(page);
              break;
            case 'top_rated':
              data = await getTopRatedTv(page);
              break;
            default:
              data = await getTrendingTv(page);
          }
          items = data.results.map(tvToMediaItem);
          totalPagesResult = data.total_pages;
          totalResultsResult = data.total_results;
        }
      }

      setMediaItems(items);
      setTotalPages(Math.min(totalPagesResult, 500)); // TMDB caps at 500
      setTotalResults(totalResultsResult);
    } catch (err) {
      console.error('[CATALOG] TMDB fetch error:', err);
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(`SIGNAL LOST — ${msg.toUpperCase()}`);
    } finally {
      setIsLoading(false);
    }
  }, [mediaType, sort, query, genre, page, genreIdMap, yearFrom, yearTo, minRating, language]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Active filters check ────────────────────────────────
  const hasActiveFilters = genre !== 'ALL' || sort !== 'trending' || advancedActive;
  const activeFilterCount = [
    genre !== 'ALL' ? 1 : 0,
    sort !== 'trending' ? 1 : 0,
    advancedActive ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  return (
    <section className="relative px-4 md:px-8 py-16 max-w-7xl mx-auto">
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-2 h-2 bg-[#E4002B]" />
        <h2 className="text-[#E0E0E0] text-xl tracking-[0.3em]">CATALOG</h2>
        <div className="flex-1 h-px bg-[#1a1a1a]" />
        <span className="text-[#666666] text-[10px] tracking-[0.3em]">
          {!isLoading && !error
            ? `${totalResults.toLocaleString()} RECORDS`
            : isLoading
              ? 'SCANNING...'
              : 'ERROR'}
        </span>
      </div>

      {/* ─── TOP BAR: Media Type Toggle + Search + Filter Button ─── */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-2 border border-[#1a1a1a] bg-[#0d0d0d] p-4">
        {/* Media Type Toggle */}
        <div className="flex items-center gap-0 border border-[#222222]">
          {(['movie', 'tv'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setMediaType(type)}
              className={`relative px-6 py-2.5 text-xs tracking-[0.3em] transition-all duration-300 ${
                mediaType === type
                  ? 'text-[#0A0A0A] bg-[#E4002B]'
                  : 'text-[#666666] hover:text-[#B8B8B8] hover:bg-[#1a1a1a]'
              }`}
            >
              {type === 'movie' ? 'MOVIES' : 'TV SHOWS'}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-md w-full">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666666] text-xs">
            {'>'}
          </span>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={`SEARCH ${mediaType === 'movie' ? 'MOVIES' : 'TV SHOWS'}...`}
            className="w-full bg-[#111111] border border-[#222222] text-[#B8B8B8] text-xs tracking-widest px-8 py-2 focus:outline-none focus:border-[#E4002B]/50 placeholder-[#333333] transition-colors"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#444444] hover:text-[#E4002B] text-xs transition-colors"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Toggle Button */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2 text-[10px] tracking-[0.3em] border transition-all duration-300 ${
            showFilters
              ? 'border-[#E4002B] text-[#E4002B] bg-[#E4002B]/10'
              : hasActiveFilters
                ? 'border-[#E4002B]/30 text-[#E4002B]/70 bg-[#E4002B]/5'
                : 'border-[#222222] text-[#666666] hover:border-[#444444] hover:text-[#B8B8B8]'
          }`}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" />
          </svg>
          FILTERS
          {activeFilterCount > 0 && (
            <span className="flex items-center justify-center min-w-[16px] h-4 px-1 bg-[#E4002B] text-[#0A0A0A] text-[9px] font-bold">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* ─── COLLAPSIBLE FILTER PANEL ─── */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="border border-t-0 border-[#1a1a1a] bg-[#0a0a0a]">
              {/* Panel Header */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#1a1a1a]">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-[#E4002B] animate-pulse" />
                  <span className="text-[10px] text-[#555555] tracking-[0.3em]">FILTER PARAMETERS</span>
                </div>
                {hasActiveFilters && (
                  <button
                    onClick={clearAll}
                    className="text-[10px] text-[#444444] tracking-[0.2em] hover:text-[#E4002B] transition-colors"
                  >
                    ✕ CLEAR ALL
                  </button>
                )}
              </div>

              <div className="p-4 space-y-4">
                {/* Sort Row */}
                <div>
                  <div className="flex items-center gap-2 mb-2.5">
                    <span className="text-[#444444] text-[9px] tracking-[0.4em]">SORT BY</span>
                    <div className="flex-1 h-px bg-[#111111]" />
                    <span className="text-[#333333] text-[9px] tracking-[0.2em]">{sortOptions.length} OPTIONS</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {sortOptions.map((s) => (
                      <button
                        key={s.key}
                        onClick={() => setSort(s.key)}
                        className={`text-[10px] tracking-[0.2em] px-3.5 py-1.5 border transition-all duration-200 ${
                          sort === s.key
                            ? 'border-[#E4002B] text-[#E4002B] bg-[#E4002B]/10 shadow-[0_0_6px_rgba(228,0,43,0.15)]'
                            : 'border-[#1a1a1a] text-[#555555] hover:border-[#333333] hover:text-[#888888]'
                        }`}
                      >
                        {sort === s.key && (
                          <span className="mr-1.5">▸</span>
                        )}
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Divider */}
                <div className="h-px bg-[#111111]" />

                {/* Genre Grid */}
                <div>
                  <div className="flex items-center gap-2 mb-2.5">
                    <span className="text-[#444444] text-[9px] tracking-[0.4em]">GENRE</span>
                    <div className="flex-1 h-px bg-[#111111]" />
                    <span className="text-[#333333] text-[9px] tracking-[0.2em]">{genreOptions.length - 1} GENRES</span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-1.5">
                    {genreOptions.map((g) => (
                      <button
                        key={g}
                        onClick={() => setGenre(g)}
                        className={`text-[9px] tracking-[0.15em] px-2 py-1.5 border transition-all duration-200 text-center ${
                          g === 'ALL'
                            ? genre === 'ALL'
                              ? 'border-[#E4002B]/50 text-[#E4002B] bg-[#E4002B]/10'
                              : 'border-[#1a1a1a] text-[#555555] hover:border-[#333333] hover:text-[#888888]'
                            : genre === g
                              ? 'border-[#E4002B] text-[#E4002B] bg-[#E4002B]/10 shadow-[0_0_6px_rgba(228,0,43,0.15)]'
                              : 'border-[#1a1a1a] text-[#555555] hover:border-[#333333] hover:text-[#888888]'
                        }`}
                      >
                        {genre === g && g !== 'ALL' && (
                          <span className="mr-1">▸</span>
                        )}
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ─── Advanced Filters ─── */}
                <div className="h-px bg-[#111111]" />
                <div>
                  <div className="flex items-center gap-2 mb-2.5">
                    <span className="text-[#444444] text-[9px] tracking-[0.4em]">ADVANCED</span>
                    <div className="flex-1 h-px bg-[#111111]" />
                    {advancedActive && (
                      <button
                        onClick={clearAdvanced}
                        className="text-[9px] text-[#444444] tracking-[0.2em] hover:text-[#E4002B] transition-colors"
                      >
                        ✕ RESET
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Year range */}
                    <div>
                      <div className="text-[8px] text-[#333] tracking-[0.3em] mb-1.5">RELEASE YEAR</div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={YEAR_MIN}
                          max={YEAR_MAX}
                          value={yearFrom}
                          onChange={e => setYearFrom(Number(e.target.value))}
                          className="w-full bg-[#111] border border-[#222] text-[#B8B8B8] text-[10px] tracking-wider px-2 py-1.5 focus:outline-none focus:border-[#E4002B]/50"
                          placeholder="FROM"
                        />
                        <span className="text-[#333] text-[10px]">—</span>
                        <input
                          type="number"
                          min={YEAR_MIN}
                          max={YEAR_MAX}
                          value={yearTo}
                          onChange={e => setYearTo(Number(e.target.value))}
                          className="w-full bg-[#111] border border-[#222] text-[#B8B8B8] text-[10px] tracking-wider px-2 py-1.5 focus:outline-none focus:border-[#E4002B]/50"
                          placeholder="TO"
                        />
                      </div>
                    </div>

                    {/* Minimum rating */}
                    <div>
                      <div className="text-[8px] text-[#333] tracking-[0.3em] mb-1.5">MINIMUM RATING</div>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min={0}
                          max={10}
                          step={1}
                          value={minRating}
                          onChange={e => setMinRating(Number(e.target.value))}
                          className="flex-1 accent-[#E4002B] h-1"
                        />
                        <span className="text-[10px] text-[#888] font-mono min-w-[40px] text-right">
                          {minRating > 0 ? `${minRating}+` : 'ANY'}
                        </span>
                      </div>
                    </div>

                    {/* Language */}
                    <div>
                      <div className="text-[8px] text-[#333] tracking-[0.3em] mb-1.5">LANGUAGE</div>
                      <select
                        value={language}
                        onChange={e => setLanguage(e.target.value)}
                        className="w-full bg-[#111] border border-[#222] text-[#B8B8B8] text-[10px] tracking-wider px-2 py-1.5 focus:outline-none focus:border-[#E4002B]/50 appearance-none cursor-pointer"
                      >
                        {LANGUAGE_OPTIONS.map(l => (
                          <option key={l.code} value={l.code}>{l.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Active filters summary */}
                {hasActiveFilters && (
                  <>
                    <div className="h-px bg-[#111111]" />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-[10px] text-[#555555] tracking-widest">
                        <span className="text-[#333333]">ACTIVE:</span>
                        {sort !== 'trending' && (
                          <button
                            onClick={() => setSort('trending')}
                            className="flex items-center gap-1 px-2 py-0.5 border border-[#E4002B]/20 text-[#E4002B]/60 hover:bg-[#E4002B]/10 transition-colors group"
                          >
                            {sortOptions.find((s) => s.key === sort)?.label ?? sort.toUpperCase()}
                            <span className="text-[#E4002B]/30 group-hover:text-[#E4002B]">✕</span>
                          </button>
                        )}
                        {genre !== 'ALL' && (
                          <button
                            onClick={() => setGenre('ALL')}
                            className="flex items-center gap-1 px-2 py-0.5 border border-[#E4002B]/20 text-[#E4002B]/60 hover:bg-[#E4002B]/10 transition-colors group"
                          >
                            {genre}
                            <span className="text-[#E4002B]/30 group-hover:text-[#E4002B]">✕</span>
                          </button>
                        )}
                        {(yearFrom > YEAR_MIN || yearTo < YEAR_MAX) && (
                          <button
                            onClick={clearAdvanced}
                            className="flex items-center gap-1 px-2 py-0.5 border border-[#E4002B]/20 text-[#E4002B]/60 hover:bg-[#E4002B]/10 transition-colors group"
                          >
                            {yearFrom === yearTo ? yearFrom : `${yearFrom}–${yearTo}`}
                            <span className="text-[#E4002B]/30 group-hover:text-[#E4002B]">✕</span>
                          </button>
                        )}
                        {minRating > 0 && (
                          <button
                            onClick={() => setMinRating(0)}
                            className="flex items-center gap-1 px-2 py-0.5 border border-[#E4002B]/20 text-[#E4002B]/60 hover:bg-[#E4002B]/10 transition-colors group"
                          >
                            ★ {minRating}+
                            <span className="text-[#E4002B]/30 group-hover:text-[#E4002B]">✕</span>
                          </button>
                        )}
                        {language && (
                          <button
                            onClick={() => setLanguage('')}
                            className="flex items-center gap-1 px-2 py-0.5 border border-[#E4002B]/20 text-[#E4002B]/60 hover:bg-[#E4002B]/10 transition-colors group"
                          >
                            {LANGUAGE_OPTIONS.find(l => l.code === language)?.label ?? language.toUpperCase()}
                            <span className="text-[#E4002B]/30 group-hover:text-[#E4002B]">✕</span>
                          </button>
                        )}
                      </div>
                      <span className="text-[9px] text-[#333333] tracking-[0.2em]">
                        CLICK TO REMOVE
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid anchor for scroll-to-top */}
      <div ref={gridRef} />

      {/* ─── URL STATE INDICATOR ─── */}
      {(query || page > 1) && !isLoading && (
        <div className="flex items-center justify-between mt-4 mb-2 px-1">
          <div className="flex items-center gap-2 text-[10px] text-[#555555] tracking-widest">
            {query && (
              <span className="flex items-center gap-1.5">
                <span className="text-[#E4002B]/60">▸</span>
                SEARCH: "{query.toUpperCase()}"
              </span>
            )}
            {page > 1 && (
              <span className="flex items-center gap-1.5">
                <span className="text-[#E4002B]/60">▸</span>
                PAGE {page}/{totalPages}
              </span>
            )}
          </div>
          {query && (
            <button
              onClick={() => { setSearchInput(''); }}
              className="text-[10px] text-[#444444] tracking-[0.2em] hover:text-[#E4002B] transition-colors"
            >
              CLEAR SEARCH
            </button>
          )}
        </div>
      )}

      {/* Error State */}
      {error && (
        <SignalLost
          minimal
          message={error}
          code={`ERR_${mediaType.toUpperCase()}_FETCH`}
          onRetry={() => fetchData()}
        />
      )}

      {/* Loading Skeletons */}
      {isLoading && !error && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 mt-4">
          {Array.from({ length: 20 }).map((_, i) => (
            <SkeletonCard key={i} index={i} />
          ))}
        </div>
      )}

      {/* Empty Results State */}
      {!isLoading && !error && mediaItems.length === 0 && (
        <motion.div
          className="text-center py-20 border border-[#1a1a1a] bg-[#0d0d0d]"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="text-[#333333] text-6xl mb-6 font-retro">∅</div>
          <div className="text-[#666666] text-sm tracking-[0.3em] mb-2 font-retro">NO RECORDS FOUND</div>
          <div className="text-[#444444] text-xs tracking-[0.2em] mb-6">
            {query
              ? `SEARCH "${query.toUpperCase()}" RETURNED 0 RESULTS`
              : `NO ${mediaType === 'movie' ? 'MOVIES' : 'TV SHOWS'} MATCH CURRENT FILTERS`
            }
          </div>
          <div className="flex justify-center gap-3">
            {query && (
              <button
                onClick={() => setSearchInput('')}
                className="px-6 py-2 border border-[#E4002B] text-[#E4002B] text-[10px] tracking-[0.3em] hover:bg-[#E4002B] hover:text-[#0A0A0A] transition-all duration-300"
              >
                CLEAR SEARCH
              </button>
            )}
            {hasActiveFilters && (
              <button
                onClick={clearAll}
                className="px-6 py-2 border border-[#333333] text-[#666666] text-[10px] tracking-[0.3em] hover:border-[#E4002B]/50 hover:text-[#E4002B] transition-colors"
              >
                CLEAR FILTERS
              </button>
            )}
          </div>
        </motion.div>
      )}

      {/* Media Grid */}
      {!isLoading && !error && mediaItems.length > 0 && (
        <AnimatePresence mode="wait">
          <motion.div
            key={`${mediaType}-${genre}-${sort}-${query}-${page}`}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 mt-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {mediaItems.map((media, i) => (
              <MovieCard key={`${media.id}-${media.mediaType}`} media={media} index={i} />
            ))}
          </motion.div>
        </AnimatePresence>
      )}

      {/* ─── PAGINATION ─── */}
      {!isLoading && !error && totalPages > 1 && (
        <div className="mt-8 border border-[#1a1a1a] bg-[#0d0d0d]">
          {/* Progress bar */}
          <div className="h-px bg-[#1a1a1a] relative">
            <div
              className="absolute top-0 left-0 h-px bg-[#E4002B] transition-all duration-500"
              style={{ width: `${(page / totalPages) * 100}%` }}
            />
          </div>

          {/* Result count */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-[#1a1a1a]">
            <span className="text-[10px] text-[#444444] tracking-[0.3em]">
              SHOWING {(page - 1) * 20 + 1}–{Math.min(page * 20, totalResults)} OF {totalResults.toLocaleString()} RECORDS
            </span>
            <span className="text-[10px] text-[#333333] tracking-[0.2em]">
              PAGE {page}/{totalPages}
            </span>
          </div>

          {/* Page navigation */}
          <div className="flex items-center justify-center gap-1 p-3 flex-wrap">
            {/* First page */}
            <button
              onClick={() => setPage(1)}
              disabled={page <= 1}
              className={`px-2.5 py-1.5 text-[10px] tracking-[0.2em] border transition-all ${
                page <= 1
                  ? 'border-[#111111] text-[#222222] cursor-not-allowed'
                  : 'border-[#222222] text-[#666666] hover:border-[#E4002B] hover:text-[#E4002B]'
              }`}
              title="First page"
            >
              ⟪
            </button>

            {/* Previous */}
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className={`px-3 py-1.5 text-[10px] tracking-[0.2em] border transition-all ${
                page <= 1
                  ? 'border-[#111111] text-[#222222] cursor-not-allowed'
                  : 'border-[#222222] text-[#666666] hover:border-[#E4002B] hover:text-[#E4002B]'
              }`}
            >
              ◀ PREV
            </button>

            {/* Page numbers */}
            {(() => {
              const pages: (number | 'ellipsis-start' | 'ellipsis-end')[] = [];
              const maxVisible = 5;

              if (totalPages <= maxVisible + 2) {
                for (let i = 1; i <= totalPages; i++) pages.push(i);
              } else {
                pages.push(1);
                let start = Math.max(2, page - Math.floor(maxVisible / 2));
                const end = Math.min(totalPages - 1, start + maxVisible - 1);
                if (end - start + 1 < maxVisible) {
                  start = Math.max(2, end - maxVisible + 1);
                }
                if (start > 2) pages.push('ellipsis-start');
                for (let i = start; i <= end; i++) pages.push(i);
                if (end < totalPages - 1) pages.push('ellipsis-end');
                pages.push(totalPages);
              }

              return pages.map((p, i) => {
                if (p === 'ellipsis-start' || p === 'ellipsis-end') {
                  return (
                    <span key={`ellipsis-${i}`} className="text-[#333333] text-[10px] px-1 select-none">
                      ⋯
                    </span>
                  );
                }
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`min-w-[2rem] h-8 text-[10px] tracking-wider border transition-all ${
                      p === page
                        ? 'border-[#E4002B] text-[#E4002B] bg-[#E4002B]/10 shadow-[0_0_8px_rgba(228,0,43,0.2)]'
                        : 'border-[#1a1a1a] text-[#555555] hover:border-[#333333] hover:text-[#888888]'
                    }`}
                  >
                    {p}
                  </button>
                );
              });
            })()}

            {/* Next */}
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className={`px-3 py-1.5 text-[10px] tracking-[0.2em] border transition-all ${
                page >= totalPages
                  ? 'border-[#111111] text-[#222222] cursor-not-allowed'
                  : 'border-[#222222] text-[#666666] hover:border-[#E4002B] hover:text-[#E4002B]'
              }`}
            >
              NEXT ▶
            </button>

            {/* Last page */}
            <button
              onClick={() => setPage(totalPages)}
              disabled={page >= totalPages}
              className={`px-2.5 py-1.5 text-[10px] tracking-[0.2em] border transition-all ${
                page >= totalPages
                  ? 'border-[#111111] text-[#222222] cursor-not-allowed'
                  : 'border-[#222222] text-[#666666] hover:border-[#E4002B] hover:text-[#E4002B]'
              }`}
              title="Last page"
            >
              ⟫
            </button>
          </div>

          {/* Keyboard hint */}
          <div className="flex items-center justify-center gap-4 pb-2">
            <span className="text-[9px] text-[#2a2a2a] tracking-[0.3em] flex items-center gap-1">
              <kbd className="px-1 py-0.5 border border-[#1a1a1a] text-[#333333] text-[8px]">←</kbd>
              <kbd className="px-1 py-0.5 border border-[#1a1a1a] text-[#333333] text-[8px]">→</kbd>
              NAVIGATE PAGES
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
