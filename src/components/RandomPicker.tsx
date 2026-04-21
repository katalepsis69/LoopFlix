'use client';
/**
 * RandomPicker — "SIGNAL LOST" roulette feature.
 * Fixed overlay modal that picks a random movie or TV show from TMDB.
 */
import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/store/useStore';
import {
  discoverMovies,
  discoverTv,
  movieToMediaItem,
  tvToMediaItem,
  POSTER_SIZES,
} from '@/lib/tmdb/client';
import type { MediaItem } from '../lib/tmdb/types';

const GENRES = [
  { label: 'ANY', movieId: undefined, tvId: undefined },
  { label: 'HORROR', movieId: 27, tvId: undefined },
  { label: 'SCI-FI', movieId: 878, tvId: undefined },
  { label: 'ACTION', movieId: 28, tvId: 10759 },
  { label: 'THRILLER', movieId: 53, tvId: undefined },
  { label: 'MYSTERY', movieId: 9648, tvId: 9648 },
  { label: 'ANIMATION', movieId: 16, tvId: 16 },
  { label: 'COMEDY', movieId: 35, tvId: 35 },
  { label: 'DRAMA', movieId: 18, tvId: 18 },
  { label: 'FANTASY', movieId: 14, tvId: undefined },
];

export default function RandomPicker() {
  const { setSelectedMedia } = useStore();
  const setSignalLostOpen = useStore((s) => s.setSignalLostOpen);
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState(0);
  const [flashTitles, setFlashTitles] = useState<string[]>([]);
  const [result, setResult] = useState<MediaItem | null>(null);
  const [phase, setPhase] = useState<'idle' | 'scanning' | 'found'>('idle');

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSignalLostOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setSignalLostOpen]);

  const pick = useCallback(async () => {
    if (isSpinning) return;
    setIsSpinning(true);
    setResult(null);
    setPhase('scanning');
    setFlashTitles([]);

    try {
      const genre = GENRES[selectedGenre];
      const isMovie = Math.random() > 0.3;
      const maxPage = 50;
      const randomPage = Math.floor(Math.random() * maxPage) + 1;

      let items: MediaItem[] = [];
      if (isMovie) {
        const params: any = {
          page: randomPage,
          sort_by: 'popularity.desc',
          'vote_count.gte': 100,
        };
        if (genre.movieId) params.with_genres = String(genre.movieId);
        const data = await discoverMovies(params);
        items = (data.results ?? []).map(movieToMediaItem);
      } else {
        const params: any = {
          page: randomPage,
          sort_by: 'popularity.desc',
          'vote_count.gte': 50,
        };
        if (genre.tvId) params.with_genres = String(genre.tvId);
        const data = await discoverTv(params);
        items = (data.results ?? []).map(tvToMediaItem);
      }

      if (items.length === 0) {
        if (isMovie) {
          const data = await discoverMovies({ page: 1, sort_by: 'popularity.desc' });
          items = (data.results ?? []).map(movieToMediaItem);
        } else {
          const data = await discoverTv({ page: 1, sort_by: 'popularity.desc' });
          items = (data.results ?? []).map(tvToMediaItem);
        }
      }

      if (items.length === 0) {
        setPhase('idle');
        return;
      }

      // Flash random titles
      const shuffled = [...items].sort(() => Math.random() - 0.5);
      const titles = shuffled.slice(0, 8).map((m) => m.title);
      setFlashTitles(titles);

      // Wait for flashing animation
      await new Promise((r) => setTimeout(r, 2000));

      // Pick final result
      const finalItem = items[Math.floor(Math.random() * items.length)];
      setResult(finalItem);
      setPhase('found');
    } catch {
      setPhase('idle');
    } finally {
      setIsSpinning(false);
    }
  }, [isSpinning, selectedGenre]);

  const openResult = () => {
    if (result) {
      setSelectedMedia(result);
      setSignalLostOpen(false);
    }
  };

  const reset = () => {
    setResult(null);
    setPhase('idle');
    setFlashTitles([]);
  };

  const close = () => {
    setSignalLostOpen(false);
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[70] bg-[#0A0A0A]/98 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        onClick={(e) => { if (e.target === e.currentTarget) close(); }}
      >
        {/* Scanline sweep overlay */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div
            className="w-full h-[2px] bg-[#E4002B]/20"
            animate={{ y: ['-100vh', '100vh'] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          />
        </div>

        {/* Corner decorations */}
        <div className="absolute top-8 left-8 w-10 h-10 border-t-2 border-l-2 border-[#E4002B]/20" />
        <div className="absolute top-8 right-8 w-10 h-10 border-t-2 border-r-2 border-[#E4002B]/20" />
        <div className="absolute bottom-8 left-8 w-10 h-10 border-b-2 border-l-2 border-[#E4002B]/20" />
        <div className="absolute bottom-8 right-8 w-10 h-10 border-b-2 border-r-2 border-[#E4002B]/20" />

        {/* Close button */}
        <button
          onClick={close}
          className="absolute top-6 right-6 text-[#444] text-sm tracking-[0.2em] font-mono hover:text-[#E4002B] transition-colors z-10"
        >
          CLOSE ✕
        </button>

        <div className="relative z-10 w-full max-w-xl">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-2 h-2 bg-[#E4002B] animate-pulse" />
            <h2 className="text-[#E0E0E0] text-xl tracking-[0.3em] font-retro">◈ SIGNAL LOST</h2>
            <div className="flex-1 h-[1px] bg-[#1a1a1a]" />
            <span className="text-[#444444] text-[10px] tracking-[0.2em] font-mono">RANDOM ACCESS</span>
          </div>

          {/* Main container */}
          <div className="border border-[#1a1a1a] bg-[#0d0d0d] overflow-hidden">
            {/* Terminal header */}
            <div className="flex items-center gap-2 px-4 py-2 bg-[#080808] border-b border-[#1a1a1a]">
              <div className="w-2 h-2 bg-[#E4002B]/60" />
              <div className="w-2 h-2 bg-[#333]" />
              <div className="w-2 h-2 bg-[#333]" />
              <span className="ml-2 text-[10px] text-[#333] tracking-[0.3em] font-mono">
                RANDOM SIGNAL DETECTOR — MODULE v2.1
              </span>
            </div>

            <div className="p-6 md:p-8">
              {/* Genre selector */}
              <div className="mb-6">
                <div className="text-[10px] text-[#444] tracking-[0.3em] font-mono mb-3">
                  SIGNAL FREQUENCY // GENRE FILTER
                </div>
                <div className="flex flex-wrap gap-2">
                  {GENRES.map((g, i) => (
                    <button
                      key={g.label}
                      onClick={() => !isSpinning && setSelectedGenre(i)}
                      className={`px-3 py-1.5 text-[10px] tracking-[0.2em] font-mono transition-all duration-200 glitch-btn ${
                        selectedGenre === i
                          ? 'bg-[#E4002B] text-white border border-[#E4002B]'
                          : 'text-[#555] border border-[#1a1a1a] hover:border-[#E4002B]/30 hover:text-[#888]'
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action area */}
              <div className="min-h-[200px] flex items-center justify-center">
                <AnimatePresence mode="wait">
                  {phase === 'idle' && (
                    <motion.div
                      key="idle"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-center"
                    >
                      <div className="text-[#333] text-4xl mb-4 animate-pulse">◈</div>
                      <div className="text-[10px] text-[#444] tracking-[0.3em] font-mono mb-6">
                        AWAITING SCAN INITIALIZATION
                      </div>
                      <button
                        onClick={pick}
                        className="px-8 py-3 border border-[#E4002B] text-[#E4002B] text-[11px] tracking-[0.3em] font-mono
                          hover:bg-[#E4002B] hover:text-[#0A0A0A] transition-all duration-300 glitch-btn"
                      >
                        INITIATE SIGNAL SCAN
                      </button>
                    </motion.div>
                  )}

                  {phase === 'scanning' && (
                    <motion.div
                      key="scanning"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-center w-full"
                    >
                      <div className="text-[#E4002B] text-3xl mb-4 animate-ping">◈</div>
                      <div className="text-[10px] text-[#E4002B] tracking-[0.3em] font-mono mb-4 animate-pulse">
                        SCANNING FREQUENCIES...
                      </div>

                      {/* Flashing titles */}
                      <div className="space-y-1 mb-4 h-[120px] overflow-hidden">
                        {flashTitles.map((title, i) => (
                          <motion.div
                            key={`${title}-${i}`}
                            className="text-[11px] text-[#333] font-mono tracking-wider"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: [0, 1, 1, 0], x: 0 }}
                            transition={{
                              duration: 0.3,
                              delay: i * 0.2,
                              times: [0, 0.1, 0.8, 1],
                            }}
                          >
                            {title}
                          </motion.div>
                        ))}
                      </div>

                      {/* Progress bar */}
                      <div className="w-full h-[2px] bg-[#1a1a1a] mt-4 overflow-hidden">
                        <motion.div
                          className="h-full bg-[#E4002B]"
                          initial={{ width: '0%' }}
                          animate={{ width: '100%' }}
                          transition={{ duration: 1.5, ease: 'easeInOut' }}
                        />
                      </div>
                    </motion.div>
                  )}

                  {phase === 'found' && result && (
                    <motion.div
                      key="found"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-center"
                    >
                      <div className="text-[10px] text-[#444] tracking-[0.3em] font-mono mb-3">
                        SIGNAL ACQUIRED // MATCH FOUND
                      </div>

                      {/* Result card */}
                      <div className="inline-flex gap-6 items-start text-left max-w-lg">
                        {/* Poster */}
                        <div className="shrink-0 w-[120px] border border-[#E4002B]/30">
                          {result.posterPath ? (
                            <img
                              src={`${POSTER_SIZES.w342}${result.posterPath}`}
                              alt={result.title}
                              className="w-full aspect-[3/4] object-cover"
                            />
                          ) : (
                            <div className="w-full aspect-[3/4] bg-[#111] flex items-center justify-center">
                              <span className="text-[#333] text-2xl">◆</span>
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="text-[8px] text-[#E4002B] tracking-[0.2em] font-mono mb-1">
                            {result.mediaType === 'tv' ? 'TV SERIES' : 'FILM'}
                          </div>
                          <h3 className="text-[#E0E0E0] text-lg font-mono mb-1 leading-tight">
                            {result.title}
                          </h3>
                          <div className="flex items-center gap-3 text-[10px] text-[#555] font-mono mb-3">
                            <span>{result.year}</span>
                            <span>■ {result.rating.toFixed(1)}/10</span>
                          </div>
                          {result.overview && (
                            <p className="text-[#555] text-[11px] leading-relaxed line-clamp-3 mb-4">
                              {result.overview}
                            </p>
                          )}

                          <div className="flex gap-3">
                            <button
                              onClick={openResult}
                              className="px-5 py-2 bg-[#E4002B] text-white text-[10px] tracking-[0.2em] font-mono
                                hover:bg-[#E4002B]/80 transition-colors glitch-btn"
                            >
                              OPEN RECORD ▶
                            </button>
                            <button
                              onClick={reset}
                              className="px-5 py-2 border border-[#222] text-[#555] text-[10px] tracking-[0.2em] font-mono
                                hover:border-[#E4002B]/30 hover:text-[#888] transition-colors"
                            >
                              SCAN AGAIN
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
