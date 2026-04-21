/**
 * TMDB API — Server-side only.
 *
 * This file imports "server-only" to prevent leaking to the client.
 * All TMDB calls happen on the server. The API key is never exposed.
 */
import 'server-only';

import { z } from 'zod';
import { TMDB_API_KEY, TMDB_BASE_URL } from './config';
import {
  TmdbMovieListSchema,
  TmdbTvListSchema,
  TmdbMovieDetailSchema,
  TmdbTvShowDetailSchema,
  TmdbCreditsSchema,
  TmdbVideosResponseSchema,
  TmdbGenreListResponseSchema,
  TmdbSearchMultiResponseSchema,
  TmdbSeasonDetailSchema,
} from './schemas';
import type {
  TmdbMovie,
  TmdbMovieDetail as TmdbMovieDetailType,
  TmdbTvShow,
  TmdbTvShowDetail as TmdbTvShowDetailType,
  TmdbMovieList,
  TmdbTvList,
  TmdbCredits,
  TmdbGenreList,
  TmdbSearchMultiList,
  MediaItem,
  MediaDetail,
} from './types';

// ─── Error class ─────────────────────────────────────────────

export class TmdbApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public endpoint: string,
  ) {
    super(`TMDB API Error [${status}]: ${statusText} — ${endpoint}`);
    this.name = 'TmdbApiError';
  }
}

// ─── Base fetch ──────────────────────────────────────────────

async function tmdbFetch<T>(
  endpoint: string,
  params: Record<string, string | number> = {},
  schema: z.ZodType<T>,
): Promise<T> {
  const url = new URL(`${TMDB_BASE_URL}${endpoint}`);
  url.searchParams.set('api_key', TMDB_API_KEY);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }

  const response = await fetch(url.toString(), { next: { revalidate: 300 } });

  if (!response.ok) {
    throw new TmdbApiError(response.status, response.statusText, endpoint);
  }

  const data = await response.json();
  const result = schema.safeParse(data);
  if (!result.success) {
    console.warn(`[TMDB] Schema validation warning for ${endpoint}:`, result.error.issues);
    return data as T;
  }
  return result.data;
}

// ─── Movies ──────────────────────────────────────────────────

export async function getTrendingMovies(
  timeWindow: 'day' | 'week' = 'week',
  page: number = 1,
): Promise<TmdbMovieList> {
  return tmdbFetch(`/trending/movie/${timeWindow}`, { page }, TmdbMovieListSchema);
}

export async function getPopularMovies(page: number = 1): Promise<TmdbMovieList> {
  return tmdbFetch('/movie/popular', { page }, TmdbMovieListSchema);
}

export async function getTopRatedMovies(page: number = 1): Promise<TmdbMovieList> {
  return tmdbFetch('/movie/top_rated', { page }, TmdbMovieListSchema);
}

export async function getNowPlayingMovies(page: number = 1): Promise<TmdbMovieList> {
  return tmdbFetch('/movie/now_playing', { page }, TmdbMovieListSchema);
}

export async function getUpcomingMovies(page: number = 1): Promise<TmdbMovieList> {
  return tmdbFetch('/movie/upcoming', { page }, TmdbMovieListSchema);
}

export async function getMovieDetails(movieId: number): Promise<TmdbMovieDetailType> {
  return tmdbFetch(`/movie/${movieId}`, {}, TmdbMovieDetailSchema);
}

export async function getMovieCredits(movieId: number): Promise<TmdbCredits> {
  return tmdbFetch(`/movie/${movieId}/credits`, {}, TmdbCreditsSchema);
}

export async function getMovieVideos(movieId: number) {
  return tmdbFetch(`/movie/${movieId}/videos`, {}, TmdbVideosResponseSchema);
}

export async function getSimilarMovies(movieId: number, page: number = 1): Promise<TmdbMovieList> {
  return tmdbFetch(`/movie/${movieId}/similar`, { page }, TmdbMovieListSchema);
}

export async function getRecommendedMovies(movieId: number, page: number = 1): Promise<TmdbMovieList> {
  return tmdbFetch(`/movie/${movieId}/recommendations`, { page }, TmdbMovieListSchema);
}

export async function discoverMovies(params: {
  page?: number;
  sort_by?: string;
  with_genres?: string;
  primary_release_year?: number;
  vote_average_gte?: number;
  vote_count_gte?: number;
  with_original_language?: string;
}): Promise<TmdbMovieList> {
  const p: Record<string, string | number> = { page: params.page ?? 1 };
  if (params.sort_by) p.sort_by = params.sort_by;
  if (params.with_genres) p.with_genres = params.with_genres;
  if (params.primary_release_year) p.primary_release_year = params.primary_release_year;
  if (params.vote_average_gte) p['vote_average.gte'] = params.vote_average_gte;
  if (params.vote_count_gte) p['vote_count.gte'] = params.vote_count_gte;
  if (params.with_original_language) p.with_original_language = params.with_original_language;
  return tmdbFetch('/discover/movie', p, TmdbMovieListSchema);
}

// ─── TV Shows ────────────────────────────────────────────────

export async function getTrendingTv(
  timeWindow: 'day' | 'week' = 'week',
  page: number = 1,
): Promise<TmdbTvList> {
  return tmdbFetch(`/trending/tv/${timeWindow}`, { page }, TmdbTvListSchema);
}

export async function getPopularTv(page: number = 1): Promise<TmdbTvList> {
  return tmdbFetch('/tv/popular', { page }, TmdbTvListSchema);
}

export async function getTopRatedTv(page: number = 1): Promise<TmdbTvList> {
  return tmdbFetch('/tv/top_rated', { page }, TmdbTvListSchema);
}

export async function getTvShowDetails(tvId: number): Promise<TmdbTvShowDetailType> {
  return tmdbFetch(`/tv/${tvId}`, {}, TmdbTvShowDetailSchema);
}

export async function getTvShowCredits(tvId: number): Promise<TmdbCredits> {
  return tmdbFetch(`/tv/${tvId}/credits`, {}, TmdbCreditsSchema);
}

export async function getTvShowVideos(tvId: number) {
  return tmdbFetch(`/tv/${tvId}/videos`, {}, TmdbVideosResponseSchema);
}

export async function getSimilarTvShows(tvId: number, page: number = 1): Promise<TmdbTvList> {
  return tmdbFetch(`/tv/${tvId}/similar`, { page }, TmdbTvListSchema);
}

export async function getRecommendedTvShows(tvId: number, page: number = 1): Promise<TmdbTvList> {
  return tmdbFetch(`/tv/${tvId}/recommendations`, { page }, TmdbTvListSchema);
}

export async function getSeasonDetails(tvId: number, seasonNumber: number) {
  return tmdbFetch(`/tv/${tvId}/season/${seasonNumber}`, {}, TmdbSeasonDetailSchema);
}

export async function discoverTv(params: {
  page?: number;
  sort_by?: string;
  with_genres?: string;
  first_air_date_year?: number;
  vote_average_gte?: number;
  vote_count_gte?: number;
  with_original_language?: string;
}): Promise<TmdbTvList> {
  const p: Record<string, string | number> = { page: params.page ?? 1 };
  if (params.sort_by) p.sort_by = params.sort_by;
  if (params.with_genres) p.with_genres = params.with_genres;
  if (params.first_air_date_year) p.first_air_date_year = params.first_air_date_year;
  if (params.vote_average_gte) p['vote_average.gte'] = params.vote_average_gte;
  if (params.vote_count_gte) p['vote_count.gte'] = params.vote_count_gte;
  if (params.with_original_language) p.with_original_language = params.with_original_language;
  return tmdbFetch('/discover/tv', p, TmdbTvListSchema);
}

// ─── Search ──────────────────────────────────────────────────

export async function searchMovies(query: string, page: number = 1): Promise<TmdbMovieList> {
  return tmdbFetch('/search/movie', { query, page }, TmdbMovieListSchema);
}

export async function searchTv(query: string, page: number = 1): Promise<TmdbTvList> {
  return tmdbFetch('/search/tv', { query, page }, TmdbTvListSchema);
}

export async function searchMulti(query: string, page: number = 1): Promise<TmdbSearchMultiList> {
  return tmdbFetch('/search/multi', { query, page }, TmdbSearchMultiResponseSchema);
}

// ─── Genres ──────────────────────────────────────────────────

export async function getMovieGenres(): Promise<TmdbGenreList> {
  return tmdbFetch('/genre/movie/list', {}, TmdbGenreListResponseSchema);
}

export async function getTvGenres(): Promise<TmdbGenreList> {
  return tmdbFetch('/genre/tv/list', {}, TmdbGenreListResponseSchema);
}

// ─── Transformers ────────────────────────────────────────────

export function movieToMediaItem(movie: TmdbMovie): MediaItem {
  return {
    id: movie.id,
    mediaType: 'movie',
    title: movie.title ?? '',
    originalTitle: movie.original_title ?? '',
    overview: movie.overview ?? '',
    posterPath: movie.poster_path ?? null,
    backdropPath: movie.backdrop_path ?? null,
    year: (movie.release_date ?? '').slice(0, 4) || '????',
    genres: movie.genre_ids ?? [],
    rating: movie.vote_average ?? 0,
    voteCount: movie.vote_count ?? 0,
    popularity: movie.popularity ?? 0,
  };
}

export function tvToMediaItem(show: TmdbTvShow): MediaItem {
  return {
    id: show.id,
    mediaType: 'tv',
    title: show.name ?? '',
    originalTitle: show.original_name ?? '',
    overview: show.overview ?? '',
    posterPath: show.poster_path ?? null,
    backdropPath: show.backdrop_path ?? null,
    year: (show.first_air_date ?? '').slice(0, 4) || '????',
    genres: show.genre_ids ?? [],
    rating: show.vote_average ?? 0,
    voteCount: show.vote_count ?? 0,
    popularity: show.popularity ?? 0,
  };
}

export function movieDetailToMediaDetail(detail: TmdbMovieDetailType): MediaDetail {
  return {
    id: detail.id,
    mediaType: 'movie',
    title: detail.title ?? '',
    originalTitle: detail.original_title ?? '',
    tagline: detail.tagline ?? null,
    overview: detail.overview ?? '',
    posterPath: detail.poster_path ?? null,
    backdropPath: detail.backdrop_path ?? null,
    year: (detail.release_date ?? '').slice(0, 4) || '????',
    runtime: detail.runtime ?? null,
    status: detail.status ?? '',
    rating: detail.vote_average ?? 0,
    voteCount: detail.vote_count ?? 0,
    popularity: detail.popularity ?? 0,
    genres: detail.genres ?? [],
    imdbId: detail.imdb_id ?? null,
    budget: detail.budget ?? 0,
    revenue: detail.revenue ?? 0,
    homepage: detail.homepage ?? null,
    originalLanguage: (detail as any).original_language?.toUpperCase() ?? '',
    productionCompanies: ((detail as any).production_companies ?? []).map((c: any) => ({
      name: c.name ?? '',
      logoPath: c.logo_path ?? null,
      originCountry: c.origin_country ?? '',
    })),
    spokenLanguages: ((detail as any).spoken_languages ?? []).map((l: any) => ({
      name: l.english_name ?? l.name ?? '',
      iso: l.iso_639_1 ?? '',
    })),
    belongsToCollection: (detail as any).belongs_to_collection
      ? { id: (detail as any).belongs_to_collection.id, name: (detail as any).belongs_to_collection.name ?? '' }
      : null,
  };
}

export function tvDetailToMediaDetail(detail: TmdbTvShowDetailType): MediaDetail {
  return {
    id: detail.id,
    mediaType: 'tv',
    title: detail.name ?? '',
    originalTitle: detail.original_name ?? '',
    tagline: detail.tagline ?? null,
    overview: detail.overview ?? '',
    posterPath: detail.poster_path ?? null,
    backdropPath: detail.backdrop_path ?? null,
    year: (detail.first_air_date ?? '').slice(0, 4) || '????',
    runtime: detail.episode_run_time?.[0] ?? null,
    status: detail.status ?? '',
    rating: detail.vote_average ?? 0,
    voteCount: detail.vote_count ?? 0,
    popularity: detail.popularity ?? 0,
    genres: detail.genres ?? [],
    imdbId: null,
    budget: 0,
    revenue: 0,
    homepage: (detail as any).homepage ?? null,
    originalLanguage: (detail as any).original_language?.toUpperCase() ?? '',
    productionCompanies: ((detail as any).production_companies ?? []).map((c: any) => ({
      name: c.name ?? '',
      logoPath: c.logo_path ?? null,
      originCountry: c.origin_country ?? '',
    })),
    spokenLanguages: ((detail as any).spoken_languages ?? []).map((l: any) => ({
      name: l.english_name ?? l.name ?? '',
      iso: l.iso_639_1 ?? '',
    })),
    belongsToCollection: null,
    numberOfSeasons: detail.number_of_seasons ?? 0,
    numberOfEpisodes: detail.number_of_episodes ?? 0,
    episodeRunTime: detail.episode_run_time ?? [],
    seasons: detail.seasons ?? [],
    networks: detail.networks ?? [],
    createdBy: detail.created_by ?? [],
    originCountry: (detail as any).origin_country ?? [],
  };
}
