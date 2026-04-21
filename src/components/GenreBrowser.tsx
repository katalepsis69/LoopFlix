'use client';
/**
 * GenreBrowser — Grid of genre cards for browsing.
 * Clicking a genre navigates to catalog with that genre pre-selected.
 */
import { motion } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { MOVIE_GENRES, TV_GENRES } from '../hooks/useCatalogParams';
import { useCatalogParams } from '../hooks/useCatalogParams';
import { useDeviceCapability } from '../hooks/useDeviceCapability';

// Genre visual themes — each genre gets a subtle aesthetic
const GENRE_VISUALS: Record<string, { icon: string; accent: string }> = {
  'ALL': { icon: '◈', accent: '#E4002B' },
  'ACTION': { icon: '⚔', accent: '#FF4444' },
  'ADVENTURE': { icon: '🏔', accent: '#FF8C00' },
  'ANIMATION': { icon: '✦', accent: '#FF69B4' },
  'COMEDY': { icon: '☺', accent: '#FFD700' },
  'CRIME': { icon: '🔒', accent: '#8B4513' },
  'DOCUMENTARY': { icon: '◆', accent: '#4682B4' },
  'DRAMA': { icon: '◎', accent: '#9370DB' },
  'FAMILY': { icon: '⌂', accent: '#32CD32' },
  'FANTASY': { icon: '✧', accent: '#DA70D6' },
  'HISTORY': { icon: '⛏', accent: '#CD853F' },
  'HORROR': { icon: '☠', accent: '#8B0000' },
  'MUSIC': { icon: '♪', accent: '#1E90FF' },
  'MYSTERY': { icon: '?', accent: '#4B0082' },
  'ROMANCE': { icon: '♥', accent: '#DC143C' },
  'SCI-FI': { icon: '∞', accent: '#00CED1' },
  'THRILLER': { icon: '⚡', accent: '#FF4500' },
  'WAR': { icon: '⚔', accent: '#556B2F' },
  'WESTERN': { icon: '★', accent: '#B8860B' },
  'TV MOVIE': { icon: '📺', accent: '#708090' },
  'ACTION & ADVENTURE': { icon: '⚔', accent: '#FF6347' },
  'KIDS': { icon: '☀', accent: '#87CEEB' },
  'NEWS': { icon: '📰', accent: '#A9A9A9' },
  'REALITY': { icon: '◉', accent: '#DAA520' },
  'SCI-FI & FANTASY': { icon: '∞', accent: '#00CED1' },
  'SOAP': { icon: '♦', accent: '#DDA0DD' },
  'TALK': { icon: '◈', accent: '#BC8F8F' },
  'WAR & POLITICS': { icon: '♟', accent: '#6B8E23' },
};

export default function GenreBrowser() {
  const { tier } = useDeviceCapability();
  const { mediaType, setMediaType, setGenre, clearAll } = useCatalogParams();
  const { setCurrentSection } = useStore();
  const genres = mediaType === 'tv' ? TV_GENRES : MOVIE_GENRES;

  const handleGenreClick = (genre: string) => {
    clearAll();
    setMediaType(mediaType);
    setGenre(genre);
    setCurrentSection('catalog');
  };

  const handleTypeToggle = (type: 'movie' | 'tv') => {
    setMediaType(type);
  };

  return (
    <section className="relative px-4 md:px-8 py-12 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-2 h-2 bg-[#E4002B]" />
        <h2 className="text-[#E0E0E0] text-xl tracking-[0.3em] font-mono">GENRE INDEX</h2>
        <div className="flex-1 h-[1px] bg-[#1a1a1a]" />
        <span className="text-[#444444] text-[10px] tracking-[0.2em] font-mono">
          {genres.length - 1} CATEGORIES
        </span>
      </div>

      {/* Type toggle */}
      <div className="flex gap-2 mb-6">
        {(['movie', 'tv'] as const).map(type => (
          <button
            key={type}
            onClick={() => handleTypeToggle(type)}
            className={`px-4 py-2 text-[10px] font-mono tracking-[0.3em] border transition-all ${
              mediaType === type
                ? 'border-[#E4002B] text-[#E4002B] bg-[#E4002B]/10'
                : 'border-[#222] text-[#555] hover:border-[#E4002B]/30'
            }`}
          >
            {type === 'movie' ? '◆ FILM' : '◇ TV SERIES'}
          </button>
        ))}
      </div>

      {/* Genre grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
        {genres.map((genre, i) => {
          const visual = GENRE_VISUALS[genre] || { icon: '◆', accent: '#666' };
          return (
            <motion.button
              key={genre}
              onClick={() => handleGenreClick(genre)}
              className="group relative border border-[#1a1a1a] bg-[#0d0d0d] p-4 text-left hover:border-[#333] transition-all overflow-hidden"
              initial={tier !== 'ultra_low' ? { opacity: 0, y: 10 } : undefined}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: tier !== 'ultra_low' ? i * 0.02 : 0 }}
              whileHover={tier !== 'ultra_low' ? { scale: 1.02 } : undefined}
            >
              {/* Accent line */}
              <div
                className="absolute top-0 left-0 w-full h-[2px] opacity-40 group-hover:opacity-100 transition-opacity"
                style={{ backgroundColor: visual.accent }}
              />

              {/* Content */}
              <div className="flex items-center gap-3">
                <span
                  className="text-lg opacity-40 group-hover:opacity-80 transition-opacity"
                  style={{ color: visual.accent }}
                >
                  {visual.icon}
                </span>
                <span className="text-[10px] text-[#888] font-mono tracking-[0.2em] group-hover:text-[#ccc] transition-colors">
                  {genre}
                </span>
              </div>

              {/* Arrow indicator on hover */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#333] group-hover:text-[#E4002B] transition-colors text-xs opacity-0 group-hover:opacity-100">
                →
              </div>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}
