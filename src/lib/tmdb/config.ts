/**
 * TMDB API Configuration — Server-side only.
 *
 * All values read from environment variables.
 * This file should only be imported from server components / route handlers.
 */

export const TMDB_API_KEY = process.env.TMDB_API_KEY!;
export const TMDB_BASE_URL = process.env.TMDB_BASE_URL || 'https://api.themoviedb.org/3';
export const TMDB_IMAGE_BASE = process.env.TMDB_IMAGE_BASE || 'https://image.tmdb.org/t/p';

/** Image sizes for posters/backdrops */
export const POSTER_SIZES = {
  w92: `${TMDB_IMAGE_BASE}/w92`,
  w154: `${TMDB_IMAGE_BASE}/w154`,
  w185: `${TMDB_IMAGE_BASE}/w185`,
  w342: `${TMDB_IMAGE_BASE}/w342`,
  w500: `${TMDB_IMAGE_BASE}/w500`,
  w780: `${TMDB_IMAGE_BASE}/w780`,
  original: `${TMDB_IMAGE_BASE}/original`,
} as const;

export const BACKDROP_SIZES = {
  w300: `${TMDB_IMAGE_BASE}/w300`,
  w780: `${TMDB_IMAGE_BASE}/w780`,
  w1280: `${TMDB_IMAGE_BASE}/w1280`,
  original: `${TMDB_IMAGE_BASE}/original`,
} as const;

export const PROFILE_SIZES = {
  w45: `${TMDB_IMAGE_BASE}/w45`,
  w185: `${TMDB_IMAGE_BASE}/w185`,
  h632: `${TMDB_IMAGE_BASE}/h632`,
  original: `${TMDB_IMAGE_BASE}/original`,
} as const;

/** Helper to get full image URL — safe for client components */
export function getImageUrl(path: string | null, size: string = 'w500'): string {
  if (!path) return '';
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

/** TMDB genre ID → label mapping — MOVIES */
export const GENRE_MAP: Record<number, string> = {
  28: 'ACTION', 12: 'ADVENTURE', 16: 'ANIMATION', 35: 'COMEDY',
  80: 'CRIME', 99: 'DOCUMENTARY', 18: 'DRAMA', 10751: 'FAMILY',
  14: 'FANTASY', 36: 'HISTORY', 27: 'HORROR', 10402: 'MUSIC',
  9648: 'MYSTERY', 10749: 'ROMANCE', 878: 'SCIENCE FICTION',
  10770: 'TV MOVIE', 53: 'THRILLER', 10752: 'WAR', 37: 'WESTERN',
};

/** TMDB genre ID → label mapping — TV */
export const TV_GENRE_MAP: Record<number, string> = {
  10759: 'ACTION & ADVENTURE', 16: 'ANIMATION', 35: 'COMEDY',
  80: 'CRIME', 99: 'DOCUMENTARY', 18: 'DRAMA', 10751: 'FAMILY',
  10762: 'KIDS', 9648: 'MYSTERY', 10763: 'NEWS', 10764: 'REALITY',
  10765: 'SCI-FI & FANTASY', 10766: 'SOAP', 10767: 'TALK',
  10768: 'WAR & POLITICS', 37: 'WESTERN',
};

/** TMDB label → genre ID mapping — MOVIES */
export const GENRE_ID_MAP: Record<string, number> = Object.fromEntries(
  Object.entries(GENRE_MAP).map(([id, label]) => [label, Number(id)])
);

/** TMDB label → genre ID mapping — TV */
export const TV_GENRE_ID_MAP: Record<string, number> = Object.fromEntries(
  Object.entries(TV_GENRE_MAP).map(([id, label]) => [label, Number(id)])
);

/** Combined map for display (movie genres + TV genres) */
export const COMBINED_GENRE_MAP: Record<number, string> = {
  ...GENRE_MAP,
  ...TV_GENRE_MAP,
};
