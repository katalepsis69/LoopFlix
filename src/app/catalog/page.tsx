import CatalogClient from "@/components/pages/CatalogClient";
import {
  getTrendingMovies,
  getPopularMovies,
  getTopRatedMovies,
  getNowPlayingMovies,
  getUpcomingMovies,
  getTrendingTv,
  getPopularTv,
  getTopRatedTv,
  searchMovies,
  searchTv,
  discoverMovies,
  discoverTv,
  movieToMediaItem,
  tvToMediaItem,
} from "@/lib/tmdb/api";
import { TV_GENRE_ID_MAP, GENRE_ID_MAP } from "@/lib/tmdb/config";
import type { MediaItem } from "@/lib/tmdb/types";

export const revalidate = 60; // 1 minute for search/catalog

interface CatalogPageProps {
  searchParams: Promise<{
    q?: string;
    type?: string;
    genre?: string;
    sort?: string;
    page?: string;
    yf?: string;
    yt?: string;
    r?: string;
    lang?: string;
  }>;
}

async function getCatalogData(params: Awaited<CatalogPageProps["searchParams"]>) {
  const {
    q = "",
    type = "movie",
    genre = "",
    sort = "trending",
    page = "1",
    yf = "",
    yt = "",
    r = "",
    lang = "",
  } = params;

  const pageNum = Math.max(1, Math.min(1000, parseInt(page) || 1));
  const isTv = type === "tv";

  let items: MediaItem[] = [];
  let totalPages = 1;
  let totalResults = 0;

  try {
    let data: any;

    if (q) {
      // Search
      data = isTv ? await searchTv(q, pageNum) : await searchMovies(q, pageNum);
      items = data.results.map(isTv ? tvToMediaItem : movieToMediaItem);
    } else if (genre) {
      // Discover with genre
      const genreMap = isTv ? TV_GENRE_ID_MAP : GENRE_ID_MAP;
      const genreId = genreMap[genre.toUpperCase()] || "";
      const discoverFn = isTv ? discoverTv : discoverMovies;

      data = await discoverFn({
        page: pageNum,
        sort_by: sort || undefined,
        with_genres: genreId ? String(genreId) : undefined,
        with_original_language: lang || undefined,
        vote_average_gte: r ? parseFloat(r) : undefined,
        ...(yf ? { primary_release_year: Number(yf) } : yt ? { primary_release_year: Number(yt) } : {}),
      });

      items = data.results.map(isTv ? tvToMediaItem : movieToMediaItem);
    } else {
      // Browse by sort
      const sortKey = sort || "trending";
      const fetchFns: Record<string, any> = isTv
        ? {
            trending: () => getTrendingTv("week", pageNum),
            popular: () => getPopularTv(pageNum),
            top_rated: () => getTopRatedTv(pageNum),
          }
        : {
            trending: () => getTrendingMovies("week", pageNum),
            popular: () => getPopularMovies(pageNum),
            top_rated: () => getTopRatedMovies(pageNum),
            now_playing: () => getNowPlayingMovies(pageNum),
            upcoming: () => getUpcomingMovies(pageNum),
          };

      const fn = fetchFns[sortKey] || fetchFns.trending;
      data = await fn();
      items = data.results.map(isTv ? tvToMediaItem : movieToMediaItem);
    }

    totalPages = data?.total_pages || 1;
    totalResults = data?.total_results || 0;
  } catch (err) {
    console.error("[Catalog] Failed to fetch:", err);
  }

  return {
    items,
    totalPages: Math.min(totalPages, 500), // TMDB max 500 pages
    totalResults,
    currentPage: pageNum,
    filters: { q, type, genre, sort, yf, yt, r, lang, page },
  };
}

export async function generateMetadata({
  searchParams,
}: CatalogPageProps) {
  const params = await searchParams;
  const type = params.type === "tv" ? "TV Shows" : "Movies";
  const title = params.q
    ? `Search: "${params.q}" — LoopFlix`
    : `${type} Catalog — LoopFlix`;
  return {
    title,
    description: `Browse and discover ${type.toLowerCase()}. Filter by genre, year, rating, and more.`,
  };
}

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const params = await searchParams;
  const data = await getCatalogData(params);

  return <CatalogClient initialData={data} />;
}
