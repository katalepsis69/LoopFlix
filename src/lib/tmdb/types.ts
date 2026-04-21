/**
 * TypeScript types inferred from Zod schemas.
 */
import type { z } from 'zod';
import type {
  TmdbMovieSchema,
  TmdbMovieDetailSchema,
  TmdbTvShowSchema,
  TmdbTvShowDetailSchema,
  TmdbCreditsSchema,
  TmdbCastSchema,
  TmdbCrewSchema,
  TmdbVideoSchema,
  TmdbGenreSchema,
  TmdbGenreListResponseSchema,
  TmdbSearchResultSchema,
  TmdbSeasonDetailSchema,
  TmdbEpisodeSchema,
} from './schemas';
import type { TmdbPaginatedResponseSchema } from './schemas';

export type TmdbGenre = z.infer<typeof TmdbGenreSchema>;
export type TmdbMovie = z.infer<typeof TmdbMovieSchema>;
export type TmdbMovieDetail = z.infer<typeof TmdbMovieDetailSchema>;
export type TmdbTvShow = z.infer<typeof TmdbTvShowSchema>;
export type TmdbTvShowDetail = z.infer<typeof TmdbTvShowDetailSchema>;
export type TmdbCredits = z.infer<typeof TmdbCreditsSchema>;
export type TmdbCast = z.infer<typeof TmdbCastSchema>;
export type TmdbCrew = z.infer<typeof TmdbCrewSchema>;
export type TmdbVideo = z.infer<typeof TmdbVideoSchema>;
export type TmdbSearchResult = z.infer<typeof TmdbSearchResultSchema>;
export type TmdbSeasonDetail = z.infer<typeof TmdbSeasonDetailSchema>;
export type TmdbEpisode = z.infer<typeof TmdbEpisodeSchema>;

export type TmdbMovieList = z.infer<ReturnType<typeof TmdbPaginatedResponseSchema<typeof TmdbMovieSchema>>>;
export type TmdbTvList = z.infer<ReturnType<typeof TmdbPaginatedResponseSchema<typeof TmdbTvShowSchema>>>;
export type TmdbGenreList = z.infer<typeof TmdbGenreListResponseSchema>;
export type TmdbSearchMultiList = z.infer<ReturnType<typeof TmdbPaginatedResponseSchema<typeof TmdbSearchResultSchema>>>;

export type MediaType = 'movie' | 'tv';

export interface MediaItem {
  id: number;
  mediaType: MediaType;
  title: string;
  originalTitle: string;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  year: string;
  genres: number[];
  rating: number;
  voteCount: number;
  popularity: number;
}

export interface MediaDetail {
  id: number;
  mediaType: MediaType;
  title: string;
  originalTitle: string;
  tagline: string | null;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  year: string;
  runtime: number | null;
  status: string;
  rating: number;
  voteCount: number;
  popularity: number;
  genres: TmdbGenre[];
  imdbId: string | null;
  budget: number;
  revenue: number;
  homepage: string | null;
  originalLanguage: string;
  productionCompanies: { name: string; logoPath: string | null; originCountry: string }[];
  spokenLanguages: { name: string; iso: string }[];
  belongsToCollection: { id: number; name: string } | null;
  numberOfSeasons?: number;
  numberOfEpisodes?: number;
  episodeRunTime?: number[];
  seasons?: TmdbTvShowDetail['seasons'];
  networks?: TmdbTvShowDetail['networks'];
  createdBy?: TmdbTvShowDetail['created_by'];
  originCountry?: string[];
}
