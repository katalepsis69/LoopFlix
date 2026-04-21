'use client';
import { useState, useEffect, useCallback } from 'react';
import { useQueryStates, parseAsString, parseAsInteger } from 'nuqs';

export const MOVIE_SORT_OPTIONS = [
  { key: 'trending', label: 'TRENDING' },
  { key: 'popular', label: 'POPULAR' },
  { key: 'top_rated', label: 'TOP RATED' },
  { key: 'now_playing', label: 'NOW PLAYING' },
  { key: 'upcoming', label: 'UPCOMING' },
] as const;

export const TV_SORT_OPTIONS = [
  { key: 'trending', label: 'TRENDING' },
  { key: 'popular', label: 'POPULAR' },
  { key: 'top_rated', label: 'TOP RATED' },
] as const;

export type SortKey = string;

export const MOVIE_GENRES = ['ALL','ACTION','ADVENTURE','ANIMATION','COMEDY','CRIME','DOCUMENTARY','DRAMA','FAMILY','FANTASY','HISTORY','HORROR','MUSIC','MYSTERY','ROMANCE','SCI-FI','THRILLER','WAR','WESTERN'] as const;
export const TV_GENRES = ['ALL','ACTION & ADVENTURE','ANIMATION','COMEDY','CRIME','DOCUMENTARY','DRAMA','FAMILY','HORROR','KIDS','MYSTERY','NEWS','REALITY','ROMANCE','SCI-FI & FANTASY','SOAP','TALK','WAR & POLITICS','WESTERN'] as const;

export const LANGUAGE_OPTIONS = [
  { code: '', label: 'ALL LANGUAGES' }, { code: 'en', label: 'ENGLISH' }, { code: 'ja', label: 'JAPANESE' },
  { code: 'ko', label: 'KOREAN' }, { code: 'zh', label: 'CHINESE' }, { code: 'es', label: 'SPANISH' },
  { code: 'fr', label: 'FRENCH' }, { code: 'de', label: 'GERMAN' }, { code: 'pt', label: 'PORTUGUESE' },
  { code: 'it', label: 'ITALIAN' }, { code: 'hi', label: 'HINDI' }, { code: 'th', label: 'THAI' },
  { code: 'ru', label: 'RUSSIAN' }, { code: 'tr', label: 'TURKISH' }, { code: 'pl', label: 'POLISH' },
  { code: 'nl', label: 'DUTCH' }, { code: 'sv', label: 'SWEDISH' }, { code: 'da', label: 'DANISH' },
  { code: 'nb', label: 'NORWEGIAN' },
] as const;

export const YEAR_MIN = 1950;
export const YEAR_MAX = new Date().getFullYear() + 2;

const sortParser = parseAsString.withDefault('trending');
const genreParser = parseAsString.withDefault('ALL');
const typeParser = parseAsString.withDefault('movie');
const pageParser = parseAsInteger.withDefault(1);
const queryParser = parseAsString.withDefault('');
const yearFromParser = parseAsInteger.withDefault(YEAR_MIN);
const yearToParser = parseAsInteger.withDefault(YEAR_MAX);
const ratingParser = parseAsInteger.withDefault(0);
const langParser = parseAsString.withDefault('');

export function useCatalogParams() {
  const [urlParams, setUrlParams] = useQueryStates({
    q: queryParser, type: typeParser, genre: genreParser, sort: sortParser,
    page: pageParser, yf: yearFromParser, yt: yearToParser, r: ratingParser, lang: langParser,
  });

  const [searchInput, setSearchInput] = useState(urlParams.q);
  useEffect(() => { setSearchInput(urlParams.q); }, [urlParams.q]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== urlParams.q) setUrlParams({ q: searchInput || null, page: null });
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput, urlParams.q, setUrlParams]);

  const sortOptions = urlParams.type === 'tv' ? TV_SORT_OPTIONS : MOVIE_SORT_OPTIONS;
  const genreOptions = urlParams.type === 'tv' ? TV_GENRES : MOVIE_GENRES;
  const advancedActive = urlParams.yf !== YEAR_MIN || urlParams.yt !== YEAR_MAX || urlParams.r !== 0 || urlParams.lang !== '';

  const setMediaType = useCallback((type: string) => setUrlParams({ type, genre: null, sort: null, page: null }), [setUrlParams]);
  const setGenre = useCallback((genre: string) => setUrlParams({ genre, page: null }), [setUrlParams]);
  const setSort = useCallback((sort: string) => setUrlParams({ sort, page: null }), [setUrlParams]);
  const setPage = useCallback((page: number) => setUrlParams({ page: page > 1 ? page : null }), [setUrlParams]);
  const setYearFrom = useCallback((yf: number) => setUrlParams({ yf: yf !== YEAR_MIN ? yf : null, page: null }), [setUrlParams]);
  const setYearTo = useCallback((yt: number) => setUrlParams({ yt: yt !== YEAR_MAX ? yt : null, page: null }), [setUrlParams]);
  const setMinRating = useCallback((r: number) => setUrlParams({ r: r > 0 ? r : null, page: null }), [setUrlParams]);
  const setLanguage = useCallback((lang: string) => setUrlParams({ lang: lang || null, page: null }), [setUrlParams]);
  const clearAll = useCallback(() => { setUrlParams({ q: null, genre: null, sort: null, page: null, yf: null, yt: null, r: null, lang: null }); setSearchInput(''); }, [setUrlParams]);
  const clearAdvanced = useCallback(() => setUrlParams({ yf: null, yt: null, r: null, lang: null }), [setUrlParams]);

  return {
    query: urlParams.q, mediaType: urlParams.type as 'movie' | 'tv', genre: urlParams.genre,
    sort: urlParams.sort as SortKey, page: urlParams.page, yearFrom: urlParams.yf,
    yearTo: urlParams.yt, minRating: urlParams.r, language: urlParams.lang,
    sortOptions, genreOptions, advancedActive, searchInput, setSearchInput,
    setMediaType, setGenre, setSort, setPage, setYearFrom, setYearTo,
    setMinRating, setLanguage, clearAll, clearAdvanced,
  };
}
