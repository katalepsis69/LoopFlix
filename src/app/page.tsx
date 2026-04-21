import { Suspense } from "react";
import {
  getTrendingMovies,
  getTrendingTv,
  getNowPlayingMovies,
  getUpcomingMovies,
  getTopRatedMovies,
  getTopRatedTv,
  movieToMediaItem,
  tvToMediaItem,
} from "@/lib/tmdb";
import type { MediaItem } from "@/lib/tmdb/types";
import HomeClient from "@/components/pages/HomeClient";

// Revalidate every 5 minutes
export const revalidate = 300;

async function getHomeData() {
  const [trendingMovies, trendingTv, nowPlaying, upcoming, topRatedMovies, topRatedTv] =
    await Promise.all([
      getTrendingMovies("week").catch(() => ({ results: [] as any[] })),
      getTrendingTv("week").catch(() => ({ results: [] as any[] })),
      getNowPlayingMovies().catch(() => ({ results: [] as any[] })),
      getUpcomingMovies().catch(() => ({ results: [] as any[] })),
      getTopRatedMovies().catch(() => ({ results: [] as any[] })),
      getTopRatedTv().catch(() => ({ results: [] as any[] })),
    ]);

  // Combine and sort trending for hero slideshow
  const heroItems: MediaItem[] = [
    ...trendingMovies.results.slice(0, 5).map(movieToMediaItem),
    ...trendingTv.results.slice(0, 3).map(tvToMediaItem),
  ].sort((a, b) => (b.rating || 0) - (a.rating || 0));

  return {
    heroItems,
    nowPlaying: nowPlaying.results.slice(0, 20).map(movieToMediaItem),
    upcoming: upcoming.results.slice(0, 20).map(movieToMediaItem),
    topRatedMovies: topRatedMovies.results.slice(0, 20).map(movieToMediaItem),
    trendingTv: trendingTv.results.slice(0, 20).map(tvToMediaItem),
    topRatedTv: topRatedTv.results.slice(0, 20).map(tvToMediaItem),
  };
}

export async function generateMetadata() {
  return {
    title: "LoopFlix // Archive — Browse & Stream Movies & TV",
    description:
      "Discover trending movies, TV series, and cinematic records. Browse top rated films, upcoming releases, and more.",
    openGraph: {
      title: "LoopFlix // Archive",
      description: "Discover trending movies, TV series, and cinematic records.",
    },
  };
}

export default async function HomePage() {
  const data = await getHomeData();

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-[#E4002B] text-xs tracking-[0.3em] font-mono animate-pulse">
            LOADING ARCHIVE...
          </div>
        </div>
      }
    >
      <HomeClient {...data} />
    </Suspense>
  );
}
