/**
 * Client-side TMDB fetch helper.
 * Routes all API calls through the Next.js API proxy at /api/tmdb
 * so the API key never reaches the browser.
 */
import type {
  MediaItem,
  MediaDetail,
  TmdbCredits,
  TmdbVideo,
  TmdbEpisode,
} from './types';

// ─── Generic proxy fetch ───────────────────────────────
async function tmdbFetch<T>(path: string, params: Record<string, string | number> = {}): Promise<T> {
  const searchParams = new URLSearchParams();
  searchParams.set('path', path);
  Object.entries(params).forEach(([k, v]) => searchParams.set(k, String(v)));

  const res = await fetch(`/api/tmdb?${searchParams.toString()}`);
  if (!res.ok) {
    throw new Error(`TMDB proxy error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

// ─── Movie endpoints ──────────────────────────────────
export async function fetchTrendingMovies(page = 1) {
  return tmdbFetch<any>('trending/movie/week', { page });
}
export async function fetchTrendingTv(page = 1) {
  return tmdbFetch<any>('trending/tv/week', { page });
}
export async function fetchPopularMovies(page = 1) {
  return tmdbFetch<any>('movie/popular', { page });
}
export async function fetchPopularTv(page = 1) {
  return tmdbFetch<any>('tv/popular', { page });
}
export async function fetchTopRatedMovies(page = 1) {
  return tmdbFetch<any>('movie/top_rated', { page });
}
export async function fetchTopRatedTv(page = 1) {
  return tmdbFetch<any>('tv/top_rated', { page });
}
export async function fetchNowPlaying(page = 1) {
  return tmdbFetch<any>('movie/now_playing', { page });
}
export async function fetchUpcoming(page = 1) {
  return tmdbFetch<any>('movie/upcoming', { page });
}
export async function fetchMovieDetails(id: number) {
  return tmdbFetch<any>(`movie/${id}`, { append_to_response: 'credits,videos,similar,recommendations' });
}
export async function fetchTvShowDetails(id: number) {
  return tmdbFetch<any>(`tv/${id}`, { append_to_response: 'credits,videos,similar,recommendations' });
}
export async function fetchMovieCredits(id: number) {
  return tmdbFetch<TmdbCredits>(`movie/${id}/credits`);
}
export async function fetchTvCredits(id: number) {
  return tmdbFetch<TmdbCredits>(`tv/${id}/credits`);
}
export async function fetchMovieVideos(id: number) {
  return tmdbFetch<{ results: TmdbVideo[] }>(`movie/${id}/videos`);
}
export async function fetchTvVideos(id: number) {
  return tmdbFetch<{ results: TmdbVideo[] }>(`tv/${id}/videos`);
}
export async function fetchSimilarMovies(id: number) {
  return tmdbFetch<any>(`movie/${id}/similar`);
}
export async function fetchSimilarTv(id: number) {
  return tmdbFetch<any>(`tv/${id}/similar`);
}
export async function fetchRecommendedMovies(id: number) {
  return tmdbFetch<any>(`movie/${id}/recommendations`);
}
export async function fetchRecommendedTv(id: number) {
  return tmdbFetch<any>(`tv/${id}/recommendations`);
}
export async function fetchSeasonDetails(tvId: number, season: number) {
  return tmdbFetch<any>(`tv/${tvId}/season/${season}`);
}
export async function searchMovies(query: string, page = 1) {
  return tmdbFetch<any>('search/movie', { query, page });
}
export async function searchTv(query: string, page = 1) {
  return tmdbFetch<any>('search/tv', { query, page });
}
export async function searchMulti(query: string, page = 1) {
  return tmdbFetch<any>('search/multi', { query, page });
}
export async function discoverMovies(params: Record<string, string | number>) {
  return tmdbFetch<any>('discover/movie', params);
}
export async function discoverTv(params: Record<string, string | number>) {
  return tmdbFetch<any>('discover/tv', params);
}

// ─── Transformers (same logic as server-side, but run on client) ──
export function movieToMediaItem(m: any): MediaItem {
  return {
    id: m.id,
    title: m.title ?? m.name ?? 'Unknown',
    overview: m.overview ?? '',
    posterPath: m.poster_path ?? null,
    backdropPath: m.backdrop_path ?? null,
    rating: m.vote_average ?? 0,
    voteCount: m.vote_count ?? 0,
    releaseDate: m.release_date ?? '',
    genreIds: m.genre_ids ?? [],
    mediaType: 'movie',
    popularity: m.popularity ?? 0,
    adult: m.adult ?? false,
    originalLanguage: m.original_language ?? '',
    year: (m.release_date ?? '').slice(0, 4),
  };
}

export function tvToMediaItem(m: any): MediaItem {
  return {
    id: m.id,
    title: m.name ?? 'Unknown',
    overview: m.overview ?? '',
    posterPath: m.poster_path ?? null,
    backdropPath: m.backdrop_path ?? null,
    rating: m.vote_average ?? 0,
    voteCount: m.vote_count ?? 0,
    releaseDate: m.first_air_date ?? '',
    genreIds: m.genre_ids ?? [],
    mediaType: 'tv',
    popularity: m.popularity ?? 0,
    adult: m.adult ?? false,
    originalLanguage: m.original_language ?? '',
    year: (m.first_air_date ?? '').slice(0, 4),
  };
}

export function movieDetailToMediaDetail(m: any): MediaDetail {
  return {
    id: m.id,
    title: m.title ?? 'Unknown',
    overview: m.overview ?? '',
    posterPath: m.poster_path ?? null,
    backdropPath: m.backdrop_path ?? null,
    rating: m.vote_average ?? 0,
    voteCount: m.vote_count ?? 0,
    releaseDate: m.release_date ?? '',
    genreIds: (m.genres ?? []).map((g: any) => g.id),
    mediaType: 'movie',
    popularity: m.popularity ?? 0,
    adult: m.adult ?? false,
    originalLanguage: m.original_language ?? '',
    year: (m.release_date ?? '').slice(0, 4),
    tagline: m.tagline ?? null,
    status: m.status ?? '',
    runtime: m.runtime ?? null,
    budget: m.budget ?? null,
    revenue: m.revenue ?? null,
    imdbId: m.imdb_id ?? null,
    homepage: m.homepage ?? null,
    genres: m.genres ?? [],
    productionCompanies: m.production_companies ?? [],
    spokenLanguages: m.spoken_languages ?? [],
    belongsToCollection: m.belongs_to_collection ?? null,
    originalLanguage: m.original_language ?? '',
    originCountry: [],
    numberOfSeasons: null,
    numberOfEpisodes: null,
    episodeRunTime: null,
    networks: null,
    type: null,
    createdBy: null,
  };
}

export function tvDetailToMediaDetail(m: any): MediaDetail {
  return {
    id: m.id,
    title: m.name ?? 'Unknown',
    overview: m.overview ?? '',
    posterPath: m.poster_path ?? null,
    backdropPath: m.backdrop_path ?? null,
    rating: m.vote_average ?? 0,
    voteCount: m.vote_count ?? 0,
    releaseDate: m.first_air_date ?? '',
    genreIds: (m.genres ?? []).map((g: any) => g.id),
    mediaType: 'tv',
    popularity: m.popularity ?? 0,
    adult: m.adult ?? false,
    originalLanguage: m.original_language ?? '',
    year: (m.first_air_date ?? '').slice(0, 4),
    tagline: m.tagline ?? null,
    status: m.status ?? '',
    runtime: null,
    budget: null,
    revenue: null,
    imdbId: null,
    homepage: m.homepage ?? null,
    genres: m.genres ?? [],
    productionCompanies: m.production_companies ?? [],
    spokenLanguages: m.spoken_languages ?? [],
    belongsToCollection: null,
    originalLanguage: m.original_language ?? '',
    originCountry: m.origin_country ?? [],
    numberOfSeasons: m.number_of_seasons ?? null,
    numberOfEpisodes: m.number_of_episodes ?? null,
    episodeRunTime: m.episode_run_time ?? null,
    networks: m.networks ?? null,
    type: m.type ?? null,
    createdBy: m.created_by ?? null,
  };
}
