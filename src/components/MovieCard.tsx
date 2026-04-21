'use client';
import { motion } from 'framer-motion';
import type { MediaItem } from '../lib/tmdb/types';
import { useStore } from '@/store/useStore';
import { useUserStore } from '@/store/useUserStore';
import { POSTER_SIZES, GENRE_MAP, TV_GENRE_MAP } from '../lib/tmdb/config';
import ImageWithFallback from './ImageWithFallback';
import { useDeviceCapability, type DeviceTier } from '../hooks/useDeviceCapability';
import { isDataSaverActive } from '../hooks/useDeviceCapability';

interface MovieCardProps {
  media: MediaItem;
  index: number;
}

// Combined genre lookup: movie IDs + TV IDs
const COMBINED_GENRE_MAP: Record<number, string> = { ...GENRE_MAP, ...TV_GENRE_MAP };

// Poster sizes per tier
const POSTER_SIZE_MAP: Record<DeviceTier, string> = {
  high: POSTER_SIZES.w500,
  medium: POSTER_SIZES.w342,
  low: POSTER_SIZES.w185,
  ultra_low: POSTER_SIZES.w185,
};

const DATA_SAVER_POSTER = POSTER_SIZES.w185;

export default function MovieCard({ media, index }: MovieCardProps) {
  const { setSelectedMedia } = useStore();
  const { tier } = useDeviceCapability();
  const isInWatchlist = useUserStore((s) => s.isInWatchlist(media.id, media.mediaType));
  const userRating = useUserStore((s) => s.getRating(media.id, media.mediaType));

  // Select poster quality based on device tier + data saver
  const posterSize = isDataSaverActive() ? DATA_SAVER_POSTER : POSTER_SIZE_MAP[tier];
  const posterUrl = media.posterPath
    ? `${posterSize}${media.posterPath}`
    : null;

  const genreLabels = media.genres
    .slice(0, 2)
    .map((id) => COMBINED_GENRE_MAP[id] ?? 'UNKNOWN')
    .filter(Boolean);

  // Tier-based animations
  const animationProps = tier === 'high'
    ? {
        initial: { opacity: 0, y: 30 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: '-50px' },
        transition: { duration: 0.4, delay: Math.min(index * 0.05, 0.5) },
      }
    : tier === 'medium'
      ? {
          initial: { opacity: 0, y: 15 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, margin: '-30px' },
          transition: { duration: 0.25, delay: Math.min(index * 0.03, 0.3) },
        }
      : // Low tier — instant, no motion
        { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.15 } };

  return (
    <motion.div
      className="group cursor-pointer glitch-card relative"
      {...animationProps}
      onClick={() => setSelectedMedia(media)}
    >
      {/* Card */}
      <div className="relative border border-[#222222] bg-[#111111] overflow-hidden transition-colors duration-300 group-hover:border-[#E4002B]/50">
        {/* Cover Area */}
        <div className="relative aspect-[3/4] bg-[#0d0d0d] overflow-hidden">
          {/* Poster Image */}
          <ImageWithFallback
            src={posterUrl}
            alt={media.title}
            className="w-full h-full object-cover md:transition-transform md:duration-700 md:group-hover:scale-105"
            fallbackClassName="w-full h-full"
            fallbackText="NO DATA"
          />

          {/* Grid overlay on cover — high tier only */}
          {tier === 'high' && (
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage:
                  'linear-gradient(rgba(228,0,43,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(228,0,43,0.3) 1px, transparent 1px)',
                backgroundSize: '20px 20px',
              }}
            />
          )}

          {/* Archive code watermark */}
          <div className="absolute top-3 left-3 text-[10px] text-[#E4002B]/40 tracking-[0.3em] font-mono">
            ARC-{String(media.id).padStart(3, '0')}
          </div>

          {/* Rating badge */}
          <div className="absolute top-3 right-3 flex items-center gap-1 bg-[#0A0A0A]/80 px-2 py-1">
            <span className="text-[#E4002B] text-[10px]">◆</span>
            <span className="text-[#B8B8B8] text-[10px] tracking-wider">
              {userRating ? userRating.rating.toFixed(0) : media.rating.toFixed(1)}
            </span>
            {userRating && (
              <span className="text-[#E4002B] text-[7px] ml-0.5">★</span>
            )}
          </div>

          {/* Watchlist heart */}
          {isInWatchlist && (
            <div className="absolute top-3 left-3 bg-[#0A0A0A]/80 border border-[#E4002B]/50 px-1.5 py-0.5">
              <span className="text-[#E4002B] text-[10px]">♥</span>
            </div>
          )}

          {/* TV Series badge */}
          {media.mediaType === 'tv' && (
            <div className="absolute bottom-3 left-3 bg-[#E4002B]/90 px-2 py-0.5 text-[9px] text-white tracking-widest font-bold">
              TV SERIES
            </div>
          )}
          {media.mediaType === 'movie' && (
            <div className="absolute bottom-3 left-3 bg-[#222222]/80 px-2 py-0.5 text-[9px] text-[#888888] tracking-widest">
              FILM
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-3 border-t border-[#1a1a1a]">
          <h3 className="text-[#B8B8B8] text-sm font-medium truncate">{media.title}</h3>
          <div className="flex items-center gap-2 mt-1.5">
            {media.year && (
              <span className="text-[#555555] text-xs">{media.year}</span>
            )}
            {media.year && genreLabels.length > 0 && (
              <span className="text-[#333333]">·</span>
            )}
            {genreLabels.map((g) => (
              <span key={g} className="text-[#444444] text-[10px] tracking-wider uppercase">
                {g}
              </span>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
