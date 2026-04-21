/**
 * Client-safe TMDB exports.
 *
 * Import from this file in "use client" components.
 * Does NOT import api.ts (which has "server-only").
 *
 * Usage in client components:
 *   import { GENRE_MAP, POSTER_SIZES, getMovieDetails } from "@/lib/tmdb/client";
 *
 * Usage in server components / route handlers:
 *   import { searchMulti, getTrendingMovies } from "@/lib/tmdb";
 */

// Config — image URLs, genre maps
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

// Embed — server URLs
export {
  getMovieEmbedUrl,
  getTvEmbedUrl,
  getMovieEmbedHtml,
  getTvEmbedHtml,
  SERVERS,
} from './embed';

// ─── API Functions (via client proxy) ──────────────────────────
// Re-export from client-fetch with ORIGINAL names so components
// don't need any function renaming after migration.

export {
  // Trending
  fetchTrendingMovies as getTrendingMovies,
  fetchTrendingTv as getTrendingTv,

  // Popular
  fetchPopularMovies as getPopularMovies,
  fetchPopularTv as getPopularTv,

  // Top rated
  fetchTopRatedMovies as getTopRatedMovies,
  fetchTopRatedTv as getTopRatedTv,

  // Now playing / upcoming
  fetchNowPlaying as getNowPlayingMovies,
  fetchUpcoming as getUpcomingMovies,

  // Details
  fetchMovieDetails as getMovieDetails,
  fetchTvShowDetails as getTvShowDetails,

  // Credits
  fetchMovieCredits as getMovieCredits,
  fetchTvCredits as getTvShowCredits,

  // Videos
  fetchMovieVideos as getMovieVideos,
  fetchTvVideos as getTvShowVideos,

  // Similar / Recommended
  fetchSimilarMovies as getSimilarMovies,
  fetchSimilarTv as getSimilarTvShows,
  fetchRecommendedMovies as getRecommendedMovies,
  fetchRecommendedTv as getRecommendedTvShows,

  // Season details
  fetchSeasonDetails as getSeasonDetails,

  // Search
  searchMovies,
  searchTv,
  searchMulti,

  // Discover
  discoverMovies,
  discoverTv,
} from './client-fetch';

// Transformers
export {
  movieToMediaItem,
  tvToMediaItem,
  movieDetailToMediaDetail,
  tvDetailToMediaDetail,
} from './client-fetch';
