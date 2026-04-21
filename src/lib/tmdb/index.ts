/**
 * Server-only TMDB barrel export.
 *
 * ⚠️ DO NOT import from this file in "use client" components.
 * Use "@/lib/tmdb/client" instead.
 *
 * This file re-exports api.ts which imports "server-only".
 * Importing it in a client component will throw an error.
 */

// Config — also safe for client via "@/lib/tmdb/client"
export {
  TMDB_IMAGE_BASE,
  POSTER_SIZES,
  BACKDROP_SIZES,
  PROFILE_SIZES,
  getImageUrl,
  GENRE_MAP,
  TV_GENRE_MAP,
  GENRE_ID_MAP,
  TV_GENRE_ID_MAP,
  COMBINED_GENRE_MAP,
} from './config';

// Types — safe for client via "@/lib/tmdb/types"
export type {
  MediaType,
  MediaItem,
  MediaDetail,
  TmdbGenre,
  TmdbMovie,
  TmdbTvShow,
  TmdbCredits,
  TmdbCast,
  TmdbCrew,
  TmdbVideo,
  TmdbSearchResult,
  TmdbSeasonDetail,
  TmdbEpisode,
  TmdbMovieList,
  TmdbTvList,
} from './types';

// Embed — also safe for client via "@/lib/tmdb/client"
export {
  SERVERS,
  getServer,
  DEFAULT_SERVER,
} from './embed';
export type { EmbedServer, EmbedOptions } from './embed';

// Schemas — safe for client
export {
  TmdbMovieSchema,
  TmdbMovieDetailSchema,
  TmdbTvShowSchema,
  TmdbTvShowDetailSchema,
  TmdbCreditsSchema,
  TmdbVideosResponseSchema,
  TmdbGenreListResponseSchema,
  TmdbSearchMultiResponseSchema,
  TmdbSeasonDetailSchema,
} from './schemas';

// API — ❌ SERVER ONLY (import "server-only")
export {
  getTrendingMovies,
  getPopularMovies,
  getTopRatedMovies,
  getNowPlayingMovies,
  getUpcomingMovies,
  getMovieDetails,
  getMovieCredits,
  getMovieVideos,
  getSimilarMovies,
  getRecommendedMovies,
  discoverMovies,
  getTrendingTv,
  getPopularTv,
  getTopRatedTv,
  getTvShowDetails,
  getTvShowCredits,
  getTvShowVideos,
  getSimilarTvShows,
  getRecommendedTvShows,
  getSeasonDetails,
  discoverTv,
  searchMovies,
  searchTv,
  searchMulti,
  getMovieGenres,
  getTvGenres,
  movieToMediaItem,
  tvToMediaItem,
  movieDetailToMediaDetail,
  tvDetailToMediaDetail,
  TmdbApiError,
} from './api';
