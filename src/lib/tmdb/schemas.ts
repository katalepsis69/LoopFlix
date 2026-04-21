import { z } from 'zod';

// ──────────────────────────────────────────────────────────────
// Primitive helpers
// ──────────────────────────────────────────────────────────────

const nullableString = z.string().nullable().optional();
const nullableNumber = z.number().nullable().optional();
const optionalBool = z.boolean().optional().default(false);
const optionalNumber = z.number().optional().default(0);

// ──────────────────────────────────────────────────────────────
// Genre schema
// ──────────────────────────────────────────────────────────────

export const TmdbGenreSchema = z.object({
  id: z.number(),
  name: z.string(),
});

// ──────────────────────────────────────────────────────────────
// Movie schemas
// ──────────────────────────────────────────────────────────────

export const TmdbMovieSchema = z.object({
  id: z.number(),
  title: z.string().optional().default(''),
  original_title: z.string().optional().default(''),
  overview: z.string().optional().default(''),
  poster_path: nullableString,
  backdrop_path: nullableString,
  release_date: z.string().optional().default(''),
  adult: optionalBool,
  genre_ids: z.array(z.number()).optional().default([]),
  vote_average: optionalNumber,
  vote_count: optionalNumber,
  popularity: optionalNumber,
  original_language: z.string().optional().default(''),
  video: optionalBool,
}).passthrough();

export const TmdbMovieDetailSchema = TmdbMovieSchema.extend({
  runtime: nullableNumber,
  budget: optionalNumber,
  revenue: optionalNumber,
  tagline: nullableString,
  status: z.string().optional().default(''),
  imdb_id: nullableString,
  genres: z.array(TmdbGenreSchema).optional().default([]),
  production_companies: z.array(z.object({
    id: z.number(),
    name: z.string().optional().default(''),
    logo_path: nullableString,
    origin_country: z.string().optional().default(''),
  }).passthrough()).optional().default([]),
  spoken_languages: z.array(z.object({
    english_name: z.string().optional().default(''),
    iso_639_1: z.string().optional().default(''),
    name: z.string().optional().default(''),
  }).passthrough()).optional().default([]),
  belongs_to_collection: z.object({
    id: z.number(),
    name: z.string().optional().default(''),
    poster_path: nullableString,
    backdrop_path: nullableString,
  }).passthrough().nullable().optional(),
  homepage: nullableString,
}).passthrough();

// ──────────────────────────────────────────────────────────────
// TV Show schemas
// ──────────────────────────────────────────────────────────────

export const TmdbTvShowSchema = z.object({
  id: z.number(),
  name: z.string().optional().default(''),
  original_name: z.string().optional().default(''),
  overview: z.string().optional().default(''),
  poster_path: nullableString,
  backdrop_path: nullableString,
  first_air_date: z.string().optional().default(''),
  genre_ids: z.array(z.number()).optional().default([]),
  vote_average: optionalNumber,
  vote_count: optionalNumber,
  popularity: optionalNumber,
  original_language: z.string().optional().default(''),
  origin_country: z.array(z.string()).optional().default([]),
}).passthrough();

export const TmdbTvShowDetailSchema = TmdbTvShowSchema.extend({
  number_of_seasons: optionalNumber,
  number_of_episodes: optionalNumber,
  episode_run_time: z.array(z.number()).optional().default([]),
  status: z.string().optional().default(''),
  tagline: nullableString,
  genres: z.array(TmdbGenreSchema).optional().default([]),
  created_by: z.array(z.object({
    id: z.number(),
    name: z.string().optional().default(''),
    profile_path: nullableString,
  }).passthrough()).optional().default([]),
  networks: z.array(z.object({
    id: z.number(),
    name: z.string().optional().default(''),
    logo_path: nullableString,
    origin_country: z.string().optional().default(''),
  }).passthrough()).optional().default([]),
  seasons: z.array(z.object({
    id: z.number(),
    name: z.string().optional().default(''),
    season_number: optionalNumber,
    episode_count: optionalNumber,
    poster_path: nullableString,
    air_date: nullableString,
    overview: z.string().optional().default(''),
  }).passthrough()).optional().default([]),
}).passthrough();

// ──────────────────────────────────────────────────────────────
// Season detail schema
// ──────────────────────────────────────────────────────────────

export const TmdbEpisodeSchema = z.object({
  id: z.number(),
  name: z.string().optional().default(''),
  overview: z.string().optional().default(''),
  episode_number: optionalNumber,
  season_number: optionalNumber,
  still_path: nullableString,
  air_date: nullableString,
  runtime: nullableNumber,
  vote_average: nullableNumber,
}).passthrough();

export const TmdbSeasonDetailSchema = z.object({
  id: z.number(),
  name: z.string().optional().default(''),
  season_number: optionalNumber,
  air_date: nullableString,
  episode_count: optionalNumber,
  overview: z.string().optional().default(''),
  poster_path: nullableString,
  episodes: z.array(TmdbEpisodeSchema).optional().default([]),
}).passthrough();

// ──────────────────────────────────────────────────────────────
// Credits schema
// ──────────────────────────────────────────────────────────────

export const TmdbPersonSchema = z.object({
  id: z.number(),
  name: z.string().optional().default(''),
  profile_path: nullableString,
  adult: optionalBool,
}).passthrough();

export const TmdbCastSchema = TmdbPersonSchema.extend({
  character: nullableString,
  cast_id: optionalNumber,
  order: optionalNumber,
  credit_id: z.string().optional().default(''),
}).passthrough();

export const TmdbCrewSchema = TmdbPersonSchema.extend({
  department: z.string().optional().default(''),
  job: z.string().optional().default(''),
  credit_id: z.string().optional().default(''),
}).passthrough();

export const TmdbCreditsSchema = z.object({
  id: z.number(),
  cast: z.array(TmdbCastSchema).optional().default([]),
  crew: z.array(TmdbCrewSchema).optional().default([]),
}).passthrough();

// ──────────────────────────────────────────────────────────────
// Videos schema
// ──────────────────────────────────────────────────────────────

export const TmdbVideoSchema = z.object({
  id: z.string().optional().default(''),
  key: z.string().optional().default(''),
  name: z.string().optional().default(''),
  site: z.string().optional().default(''),
  type: z.string().optional().default(''),
  official: optionalBool,
  published_at: z.string().optional().default(''),
}).passthrough();

export const TmdbVideosResponseSchema = z.object({
  id: z.number(),
  results: z.array(TmdbVideoSchema).optional().default([]),
}).passthrough();

// ──────────────────────────────────────────────────────────────
// Paginated list responses
// ──────────────────────────────────────────────────────────────

export const TmdbPaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    page: z.number().optional().default(1),
    results: z.array(itemSchema).optional().default([]),
    total_pages: z.number().optional().default(1),
    total_results: z.number().optional().default(0),
  }).passthrough();

export const TmdbMovieListSchema = TmdbPaginatedResponseSchema(TmdbMovieSchema);
export const TmdbTvListSchema = TmdbPaginatedResponseSchema(TmdbTvShowSchema);

// ──────────────────────────────────────────────────────────────
// Genre list response
// ──────────────────────────────────────────────────────────────

export const TmdbGenreListResponseSchema = z.object({
  genres: z.array(TmdbGenreSchema).optional().default([]),
}).passthrough();

// ──────────────────────────────────────────────────────────────
// Multi search
// ──────────────────────────────────────────────────────────────

export const TmdbSearchResultSchema = z.discriminatedUnion('media_type', [
  TmdbMovieSchema.extend({ media_type: z.literal('movie') }),
  TmdbTvShowSchema.extend({ media_type: z.literal('tv') }),
  TmdbPersonSchema.extend({
    media_type: z.literal('person'),
    known_for: z.array(TmdbMovieSchema).optional().default([]),
  }),
]);

export const TmdbSearchMultiResponseSchema = TmdbPaginatedResponseSchema(TmdbSearchResultSchema);
