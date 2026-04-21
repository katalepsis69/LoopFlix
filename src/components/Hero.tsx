'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/store/useStore';
import {
  getTrendingMovies,
  getTrendingTv,
  movieToMediaItem,
  tvToMediaItem,
  BACKDROP_SIZES,
  GENRE_MAP,
  TV_GENRE_MAP,
} from '@/lib/tmdb/client';
import type { MediaItem } from '../lib/tmdb/types';
import ImageWithFallback from './ImageWithFallback';
import { useDeviceCapability, type DeviceTier, isDataSaverActive } from '../hooks/useDeviceCapability';

const COMBINED_GENRE_MAP: Record<number, string> = { ...GENRE_MAP, ...TV_GENRE_MAP };

const BACKDROP_TIER_MAP: Record<DeviceTier, string> = {
  high: BACKDROP_SIZES.original,
  medium: BACKDROP_SIZES.w780,
  low: BACKDROP_SIZES.w300,
  ultra_low: BACKDROP_SIZES.w300,
};

const SLIDESHOW_INTERVAL = 5000; // 5 seconds

export default function Hero() {
  const { setSelectedMedia } = useStore();
  const { tier } = useDeviceCapability();
  const [featured, setFeatured] = useState<MediaItem | null>(null);
  const [allFeatured, setAllFeatured] = useState<MediaItem[]>([]);
  const [sideList, setSideList] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [heroError, setHeroError] = useState<string | null>(null);
  const [slideIndex, setSlideIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch data
  useEffect(() => {
    let cancelled = false;
    async function fetchFeatured() {
      try {
        setHeroError(null);
        const [movieData, tvData] = await Promise.all([
          getTrendingMovies().catch(() => null),
          getTrendingTv().catch(() => null),
        ]);

        if (cancelled) return;

        const movieItems: MediaItem[] = movieData
          ? movieData.results.map(movieToMediaItem)
          : [];
        const tvItems: MediaItem[] = tvData
          ? tvData.results.map(tvToMediaItem)
          : [];

        const allItems = [...movieItems, ...tvItems]
          .sort((a, b) => b.popularity - a.popularity);

        if (allItems.length > 0) {
          // Top 8 for slideshow
          const slideshow = allItems.slice(0, 8);
          setAllFeatured(slideshow);
          setFeatured(slideshow[0]);
          setSlideIndex(0);
          setSideList(allItems.filter((_, i) => i >= slideshow.length).slice(0, 6));
          // If not enough for side list, use the rest
          if (allItems.length <= 8) {
            setSideList(allItems.slice(1, 7));
          }
        } else {
          setHeroError('NO FEATURED RECORDS AVAILABLE');
        }
      } catch (err) {
        if (cancelled) return;
        console.error('Failed to fetch featured:', err);
        setHeroError('SIGNAL LOST — UNABLE TO LOAD FEATURED RECORDS');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    fetchFeatured();
    return () => { cancelled = true; };
  }, []);

  // Slideshow timer
  useEffect(() => {
    if (allFeatured.length <= 1 || isPaused) return;

    timerRef.current = setInterval(() => {
      setSlideIndex((prev) => {
        const next = (prev + 1) % allFeatured.length;
        setFeatured(allFeatured[next]);
        return next;
      });
    }, SLIDESHOW_INTERVAL);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [allFeatured, isPaused]);

  const goToSlide = useCallback((index: number) => {
    setSlideIndex(index);
    setFeatured(allFeatured[index]);
  }, [allFeatured]);

  // Loading state
  if (isLoading) {
    return (
      <section className="relative min-h-screen flex items-end pb-20 pt-28 px-4 md:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-[#0d0d0d] animate-pulse" />
        <div className="relative z-10 w-full max-w-7xl mx-auto">
          <div className="h-6 w-40 bg-[#1a1a1a] rounded mb-8 animate-pulse" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
            <div className="lg:col-span-7 space-y-4">
              <div className="h-12 w-3/4 bg-[#1a1a1a] rounded animate-pulse" />
              <div className="h-4 w-1/2 bg-[#1a1a1a] rounded animate-pulse" />
              <div className="h-20 w-full max-w-xl bg-[#1a1a1a] rounded animate-pulse" />
              <div className="h-10 w-40 bg-[#1a1a1a] rounded animate-pulse" />
            </div>
            <div className="lg:col-span-5">
              <div className="border border-[#1a1a1a] bg-[#0d0d0d]/50">
                <div className="px-4 py-3 border-b border-[#1a1a1a] h-10 bg-[#111111] animate-pulse" />
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-[#1a1a1a]">
                    <div className="w-4 h-3 bg-[#1a1a1a] animate-pulse" />
                    <div className="w-8 h-12 bg-[#1a1a1a] animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-[#1a1a1a] rounded w-2/3 animate-pulse" />
                      <div className="h-2 bg-[#1a1a1a] rounded w-1/3 animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Error state
  if (heroError || !featured) {
    return (
      <section className="relative min-h-screen flex items-center justify-center pt-28 px-4 md:px-8">
        <div className="text-center max-w-md">
          <div className="text-[#E4002B] text-6xl mb-6 animate-pulse font-retro">⚠</div>
          <div className="text-[#E4002B] text-2xl tracking-[0.4em] mb-4 font-retro text-glow-red">SIGNAL LOST</div>
          <div className="text-[#444444] text-xs tracking-[0.2em] mb-8">
            {heroError ?? 'FEATURED RECORD UNAVAILABLE'}
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 border border-[#E4002B] text-[#E4002B] text-[10px] tracking-[0.3em] hover:bg-[#E4002B] hover:text-[#0A0A0A] transition-all duration-300"
          >
            RETRY CONNECTION
          </button>
        </div>
      </section>
    );
  }

  const backdropUrl = featured.backdropPath
    ? `${isDataSaverActive() ? BACKDROP_SIZES.w780 : BACKDROP_TIER_MAP[tier]}${featured.backdropPath}`
    : null;

  const genreLabels = featured.genres
    .slice(0, 3)
    .map((id) => COMBINED_GENRE_MAP[id])
    .filter(Boolean);

  return (
    <section
      className="relative min-h-screen flex items-end pb-20 pt-28 px-4 md:px-8 overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Backdrop Image with crossfade */}
      <AnimatePresence mode="wait">
        <motion.div
          key={featured.id}
          className="absolute inset-0"
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
        >
          <ImageWithFallback
            src={backdropUrl}
            alt={featured.title}
            className="w-full h-full object-cover opacity-30"
            fallbackClassName="w-full h-full"
            fallbackText=""
            fallbackIcon=""
          />
        </motion.div>
      </AnimatePresence>
      <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/70 to-[#0A0A0A]/40" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0A]/80 to-transparent" />

      {/* Background Grid Pattern — high tier only */}
      {tier === 'high' && (
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(#E4002B 1px, transparent 1px), linear-gradient(90deg, #E4002B 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
      )}

      {/* Animated Red Glow — high tier only */}
      {tier === 'high' && (
        <motion.div
          className="absolute top-1/4 right-1/4 w-96 h-96 bg-[#E4002B]/5 rounded-full blur-[120px]"
          animate={{
            opacity: [0.3, 0.6, 0.3],
            scale: [1, 1.1, 1],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {/* Content with crossfade */}
      <div className="relative z-10 w-full max-w-7xl mx-auto">
        {/* Section Label */}
        <motion.div
          className="flex items-center gap-3 mb-8"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="w-8 h-px bg-[#E4002B]" />
          <span className="text-[#E4002B] text-xs tracking-[0.4em]">FEATURED RECORD</span>
          <div className="w-8 h-px bg-[#E4002B]" />

          {/* Slideshow indicators */}
          {allFeatured.length > 1 && (
            <div className="flex items-center gap-1.5 ml-4">
              {allFeatured.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goToSlide(i)}
                  className={`w-4 h-1 transition-all duration-300 ${
                    i === slideIndex ? 'bg-[#E4002B] w-6' : 'bg-[#333333] hover:bg-[#666666]'
                  }`}
                />
              ))}
              {isPaused && (
                <span className="text-[8px] text-[#444444] tracking-wider ml-2">PAUSED</span>
              )}
            </div>
          )}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
          {/* Left: Movie Info */}
          <div className="lg:col-span-7">
            <AnimatePresence mode="wait">
              <motion.div
                key={featured.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              >
                {/* Archive Code */}
                <div className="mb-4 text-[10px] text-[#666666] tracking-[0.3em] font-mono">
                  REF::ARC-{String(featured.id).padStart(3, '0')}//SECTOR-{featured.year}
                </div>

                {/* Title */}
                <h1
                  className="glitch-text text-4xl sm:text-6xl lg:text-7xl text-[#E0E0E0] tracking-[0.1em] leading-none mb-6"
                  data-text={featured.title}
                >
                  {featured.title}
                </h1>

                {/* Meta Info */}
                <div className="flex flex-wrap items-center gap-3 mb-6">
                  <span className="text-[#E4002B] text-sm tracking-widest">{featured.year}</span>
                  <span className="text-[#333333]">|</span>
                  <span className="text-[#666666] text-sm tracking-wider">
                    {featured.mediaType === 'tv' ? 'SERIES' : 'FILM'}
                  </span>
                  <span className="text-[#333333]">|</span>
                  <span className="text-[#666666] text-sm tracking-wider">
                    {featured.voteCount.toLocaleString()} VOTES
                  </span>
                  <span className="text-[#333333]">|</span>
                  <span className="px-2 py-0.5 border border-[#333333] text-[#666666] text-[10px] tracking-widest">
                    {featured.mediaType.toUpperCase()}
                  </span>
                </div>

                {/* Genres */}
                <div className="flex gap-2 mb-6">
                  {genreLabels.map((g) => (
                    <span
                      key={g}
                      className="px-3 py-1 border border-[#E4002B]/30 text-[#E4002B] text-[10px] tracking-[0.3em]"
                    >
                      {g}
                    </span>
                  ))}
                </div>

                {/* Synopsis */}
                <p className="text-[#666666] text-sm leading-relaxed max-w-xl mb-8 line-clamp-3">
                  {featured.overview}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Actions — persistent across slides */}
            <motion.div
              className="flex items-center gap-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
            >
              <motion.button
                onClick={() => setSelectedMedia(featured)}
                className="group relative px-8 py-3 border border-[#E4002B] text-[#E4002B] text-xs tracking-[0.3em] overflow-hidden glitch-btn"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="relative z-10 group-hover:text-[#0A0A0A] transition-colors duration-300">
                  ACCESS RECORD
                </span>
                <motion.div
                  className="absolute inset-0 bg-[#E4002B]"
                  initial={{ x: '-100%' }}
                  whileHover={{ x: 0 }}
                  transition={{ duration: 0.3 }}
                />
              </motion.button>

              {/* Rating */}
              <div className="flex items-center gap-2">
                <div className="text-[#E4002B] text-lg font-bold">
                  {featured.rating.toFixed(1)}
                </div>
                <div className="text-[10px] text-[#666666] tracking-widest">
                  RATING
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right: Side list */}
          <div className="lg:col-span-5">
            <div className="border border-[#1a1a1a] bg-[#0d0d0d]/50">
              <div className="px-4 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-[#E4002B] pulse-red" />
                  <span className="text-[10px] text-[#666666] tracking-[0.3em]">
                    TRENDING NOW
                  </span>
                </div>
                <span className="text-[10px] text-[#333333] tracking-[0.2em]">
                  MOVIES + TV
                </span>
              </div>
              <div className="divide-y divide-[#1a1a1a]">
                {sideList.map((item, i) => {
                  const itemGenres = item.genres
                    .slice(0, 2)
                    .map((id) => COMBINED_GENRE_MAP[id])
                    .filter(Boolean);
                  return (
                    <motion.button
                      key={`${item.id}-${item.mediaType}`}
                      onClick={() => setSelectedMedia(item)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#1a1a1a]/50 transition-colors group glitch-flash"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.8 + i * 0.1 }}
                    >
                      <span className="text-[#333333] text-xs font-mono w-4">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <ImageWithFallback
                        src={item.posterPath ? `https://image.tmdb.org/t/p/w92${item.posterPath}` : null}
                        alt={item.title}
                        className="w-8 h-12 object-cover grayscale group-hover:grayscale-0 transition-all duration-300"
                        fallbackClassName="w-8 h-12"
                        fallbackText=""
                        fallbackIcon="◆"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-[#B8B8B8] text-xs tracking-wider truncate group-hover:text-[#E0E0E0] transition-colors">
                          {item.title}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-[#444444]">{item.year}</span>
                          <span className="text-[10px] text-[#E4002B]/50">
                            {item.mediaType === 'tv' ? 'TV' : 'FILM'}
                          </span>
                          {itemGenres.length > 0 && (
                            <span className="text-[10px] text-[#333333] truncate">
                              {itemGenres.join(' / ')}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] text-[#444444] group-hover:text-[#E4002B] transition-colors">
                        {item.rating.toFixed(1)}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom slideshow progress bar */}
      {allFeatured.length > 1 && (
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#1a1a1a]">
          <motion.div
            className="h-full bg-[#E4002B]"
            key={`progress-${slideIndex}`}
            initial={{ width: '0%' }}
            animate={{ width: isPaused ? `${(slideIndex / allFeatured.length) * 100}%` : '100%' }}
            transition={isPaused ? { duration: 0 } : { duration: SLIDESHOW_INTERVAL / 1000, ease: 'linear' }}
          />
        </div>
      )}
    </section>
  );
}
