'use client';
/**
 * ContentRow — Reusable horizontal scroll row for curated content.
 * LoopFlix-styled with scroll arrows and section headers.
 */
import { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  getNowPlayingMovies,
  getUpcomingMovies,
  getTopRatedMovies,
  getPopularMovies,
  getTrendingMovies,
  getPopularTv,
  getTopRatedTv,
  getTrendingTv,
  movieToMediaItem,
  tvToMediaItem,
  POSTER_SIZES,
} from '@/lib/tmdb/client';
import type { MediaItem } from '../lib/tmdb/types';
import { useStore } from '@/store/useStore';
import { useDeviceCapability, type DeviceTier } from '../hooks/useDeviceCapability';

const POSTER_SIZE_MAP: Record<DeviceTier, string> = {
  high: POSTER_SIZES.w500,
  medium: POSTER_SIZES.w342,
  low: POSTER_SIZES.w185,
  ultra_low: POSTER_SIZES.w185,
};

type RowDataSource =
  | 'now_playing'
  | 'upcoming'
  | 'top_rated_movies'
  | 'popular_movies'
  | 'trending_movies'
  | 'top_rated_tv'
  | 'popular_tv'
  | 'trending_tv';

interface ContentRowProps {
  title: string;
  dataSource: RowDataSource;
  icon?: string;
}

export default function ContentRow({ title, dataSource, icon = '◆' }: ContentRowProps) {
  const { setSelectedMedia } = useStore();
  const { tier } = useDeviceCapability();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function fetch() {
      try {
        let results: MediaItem[] = [];
        switch (dataSource) {
          case 'now_playing': {
            const d = await getNowPlayingMovies();
            results = (d.results ?? []).map(movieToMediaItem);
            break;
          }
          case 'upcoming': {
            const d = await getUpcomingMovies();
            results = (d.results ?? []).map(movieToMediaItem);
            break;
          }
          case 'top_rated_movies': {
            const d = await getTopRatedMovies();
            results = (d.results ?? []).map(movieToMediaItem);
            break;
          }
          case 'popular_movies': {
            const d = await getPopularMovies();
            results = (d.results ?? []).map(movieToMediaItem);
            break;
          }
          case 'trending_movies': {
            const d = await getTrendingMovies();
            results = (d.results ?? []).map(movieToMediaItem);
            break;
          }
          case 'top_rated_tv': {
            const d = await getTopRatedTv();
            results = (d.results ?? []).map(tvToMediaItem);
            break;
          }
          case 'popular_tv': {
            const d = await getPopularTv();
            results = (d.results ?? []).map(tvToMediaItem);
            break;
          }
          case 'trending_tv': {
            const d = await getTrendingTv();
            results = (d.results ?? []).map(tvToMediaItem);
            break;
          }
        }
        if (!cancelled) setItems(results);
      } catch (err) {
        console.warn(`[ContentRow] Failed to fetch ${dataSource}:`, err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetch();
    return () => { cancelled = true; };
  }, [dataSource]);

  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 5);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 5);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) el.addEventListener('scroll', checkScroll, { passive: true });
    return () => { if (el) el.removeEventListener('scroll', checkScroll); };
  }, [items]);

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({
      left: dir === 'left' ? -400 : 400,
      behavior: 'smooth',
    });
  };

  const posterSize = POSTER_SIZE_MAP[tier];

  return (
    <section className="relative">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 px-4 md:px-8">
        <span className="text-[#E4002B] text-xs">{icon}</span>
        <h2 className="text-[#E0E0E0] text-sm tracking-[0.3em] font-mono">{title}</h2>
        <div className="flex-1 h-[1px] bg-[#1a1a1a]" />
        <span className="text-[#444444] text-[10px] tracking-[0.2em] font-mono">
          {items.length} RECORDS
        </span>
      </div>

      {/* Scroll container */}
      <div className="relative group/row">
        {/* Left arrow */}
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-0 bottom-0 w-12 z-10 flex items-center justify-center
              bg-gradient-to-r from-[#0A0A0A] to-transparent opacity-0 group-hover/row:opacity-100 transition-opacity"
          >
            <span className="text-[#E4002B] text-lg">◀</span>
          </button>
        )}

        {/* Cards */}
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto scrollbar-hide px-4 md:px-8 pb-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {loading
            ? Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="shrink-0 w-[130px]">
                  <div className="aspect-[3/4] bg-[#111] animate-pulse border border-[#1a1a1a]" />
                </div>
              ))
            : items.map((item, i) => (
                <motion.button
                  key={`${item.id}-${item.mediaType}`}
                  className="shrink-0 w-[130px] text-left group/card"
                  onClick={() => setSelectedMedia(item)}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: tier === 'high' ? i * 0.03 : 0 }}
                  whileHover={tier !== 'ultra_low' ? { y: -4 } : undefined}
                >
                  {/* Poster */}
                  <div className="aspect-[3/4] overflow-hidden border border-[#1a1a1a] relative group-hover/card:border-[#E4002B]/30 transition-colors">
                    {item.posterPath ? (
                      <img
                        src={`${posterSize}${item.posterPath}`}
                        alt={item.title}
                        className="w-full h-full object-cover grayscale-[20%] group-hover/card:grayscale-0 group-hover/card:brightness-110 transition-all duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-[#0d0d0d] flex items-center justify-center">
                        <span className="text-[#333] text-2xl">◆</span>
                      </div>
                    )}
                    {/* Rating */}
                    <div className="absolute top-1.5 right-1.5 bg-black/70 px-1.5 py-0.5 text-[9px] text-[#B8B8B8] font-mono">
                      {Math.round(item.rating * 10)}%
                    </div>
                    {/* Type badge */}
                    <div className="absolute bottom-1.5 left-1.5 text-[8px] font-mono tracking-wider">
                      <span className={item.mediaType === 'tv' ? 'text-[#E4002B]' : 'text-[#555]'}>
                        {item.mediaType === 'tv' ? 'TV' : 'FILM'}
                      </span>
                    </div>
                  </div>
                  {/* Info */}
                  <div className="mt-1.5 space-y-0.5">
                    <p className="text-[10px] text-[#999] font-mono truncate">{item.title}</p>
                    <p className="text-[9px] text-[#444] font-mono">{item.year}</p>
                  </div>
                </motion.button>
              ))}
        </div>

        {/* Right arrow */}
        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-0 bottom-0 w-12 z-10 flex items-center justify-center
              bg-gradient-to-l from-[#0A0A0A] to-transparent opacity-0 group-hover/row:opacity-100 transition-opacity"
          >
            <span className="text-[#E4002B] text-lg">▶</span>
          </button>
        )}
      </div>
    </section>
  );
}
