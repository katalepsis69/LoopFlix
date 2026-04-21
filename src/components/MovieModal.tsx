'use client';
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { useUserStore } from '@/store/useUserStore';
import {
  getMovieDetails,
  getMovieCredits,
  getMovieVideos,
  getTvShowDetails,
  getTvShowCredits,
  getTvShowVideos,
  getSimilarMovies,
  getRecommendedMovies,
  getSimilarTvShows,
  getRecommendedTvShows,
  getSeasonDetails,
  movieDetailToMediaDetail,
  tvDetailToMediaDetail,
  movieToMediaItem,
  tvToMediaItem,
  getMovieEmbedUrl,
  getTvEmbedUrl,
  SERVERS,
  BACKDROP_SIZES,
  PROFILE_SIZES,
  POSTER_SIZES,
  GENRE_MAP,
  TV_GENRE_MAP,
} from '@/lib/tmdb/client';
import type { TmdbTvShowDetail, TmdbVideo, MediaItem, TmdbEpisode } from '../lib/tmdb/types';
import SignalLost from './SignalLost';
import ImageWithFallback from './ImageWithFallback';
import { useDeviceCapability, isDataSaverActive } from '../hooks/useDeviceCapability';
import { usePlaybackTracker, formatTime } from '../hooks/usePlaybackTracker';

const COMBINED_GENRE_MAP: Record<number, string> = { ...GENRE_MAP, ...TV_GENRE_MAP };

/** Season type from TV detail */
type TvSeason = TmdbTvShowDetail['seasons'] extends (infer U)[] | undefined ? U : never;

/** Related record card for similar/recommended items */
function RelatedCard({ item }: { item: MediaItem }) {
  const { setSelectedMedia } = useStore();
  const posterUrl = item.posterPath
    ? `https://image.tmdb.org/t/p/w300${item.posterPath}`
    : null;
  const displayYear = item.year || null;

  return (
    <motion.button
      onClick={() => setSelectedMedia(item)}
      className="flex-shrink-0 w-[110px] group text-left"
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.97 }}
    >
      {/* Poster */}
      <div className="relative w-[110px] h-[165px] border border-[#222222] group-hover:border-[#E4002B]/50 transition-colors overflow-hidden">
        {posterUrl ? (
          <img
            src={posterUrl}
            alt={item.title}
            className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-[#1a1a1a] flex items-center justify-center">
            <span className="text-[#333333] text-lg">◆</span>
          </div>
        )}
        {/* Rating badge */}
        {item.rating > 0 && (
          <div className="absolute top-1 right-1 bg-[#0A0A0A]/80 border border-[#333333] px-1.5 py-0.5">
            <span className="text-[9px] text-[#888888] font-mono">
              {Math.round(item.rating * 10)}%
            </span>
          </div>
        )}
        {/* Type badge */}
        <div className="absolute bottom-1 left-1 bg-[#0A0A0A]/80 border border-[#333333] px-1.5 py-0.5">
          <span className={`text-[8px] tracking-wider font-mono ${item.mediaType === 'tv' ? 'text-[#E4002B]' : 'text-[#555555]'}`}>
            {item.mediaType === 'tv' ? 'TV' : 'FILM'}
          </span>
        </div>
      </div>
      {/* Title + year */}
      <div className="mt-1.5 px-0.5">
        <p className="text-[10px] text-[#888888] truncate group-hover:text-[#CCCCCC] transition-colors leading-tight">
          {item.title}
        </p>
        {displayYear && (
          <p className="text-[9px] text-[#444444] font-mono mt-0.5">{displayYear}</p>
        )}
      </div>
    </motion.button>
  );
}

/** Key crew roles to display */
const KEY_CREW_ROLES = [
  { job: 'Director', label: 'DIRECTOR' },
  { job: 'Writer', label: 'WRITER' },
  { job: 'Screenplay', label: 'SCREENPLAY' },
  { job: 'Creator', label: 'CREATOR' },
  { job: 'Music', label: 'COMPOSER' },
  { job: 'Director of Photography', label: 'CINEMATOGRAPHY' },
  { job: 'Editor', label: 'EDITOR' },
  { job: 'Executive Producer', label: 'EXEC. PRODUCER' },
];

export default function MovieModal() {
  const {
    selectedMedia,
    setSelectedMedia,
    mediaDetail,
    setMediaDetail,
    credits,
    setCredits,
    isDetailLoading,
    setIsDetailLoading,
    isPlayerActive,
    setIsPlayerActive,
  } = useStore();

  // User data
  const isInWatchlist = useUserStore((s) => selectedMedia ? s.isInWatchlist(selectedMedia.id, selectedMedia.mediaType) : false);
  const addToWatchlist = useUserStore((s) => s.addToWatchlist);
  const removeFromWatchlist = useUserStore((s) => s.removeFromWatchlist);
  const userRating = useUserStore((s) => selectedMedia ? s.getRating(selectedMedia.id, selectedMedia.mediaType) : undefined);
  const setRating = useUserStore((s) => s.setRating);
  const removeRating = useUserStore((s) => s.removeRating);
  const addToRecentlyViewed = useUserStore((s) => s.addToRecentlyViewed);
  const collections = useUserStore((s) => s.collections);
  const addToCollection = useUserStore((s) => s.addToCollection);
  const getItemsInCollections = useUserStore((s) => s.getItemsInCollections);
  const getWatchProgress = useUserStore((s) => s.getWatchProgress);
  const removeWatchProgress = useUserStore((s) => s.removeWatchProgress);

  const [userRatingHover, setUserRatingHover] = useState(0);
  const [showCollectionsMenu, setShowCollectionsMenu] = useState(false);
  const [showReviewInput, setShowReviewInput] = useState(false);
  const [reviewText, setReviewText] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedEpisode, setSelectedEpisode] = useState(1);
  const [videos, setVideos] = useState<TmdbVideo[]>([]);
  const [showTrailer, setShowTrailer] = useState(false);
  const [showAllCast, setShowAllCast] = useState(false);
  const [similar, setSimilar] = useState<MediaItem[]>([]);
  const [recommended, setRecommended] = useState<MediaItem[]>([]);
  const [seasonEpisodes, setSeasonEpisodes] = useState<TmdbEpisode[]>([]);
  const [seasonLoading, setSeasonLoading] = useState(false);
  const [episodePage, setEpisodePage] = useState(1);
  const EPISODES_PER_PAGE = 24;

  // Collapsible sections
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const toggleSection = (id: string) => setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));

  // Scroll refs
  const playerRef = useRef<HTMLDivElement>(null);
  const modalContentRef = useRef<HTMLDivElement>(null);

  // Fetch detail + credits + videos when a media item is selected
  useEffect(() => {
    if (!selectedMedia) {
      setMediaDetail(null);
      setCredits(null);
      setError(null);
      setIsPlayerActive(false);
      setVideos([]);
      setShowTrailer(false);
      setShowAllCast(false);
      setSimilar([]);
      setRecommended([]);
      return;
    }

    // Reset season/episode state
    setSelectedSeason(1);
    setSelectedEpisode(1);
    setSeasonEpisodes([]);
    setEpisodePage(1);

    async function fetchDetail() {
      if (!selectedMedia) return;
      setIsDetailLoading(true);
      setError(null);
      try {
        if (selectedMedia.mediaType === 'tv') {
          const [detailData, creditsData, videosData, similarData, recData] = await Promise.all([
            getTvShowDetails(selectedMedia.id),
            getTvShowCredits(selectedMedia.id).catch(() => null),
            getTvShowVideos(selectedMedia.id).catch(() => ({ results: [] as any[] })),
            getSimilarTvShows(selectedMedia.id).catch(() => ({ results: [] as any[] })),
            getRecommendedTvShows(selectedMedia.id).catch(() => ({ results: [] as any[] })),
          ]);
          setMediaDetail(tvDetailToMediaDetail(detailData));
          setCredits(creditsData);
          setVideos(videosData?.results ?? []);
          setSimilar((similarData?.results ?? []).map(tvToMediaItem));
          setRecommended((recData?.results ?? []).map(tvToMediaItem));
        } else {
          const [detailData, creditsData, videosData, similarData, recData] = await Promise.all([
            getMovieDetails(selectedMedia.id),
            getMovieCredits(selectedMedia.id).catch(() => null),
            getMovieVideos(selectedMedia.id).catch(() => ({ results: [] as any[] })),
            getSimilarMovies(selectedMedia.id).catch(() => ({ results: [] as any[] })),
            getRecommendedMovies(selectedMedia.id).catch(() => ({ results: [] as any[] })),
          ]);
          setMediaDetail(movieDetailToMediaDetail(detailData));
          setCredits(creditsData);
          setVideos(videosData?.results ?? []);
          setSimilar((similarData?.results ?? []).map(movieToMediaItem));
          setRecommended((recData?.results ?? []).map(movieToMediaItem));
        }
      } catch (err) {
        console.error('Failed to fetch detail:', err);
        setError('SIGNAL LOST — UNABLE TO RETRIEVE RECORD');
      } finally {
        setIsDetailLoading(false);
        // Track recently viewed
        if (selectedMedia) {
          addToRecentlyViewed({
            id: selectedMedia.id,
            mediaType: selectedMedia.mediaType,
            title: selectedMedia.title,
            posterPath: selectedMedia.posterPath,
            year: selectedMedia.year,
          });
        }
      }
    }
    fetchDetail();
  }, [selectedMedia, setMediaDetail, setCredits, setIsDetailLoading, setIsPlayerActive]);

  // Fetch season episodes when season changes (TV only)
  useEffect(() => {
    if (!selectedMedia || selectedMedia.mediaType !== 'tv') {
      setSeasonEpisodes([]);
      return;
    }
    async function fetchSeason() {
      if (!selectedMedia) return;
      setSeasonLoading(true);
      try {
        const data = await getSeasonDetails(selectedMedia.id, selectedSeason);
        setSeasonEpisodes(data.episodes ?? []);
      } catch (err) {
        console.error('Failed to fetch season:', err);
        setSeasonEpisodes([]);
      } finally {
        setSeasonLoading(false);
      }
    }
    fetchSeason();
  }, [selectedMedia, selectedSeason]);

  // Paginated episodes
  const paginatedEpisodes = useMemo(() => {
    const start = (episodePage - 1) * EPISODES_PER_PAGE;
    return seasonEpisodes.slice(start, start + EPISODES_PER_PAGE);
  }, [seasonEpisodes, episodePage, EPISODES_PER_PAGE]);
  const totalEpisodePages = Math.ceil(seasonEpisodes.length / EPISODES_PER_PAGE);

  const close = useCallback(() => {
    setSelectedMedia(null);
    setIsPlayerActive(false);
    setShowTrailer(false);
  }, [setSelectedMedia, setIsPlayerActive]);

  // Escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [close]);

  // Scroll to player when playback starts
  useEffect(() => {
    if (isPlayerActive && playerRef.current && modalContentRef.current) {
      setTimeout(() => {
        const container = modalContentRef.current;
        const player = playerRef.current;
        if (container && player) {
          const offset = player.offsetTop - container.offsetTop - 10;
          container.scrollTo({ top: offset, behavior: 'smooth' });
        }
      }, 300);
    }
  }, [isPlayerActive]);

  // Device capability for performance-aware rendering
  const { tier } = useDeviceCapability();

  // Tier-based image sizes
  const BACKDROP_TIER: Record<string, string> = { high: BACKDROP_SIZES.w1280, medium: BACKDROP_SIZES.w780, low: BACKDROP_SIZES.w300, ultra_low: BACKDROP_SIZES.w300 };
  const POSTER_TIER: Record<string, string> = { high: POSTER_SIZES.w500, medium: POSTER_SIZES.w342, low: POSTER_SIZES.w185, ultra_low: POSTER_SIZES.w185 };
  const dataSaver = isDataSaverActive();
  const backdropSize = dataSaver ? BACKDROP_SIZES.w780 : BACKDROP_TIER[tier];
  const posterSize = dataSaver ? POSTER_SIZES.w185 : POSTER_TIER[tier];

  const backdropUrl = mediaDetail?.backdropPath
    ? `${backdropSize}${mediaDetail.backdropPath}`
    : selectedMedia?.backdropPath
      ? `${backdropSize}${selectedMedia.backdropPath}`
      : null;

  const posterUrl = mediaDetail?.posterPath
    ? `${posterSize}${mediaDetail.posterPath}`
    : selectedMedia?.posterPath
      ? `${posterSize}${selectedMedia.posterPath}`
      : null;

  // Find best trailer
  const trailer = useMemo(() => {
    const ytVideos = videos.filter((v) => (v.site ?? '').toLowerCase() === 'youtube');
    // Prefer official trailer
    const officialTrailer = ytVideos.find(
      (v) => v.official && (v.type ?? '').toLowerCase() === 'trailer'
    );
    if (officialTrailer) return officialTrailer;
    // Any trailer
    const anyTrailer = ytVideos.find((v) => (v.type ?? '').toLowerCase() === 'trailer');
    if (anyTrailer) return anyTrailer;
    // Any official video
    const anyOfficial = ytVideos.find((v) => v.official);
    if (anyOfficial) return anyOfficial;
    // First YouTube video
    return ytVideos[0] ?? null;
  }, [videos]);

  // Additional videos (teasers, behind the scenes, etc.)
  const otherVideos = useMemo(
    () => videos.filter((v) => v !== trailer && (v.site ?? '').toLowerCase() === 'youtube').slice(0, 6),
    [videos, trailer]
  );

  // Key crew extraction
  const keyCrew = useMemo(() => {
    if (!credits?.crew) return [];
    const found: { name: string; job: string; label: string; profilePath: string | null }[] = [];
    for (const role of KEY_CREW_ROLES) {
      const people = credits.crew.filter((c) => c.job === role.job);
      for (const person of people) {
        if (!found.find((f) => f.name === person.name && f.job === person.job)) {
          found.push({
            name: person.name,
            job: person.job,
            label: role.label,
            profilePath: person.profile_path ?? null,
          });
        }
      }
      if (found.length >= 8) break;
    }
    return found;
  }, [credits]);

  // For TV, also add creators as key crew
  const tvCreators = useMemo(() => {
    if (selectedMedia?.mediaType !== 'tv' || !mediaDetail) return [];
    return ((mediaDetail as any).createdBy ?? []).map((c: any) => ({
      name: c.name ?? '',
      label: 'CREATOR',
      profilePath: c.profile_path ?? null,
    }));
  }, [selectedMedia, mediaDetail]);

  const allKeyCrew = useMemo(() => {
    if (tvCreators.length > 0) {
      // For TV, show creators first, then crew
      return [...tvCreators, ...keyCrew.filter((k) => k.label !== 'CREATOR')].slice(0, 8);
    }
    return keyCrew;
  }, [tvCreators, keyCrew]);

  const director = credits?.crew?.find((c) => c.job === 'Director')?.name;
  const creator = selectedMedia?.mediaType === 'tv' && (mediaDetail as any)?.createdBy?.[0]?.name;

  const castList = credits?.cast ?? [];
  const displayedCast = showAllCast ? castList : castList.slice(0, 12);

  const genreLabels =
    mediaDetail?.genres?.map((g) => g.name.toUpperCase()) ??
    selectedMedia?.genres?.map((id) => COMBINED_GENRE_MAP[id]).filter(Boolean) ??
    [];

  // Build embed URL based on media type
  const isTv = selectedMedia?.mediaType === 'tv';

  // Watch progress for resume
  const savedProgress = selectedMedia
    ? isTv
      ? getWatchProgress(selectedMedia.id, selectedMedia.mediaType, selectedSeason, selectedEpisode)
      : getWatchProgress(selectedMedia.id, selectedMedia.mediaType)
    : undefined;

  // Selected server from store
  const selectedServer = useStore((s) => s.selectedServer);

  // Build raw embed URL with resume position + selected server
  const rawEmbedUrl = selectedMedia
    ? isTv
      ? getTvEmbedUrl(selectedMedia.id, selectedSeason, selectedEpisode, selectedServer, {
          progress: savedProgress?.currentTime && savedProgress.currentTime > 10
            ? Math.floor(savedProgress.currentTime)
            : undefined,
        })
      : getMovieEmbedUrl(selectedMedia.id, selectedServer, {
          progress: savedProgress?.currentTime && savedProgress.currentTime > 10
            ? Math.floor(savedProgress.currentTime)
            : undefined,
        })
    : null;

  // Playback tracker — listens to vidking postMessage events
  const playerStateRef = usePlaybackTracker({
    mediaId: selectedMedia?.id ?? 0,
    mediaType: selectedMedia?.mediaType ?? 'movie',
    title: selectedMedia?.title ?? '',
    posterPath: selectedMedia?.posterPath ?? null,
    season: isTv ? selectedSeason : undefined,
    episode: isTv ? selectedEpisode : undefined,
    enabled: isPlayerActive && !!selectedMedia,
  });

  // TV season data
  const seasons: TvSeason[] = (mediaDetail as any)?.seasons ?? [];
  const numberOfSeasons = (mediaDetail as any)?.numberOfSeasons ?? 0;

  return (
    <AnimatePresence>
      {selectedMedia && (
        <>
          {/* Backdrop */}
          <motion.div
            className={`fixed inset-0 z-50 ${tier === 'high' ? 'bg-[#0A0A0A]/90 backdrop-blur-sm' : 'bg-[#0A0A0A]'}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              ref={modalContentRef}
              className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto bg-[#111111] border border-[#333333] pointer-events-auto scrollbar-thin"
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.5 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={close}
                className="absolute top-4 right-4 z-20 w-8 h-8 flex items-center justify-center border border-[#333333] bg-[#0A0A0A]/80 text-[#666666] hover:text-[#E4002B] hover:border-[#E4002B] transition-colors"
              >
                ✕
              </button>

              {/* ─── PLAYER SECTION ─── */}
              <div ref={playerRef} />
              {isPlayerActive && (
                <motion.div
                  className="relative w-full bg-[#000000]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {/* LoopFlix corner bracket frame */}
                  <div className="relative">
                    {/* Corner brackets */}
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-[#E4002B]/40 z-10 pointer-events-none" />
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-[#E4002B]/40 z-10 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-[#E4002B]/40 z-10 pointer-events-none" />
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-[#E4002B]/40 z-10 pointer-events-none" />

                    {/* Scanline overlay */}
                    {tier === 'high' && (
                      <div
                        className="absolute inset-0 pointer-events-none z-10 opacity-[0.03]"
                        style={{
                          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(228,0,43,0.15) 2px, rgba(228,0,43,0.15) 4px)',
                        }}
                      />
                    )}

                    {/* Direct iframe embed */}
                    {rawEmbedUrl && (
                      <iframe
                        src={rawEmbedUrl}
                        width="100%"
                        height="500"
                        frameBorder="0"
                        allowFullScreen
                        allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                        sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-presentation"
                        referrerPolicy="no-referrer"
                        className="w-full"
                        title={`Player - ${selectedMedia.title}`}
                      />
                    )}
                  </div>

                  {/* Progress bar */}
                  {playerStateRef.current && playerStateRef.current.progress > 0 && (
                    <div className="w-full h-1 bg-[#1a1a1a]">
                      <div
                        className="h-full bg-[#E4002B] transition-all duration-1000"
                        style={{ width: `${Math.min(playerStateRef.current.progress, 100)}%` }}
                      />
                    </div>
                  )}

                  {/* Server Selection Tabs */}
                  {SERVERS.length > 1 && (
                    <div className="flex items-center gap-1 px-3 py-2 bg-[#0A0A0A] border-b border-[#1a1a1a]">
                      <span className="text-[9px] text-[#444444] tracking-[0.3em] mr-2">SERVER:</span>
                      {SERVERS.map((server) => (
                        <button
                          key={server.id}
                          onClick={() => {
                            useStore.getState().setSelectedServer(server.id);
                          }}
                          className={`px-3 py-1 text-[10px] tracking-[0.2em] border transition-all ${
                            selectedServer === server.id
                              ? 'border-[#E4002B] text-[#E4002B] bg-[#E4002B]/10'
                              : 'border-[#222222] text-[#444444] hover:border-[#E4002B]/30 hover:text-[#666666]'
                          }`}
                        >
                          {server.name.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Player controls bar */}
                  <div className="flex items-center justify-between px-4 py-2 bg-[#0d0d0d] border-t border-[#1a1a1a]">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-[#E4002B] animate-pulse" />
                      <span className="text-[10px] text-[#666666] tracking-[0.3em]">PLAYBACK ACTIVE</span>
                      {isTv && (
                        <span className="text-[10px] text-[#444444] tracking-wider">
                          S{String(selectedSeason).padStart(2, '0')}E{String(selectedEpisode).padStart(2, '0')}
                        </span>
                      )}
                      {playerStateRef.current && playerStateRef.current.duration > 0 && (
                        <span className="text-[10px] text-[#444444] tracking-wider font-mono">
                          {formatTime(playerStateRef.current.currentTime)} / {formatTime(playerStateRef.current.duration)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      {savedProgress && savedProgress.progress > 0 && (
                        <span className="text-[9px] text-[#E4002B]/60 tracking-wider">
                          ◆ RESUMED FROM {formatTime(savedProgress.currentTime)}
                        </span>
                      )}
                      <button
                        onClick={() => setIsPlayerActive(false)}
                        className="text-[10px] text-[#666666] tracking-[0.2em] hover:text-[#E4002B] transition-colors"
                      >
                        CLOSE PLAYER ✕
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ─── HEADER SECTION ─── */}
              {!isPlayerActive && (
                <div className="relative aspect-[21/9] bg-[#0d0d0d] overflow-hidden">
                  {showTrailer && trailer ? (
                    /* YouTube Trailer Embed */
                    <div className="relative w-full h-full">
                      <iframe
                        src={`https://www.youtube.com/embed/${trailer.key}?autoplay=1&modestbranding=1&rel=0`}
                        width="100%"
                        height="100%"
                        frameBorder="0"
                        allowFullScreen
                        allow="autoplay; encrypted-media"
                        className="w-full h-full"
                        title={`Trailer - ${mediaDetail?.title ?? selectedMedia.title}`}
                      />
                      {/* LoopFlix frame overlay */}
                      <div className="absolute inset-0 pointer-events-none border border-[#E4002B]/10" />
                      <div
                        className="absolute inset-0 pointer-events-none opacity-[0.03]"
                        style={{
                          backgroundImage:
                            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(228,0,43,0.15) 2px, rgba(228,0,43,0.15) 4px)',
                        }}
                      />
                      {/* Close trailer button */}
                      <button
                        onClick={() => setShowTrailer(false)}
                        className="absolute top-3 right-3 z-10 px-3 py-1.5 bg-[#0A0A0A]/90 border border-[#333333] text-[10px] text-[#666666] tracking-[0.2em] hover:text-[#E4002B] hover:border-[#E4002B] transition-colors"
                      >
                        CLOSE TRAILER ✕
                      </button>
                      {/* Live indicator */}
                      <div className="absolute top-3 left-3 z-10 flex items-center gap-2 px-2 py-1 bg-[#0A0A0A]/90 border border-[#1a1a1a]">
                        <div className="w-1.5 h-1.5 bg-[#E4002B] animate-pulse" />
                        <span className="text-[9px] text-[#E4002B] tracking-[0.3em]">OFFICIAL TRAILER</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <ImageWithFallback
                        src={backdropUrl}
                        alt=""
                        className="w-full h-full object-cover opacity-50"
                        fallbackClassName="w-full h-full bg-gradient-to-br from-[#1a0a0a] to-[#0a0a1a]"
                        fallbackText=""
                        fallbackIcon=""
                      />
                      <div
                        className="absolute inset-0 opacity-10"
                        style={{
                          backgroundImage:
                            'linear-gradient(rgba(228,0,43,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(228,0,43,0.3) 1px, transparent 1px)',
                          backgroundSize: '30px 30px',
                        }}
                      />
                      <div className="absolute bottom-0 left-0 right-0 h-2/3 bg-gradient-to-t from-[#111111] to-transparent" />

                      {/* Play Trailer overlay button */}
                      {trailer && (
                        <motion.button
                          onClick={() => setShowTrailer(true)}
                          className="absolute inset-0 flex items-center justify-center z-10 group"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="flex flex-col items-center">
                            {/* Pulse ring */}
                            <div className="relative w-16 h-16">
                              <div className="absolute inset-0 rounded-full border border-[#E4002B]/30 animate-ping" />
                              <div className="w-full h-full rounded-full border-2 border-[#E4002B]/60 bg-[#0A0A0A]/70 flex items-center justify-center group-hover:bg-[#E4002B]/20 transition-colors">
                                <svg
                                  className="w-5 h-5 text-[#E4002B] ml-0.5"
                                  fill="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                              </div>
                            </div>
                            <span className="mt-3 text-[9px] text-[#E4002B]/70 tracking-[0.3em] font-mono uppercase text-center">
                              PLAY TRAILER
                            </span>
                          </div>
                        </motion.button>
                      )}

                      {/* Archive reference */}
                      <div className="absolute top-4 left-4 text-[10px] text-[#E4002B]/60 tracking-[0.3em] font-mono">
                        REF::ARC-{String(selectedMedia.id).padStart(3, '0')}//{selectedMedia.year}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ─── CONTENT ─── */}
              {isDetailLoading ? (
                <div className="p-6 md:p-8 space-y-4">
                  {/* Title skeleton */}
                  <div className="flex items-start gap-6 mb-3">
                    <div className="hidden md:block w-24 h-36 bg-[#1a1a1a] animate-pulse shrink-0" />
                    <div className="flex-1 space-y-3">
                      <div className="h-10 w-3/4 bg-[#1a1a1a] animate-pulse" />
                      <div className="h-4 w-1/2 bg-[#1a1a1a] animate-pulse" />
                      <div className="flex gap-2">
                        <div className="h-6 w-16 bg-[#1a1a1a] animate-pulse" />
                        <div className="h-6 w-16 bg-[#1a1a1a] animate-pulse" />
                        <div className="h-6 w-16 bg-[#1a1a1a] animate-pulse" />
                      </div>
                    </div>
                  </div>
                  <div className="h-px bg-[#1a1a1a]" />
                  {/* Cast skeleton */}
                  <div className="grid grid-cols-6 gap-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="space-y-2">
                        <div className="aspect-square bg-[#1a1a1a] animate-pulse" />
                        <div className="h-3 w-2/3 bg-[#1a1a1a] animate-pulse mx-auto" />
                      </div>
                    ))}
                  </div>
                </div>
              ) : error ? (
                <SignalLost
                  minimal
                  message={error}
                  code={`ERR_${selectedMedia.mediaType.toUpperCase()}_DETAIL`}
                  onRetry={() => {
                    const media = selectedMedia;
                    setSelectedMedia(null);
                    setTimeout(() => setSelectedMedia(media), 100);
                  }}
                  onDismiss={close}
                />
              ) : (
                <div className="p-6 md:p-8 -mt-12 relative">
                  {/* Title Block */}
                  <div className="mb-6">
                    <div className="flex items-start gap-6 mb-3">
                      {!isPlayerActive && (
                        <div className="hidden md:block shrink-0 w-24 border border-[#333333] overflow-hidden">
                          <ImageWithFallback
                            src={posterUrl}
                            alt={mediaDetail?.title ?? selectedMedia.title}
                            className="w-full aspect-[3/4] object-cover"
                            fallbackClassName="w-full aspect-[3/4]"
                          />
                        </div>
                      )}
                      <div className="flex-1">
                        <h2 className="text-2xl md:text-4xl text-[#E0E0E0] tracking-[0.1em] mb-2">
                          {mediaDetail?.title ?? selectedMedia.title}
                        </h2>
                        {mediaDetail?.tagline && (
                          <p className="text-[#E4002B]/60 text-xs tracking-[0.2em] italic mb-3">
                            &quot;{mediaDetail.tagline}&quot;
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="h-px bg-gradient-to-r from-[#E4002B]/50 to-transparent mb-4" />

                    {/* Meta Row */}
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                      <span className="text-[#E4002B] tracking-widest text-sm">
                        {mediaDetail?.year ?? selectedMedia.year}
                      </span>
                      <span className="text-[#333333]">|</span>
                      {mediaDetail?.runtime && (
                        <>
                          <span className="text-[#666666] tracking-wider text-sm">
                            {mediaDetail.runtime} MIN
                          </span>
                          <span className="text-[#333333]">|</span>
                        </>
                      )}
                      {isTv && (mediaDetail as any)?.numberOfSeasons ? (
                        <>
                          <span className="text-[#666666] tracking-wider text-sm">
                            {(mediaDetail as any).numberOfSeasons} SEASON{(mediaDetail as any).numberOfSeasons > 1 ? 'S' : ''}
                          </span>
                          <span className="text-[#333333]">|</span>
                        </>
                      ) : null}
                      {director && !isTv && (
                        <>
                          <span className="text-[#666666] tracking-wider text-sm">
                            DIR. {director.toUpperCase()}
                          </span>
                          <span className="text-[#333333]">|</span>
                        </>
                      )}
                      {creator && isTv && (
                        <>
                          <span className="text-[#666666] tracking-wider text-sm">
                            BY {creator.toUpperCase()}
                          </span>
                          <span className="text-[#333333]">|</span>
                        </>
                      )}
                      <span className="px-2 py-0.5 border border-[#333333] text-[#666666] text-[10px] tracking-widest">
                        {isTv ? 'TV SERIES' : 'FILM'}
                      </span>
                      {mediaDetail?.status && (
                        <span className="px-2 py-0.5 border border-[#1a1a1a] text-[#444444] text-[10px] tracking-widest">
                          {mediaDetail.status.toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* Genres */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {genreLabels.map((g: string) => (
                        <span
                          key={g}
                          className="px-3 py-1 border border-[#E4002B]/30 text-[#E4002B] text-[10px] tracking-[0.3em]"
                        >
                          {g}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Data Panel */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    {/* Synopsis */}
                    <div className="md:col-span-2">
                      <div className="text-[10px] text-[#E4002B] tracking-[0.3em] mb-3 flex items-center gap-2">
                        <div className="w-4 h-px bg-[#E4002B]" />
                        SYNOPSIS
                      </div>
                      <p className="text-[#888888] text-sm leading-relaxed">
                        {mediaDetail?.overview ?? selectedMedia.overview}
                      </p>
                    </div>

                    {/* Rating Panel */}
                    <div className="border border-[#222222] bg-[#0d0d0d] p-4">
                      <div className="text-[10px] text-[#E4002B] tracking-[0.3em] mb-3 flex items-center gap-2">
                        <div className="w-4 h-px bg-[#E4002B]" />
                        RATING
                      </div>
                      <div className="flex items-baseline gap-1 mb-3">
                        <span className="text-[#E0E0E0] text-3xl font-retro">
                          {(mediaDetail?.rating ?? selectedMedia.rating).toFixed(1)}
                        </span>
                        <span className="text-[#666666] text-sm">/10</span>
                      </div>
                      <div className="w-full h-1 bg-[#1a1a1a] overflow-hidden">
                        <motion.div
                          className="h-full bg-[#E4002B]"
                          initial={{ width: 0 }}
                          animate={{
                            width: `${(mediaDetail?.rating ?? selectedMedia.rating) * 10}%`,
                          }}
                          transition={{ duration: 1, delay: 0.3 }}
                        />
                      </div>
                      <div className="mt-2 text-[10px] text-[#444444] tracking-wider">
                        {(mediaDetail?.voteCount ?? selectedMedia.voteCount).toLocaleString()}{' '}
                        VOTES
                      </div>
                    </div>
                  </div>

                  {/* ─── TECHNICAL DATA PANEL ─── */}
                  <div className="mb-6 border border-[#1a1a1a] bg-[#0d0d0d]">
                    {/* Header */}
                    <button
                      onClick={() => toggleSection('technical')}
                      className="w-full px-4 py-2 border-b border-[#1a1a1a] flex items-center justify-between hover:bg-[#151515] transition-colors"
                    >
                      <div className="text-[10px] text-[#E4002B] tracking-[0.3em] flex items-center gap-2">
                        <span className="text-[8px]">{collapsed.technical ? '▶' : '▼'}</span>
                        <div className="w-4 h-px bg-[#E4002B]" />
                        TECHNICAL DATA
                      </div>
                      <span className="text-[10px] text-[#333333] tracking-[0.2em]">
                        {isTv ? 'SERIES' : 'FILM'} RECORD
                      </span>
                    </button>

                    {!collapsed.technical && (<div className="p-4">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3">
                        {/* Status */}
                        {mediaDetail?.status && (
                          <div>
                            <div className="text-[9px] text-[#444444] tracking-[0.3em] mb-1">STATUS</div>
                            <div className="text-[11px] text-[#B8B8B8] tracking-wider flex items-center gap-2">
                              <span className={`inline-block w-1.5 h-1.5 ${
                                mediaDetail.status === 'Released' || mediaDetail.status === 'Returning Series'
                                  ? 'bg-green-500'
                                  : mediaDetail.status === 'Post Production'
                                    ? 'bg-yellow-500'
                                    : 'bg-[#555555]'
                              }`} />
                              {mediaDetail.status.toUpperCase()}
                            </div>
                          </div>
                        )}

                        {/* Runtime */}
                        {mediaDetail?.runtime && (
                          <div>
                            <div className="text-[9px] text-[#444444] tracking-[0.3em] mb-1">
                              {isTv ? 'EP. RUNTIME' : 'RUNTIME'}
                            </div>
                            <div className="text-[11px] text-[#B8B8B8] tracking-wider">
                              {mediaDetail.runtime} MIN
                              {!isTv && mediaDetail.runtime >= 60 && (
                                <span className="text-[#555555] ml-1">
                                  ({Math.floor(mediaDetail.runtime / 60)}H {mediaDetail.runtime % 60}M)
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Original Language */}
                        {mediaDetail?.originalLanguage && (
                          <div>
                            <div className="text-[9px] text-[#444444] tracking-[0.3em] mb-1">LANGUAGE</div>
                            <div className="text-[11px] text-[#B8B8B8] tracking-wider">
                              {mediaDetail.originalLanguage}
                              {mediaDetail.spokenLanguages.length > 0 && (
                                <span className="text-[#555555] ml-1">
                                  (+{mediaDetail.spokenLanguages.length - 1} more)
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Budget (Movies only) */}
                        {!isTv && mediaDetail?.budget ? (
                          <div>
                            <div className="text-[9px] text-[#444444] tracking-[0.3em] mb-1">BUDGET</div>
                            <div className="text-[11px] text-[#B8B8B8] tracking-wider">
                              ${mediaDetail.budget.toLocaleString()}
                            </div>
                          </div>
                        ) : !isTv && mediaDetail ? (
                          <div>
                            <div className="text-[9px] text-[#444444] tracking-[0.3em] mb-1">BUDGET</div>
                            <div className="text-[11px] text-[#555555] tracking-wider">—</div>
                          </div>
                        ) : null}

                        {/* Revenue (Movies only) */}
                        {!isTv && mediaDetail?.revenue ? (
                          <div>
                            <div className="text-[9px] text-[#444444] tracking-[0.3em] mb-1">REVENUE</div>
                            <div className="text-[11px] text-[#B8B8B8] tracking-wider">
                              ${mediaDetail.revenue.toLocaleString()}
                            </div>
                          </div>
                        ) : !isTv && mediaDetail ? (
                          <div>
                            <div className="text-[9px] text-[#444444] tracking-[0.3em] mb-1">REVENUE</div>
                            <div className="text-[11px] text-[#555555] tracking-wider">—</div>
                          </div>
                        ) : null}

                        {/* Profit (Movies only) */}
                        {!isTv && mediaDetail?.budget && mediaDetail?.revenue ? (
                          <div>
                            <div className="text-[9px] text-[#444444] tracking-[0.3em] mb-1">PROFIT</div>
                            <div className={`text-[11px] tracking-wider ${
                              mediaDetail.revenue - mediaDetail.budget >= 0
                                ? 'text-green-400'
                                : 'text-[#E4002B]'
                            }`}>
                              ${(mediaDetail.revenue - mediaDetail.budget).toLocaleString()}
                            </div>
                          </div>
                        ) : null}

                        {/* Seasons (TV only) */}
                        {isTv && mediaDetail?.numberOfSeasons ? (
                          <div>
                            <div className="text-[9px] text-[#444444] tracking-[0.3em] mb-1">SEASONS</div>
                            <div className="text-[11px] text-[#B8B8B8] tracking-wider">
                              {mediaDetail.numberOfSeasons}
                            </div>
                          </div>
                        ) : null}

                        {/* Total Episodes (TV only) */}
                        {isTv && mediaDetail?.numberOfEpisodes ? (
                          <div>
                            <div className="text-[9px] text-[#444444] tracking-[0.3em] mb-1">EPISODES</div>
                            <div className="text-[11px] text-[#B8B8B8] tracking-wider">
                              {mediaDetail.numberOfEpisodes}
                            </div>
                          </div>
                        ) : null}

                        {/* Network (TV only) */}
                        {isTv && (mediaDetail as any)?.networks?.length > 0 && (
                          <div>
                            <div className="text-[9px] text-[#444444] tracking-[0.3em] mb-1">NETWORK</div>
                            <div className="text-[11px] text-[#B8B8B8] tracking-wider">
                              {(mediaDetail as any).networks.map((n: any) => n.name).join(', ')}
                            </div>
                          </div>
                        )}

                        {/* Origin Country (TV only) */}
                        {isTv && (mediaDetail as any)?.originCountry?.length > 0 && (
                          <div>
                            <div className="text-[9px] text-[#444444] tracking-[0.3em] mb-1">ORIGIN</div>
                            <div className="text-[11px] text-[#B8B8B8] tracking-wider">
                              {(mediaDetail as any).originCountry.join(', ')}
                            </div>
                          </div>
                        )}

                        {/* Collection */}
                        {!isTv && mediaDetail?.belongsToCollection && (
                          <div className="col-span-2 md:col-span-3">
                            <div className="text-[9px] text-[#444444] tracking-[0.3em] mb-1">COLLECTION</div>
                            <div className="text-[11px] text-[#B8B8B8] tracking-wider">
                              ◆ {mediaDetail.belongsToCollection.name}
                            </div>
                          </div>
                        )}

                        {/* Production Companies */}
                        {mediaDetail?.productionCompanies && mediaDetail.productionCompanies.length > 0 && (
                          <div className={mediaDetail.productionCompanies.length > 2 ? 'col-span-2 md:col-span-3' : ''}>
                            <div className="text-[9px] text-[#444444] tracking-[0.3em] mb-1">PRODUCTION</div>
                            <div className="text-[11px] text-[#B8B8B8] tracking-wider">
                              {mediaDetail.productionCompanies.map((c) => c.name).join(' · ')}
                            </div>
                          </div>
                        )}

                        {/* Spoken Languages */}
                        {mediaDetail?.spokenLanguages && mediaDetail.spokenLanguages.length > 1 && (
                          <div className="col-span-2 md:col-span-3">
                            <div className="text-[9px] text-[#444444] tracking-[0.3em] mb-1">AVAILABLE LANGUAGES</div>
                            <div className="flex flex-wrap gap-2">
                              {mediaDetail.spokenLanguages.map((lang) => (
                                <span
                                  key={lang.iso}
                                  className={`px-2 py-0.5 text-[9px] tracking-wider border ${
                                    lang.iso.toUpperCase() === mediaDetail.originalLanguage
                                      ? 'border-[#E4002B]/40 text-[#E4002B]/80'
                                      : 'border-[#222222] text-[#555555]'
                                  }`}
                                >
                                  {lang.iso.toUpperCase()}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* External Links Row */}
                      <div className="mt-4 pt-3 border-t border-[#151515] flex flex-wrap gap-3">
                        {mediaDetail?.imdbId && (
                          <a
                            href={`https://www.imdb.com/title/${mediaDetail.imdbId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-[10px] text-[#555555] tracking-wider hover:text-[#F5C518] transition-colors"
                          >
                            <span className="w-4 h-4 bg-[#F5C518] text-[#0A0A0A] text-[8px] font-bold flex items-center justify-center">IM</span>
                            IMDb
                          </a>
                        )}
                        <a
                          href={`https://letterboxd.com/search/${encodeURIComponent(mediaDetail?.title ?? selectedMedia.title ?? '')}/`}
                          target="_blank"
                            rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-[10px] text-[#555555] tracking-wider hover:text-[#00E054] transition-colors"
                        >
                          <span className="w-4 h-4 bg-[#00E054] text-[#0A0A0A] text-[8px] font-bold flex items-center justify-center">LB</span>
                          LETTERBOXD
                        </a>
                        <a
                          href={`https://www.justwatch.com/us/search?q=${encodeURIComponent(mediaDetail?.title ?? selectedMedia.title ?? '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-[10px] text-[#555555] tracking-wider hover:text-[#FFD700] transition-colors"
                        >
                          <span className="w-4 h-4 bg-[#FFD700] text-[#0A0A0A] text-[8px] font-bold flex items-center justify-center">JW</span>
                          JUSTWATCH
                        </a>
                        {mediaDetail?.homepage && (
                          <a
                            href={mediaDetail.homepage}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-[10px] text-[#555555] tracking-wider hover:text-[#E4002B] transition-colors"
                          >
                            <span className="w-4 h-4 border border-[#333333] text-[8px] flex items-center justify-center">↗</span>
                            HOMEPAGE
                          </a>
                        )}
                        <a
                          href={`https://www.themoviedb.org/${isTv ? 'tv' : 'movie'}/${mediaDetail?.id ?? selectedMedia.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-[10px] text-[#555555] tracking-wider hover:text-[#01D277] transition-colors"
                        >
                          <span className="w-4 h-4 border border-[#01D277] text-[8px] text-[#01D277] flex items-center justify-center">TM</span>
                          TMDB
                        </a>
                      </div>

                      {/* Archive reference footer */}
                      <div className="mt-3 pt-2 border-t border-[#111111] flex items-center justify-between">
                        <span className="text-[8px] text-[#2a2a2a] tracking-[0.3em]">
                          REC::ARC-{String(mediaDetail?.id ?? selectedMedia.id).padStart(3, '0')}
                        </span>
                        <span className="text-[8px] text-[#2a2a2a] tracking-[0.2em]">
                          LAST UPDATED: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }).toUpperCase()}
                        </span>
                      </div>
                    </div>)}
                  </div>

                  {/* ─── KEY CREW SECTION ─── */}
                  {allKeyCrew.length > 0 && (
                    <div className="mb-6 border border-[#1a1a1a] bg-[#0d0d0d]">
                      <button
                        onClick={() => toggleSection('keycrew')}
                        className="w-full px-4 py-2 border-b border-[#1a1a1a] flex items-center justify-between hover:bg-[#151515] transition-colors"
                      >
                        <div className="text-[10px] text-[#E4002B] tracking-[0.3em] flex items-center gap-2">
                          <span className="text-[8px]">{collapsed.keycrew ? '▶' : '▼'}</span>
                          <div className="w-4 h-px bg-[#E4002B]" />
                          KEY PERSONNEL
                        </div>
                        <span className="text-[10px] text-[#333333] tracking-wider">{allKeyCrew.length}</span>
                      </button>
                      {!collapsed.keycrew && (
                      <div className="p-4">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                          {allKeyCrew.map((person, i) => (
                            <div key={`${person.name}-${person.label}-${i}`} className="flex items-center gap-3 group">
                              <div className="w-10 h-10 shrink-0 bg-[#1a1a1a] border border-[#222222] overflow-hidden">
                                <ImageWithFallback
                                  src={person.profilePath ? `${PROFILE_SIZES.w185}${person.profilePath}` : null}
                                  alt={person.name}
                                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-300"
                                  fallbackClassName="w-full h-full flex items-center justify-center text-[#333333] text-xs"
                                  fallbackText={person.name.charAt(0)}
                                  fallbackIcon=""
                                />
                              </div>
                              <div className="min-w-0">
                                <div className="text-[10px] text-[#B8B8B8] tracking-wider truncate">
                                  {person.name.toUpperCase()}
                                </div>
                                <div className="text-[9px] text-[#E4002B]/60 tracking-[0.2em]">
                                  {person.label}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      )}
                    </div>
                  )}

                  {/* ─── CAST SECTION ─── */}
                  {castList.length > 0 && (
                    <div className="mb-6 border border-[#1a1a1a] bg-[#0d0d0d]">
                      <button
                        onClick={() => toggleSection('cast')}
                        className="w-full px-4 py-2 border-b border-[#1a1a1a] flex items-center justify-between hover:bg-[#151515] transition-colors"
                      >
                        <div className="text-[10px] text-[#E4002B] tracking-[0.3em] flex items-center gap-2">
                          <span className="text-[8px]">{collapsed.cast ? '▶' : '▼'}</span>
                          <div className="w-4 h-px bg-[#E4002B]" />
                          PERSONNEL
                          <span className="text-[#333333] ml-1">({castList.length})</span>
                        </div>
                        <span className="text-[10px] text-[#333333] tracking-wider">{displayedCast.length} SHOWN</span>
                      </button>
                      {!collapsed.cast && (
                      <div className="p-4">
                      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-1.5">
                        {displayedCast.map((person) => (
                          <div key={person.id} className="text-center group">
                            <div className="aspect-square bg-[#0d0d0d] border border-[#1a1a1a] overflow-hidden mb-1">
                              <ImageWithFallback
                                src={person.profile_path ? `${PROFILE_SIZES.w185}${person.profile_path}` : null}
                                alt={person.name}
                                className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-300"
                                fallbackClassName="w-full h-full flex items-center justify-center"
                                fallbackText="?"
                                fallbackIcon=""
                              />
                            </div>
                            <div className="text-[#B8B8B8] text-[8px] tracking-wider line-clamp-1 leading-tight">
                              {person.name.toUpperCase()}
                            </div>
                            <div className="text-[#444444] text-[7px] tracking-wider line-clamp-1 leading-tight">
                              {person.character}
                            </div>
                          </div>
                        ))}
                      </div>
                      {castList.length > 12 && (
                        <button
                          onClick={() => setShowAllCast(!showAllCast)}
                          className="mt-3 w-full py-2 border border-[#1a1a1a] text-[10px] text-[#555555] tracking-[0.3em] hover:text-[#E4002B] hover:border-[#E4002B]/30 transition-colors"
                        >
                          {showAllCast
                            ? 'SHOW LESS ▲'
                            : `VIEW ALL PERSONNEL (${castList.length}) ▼`
                          }
                        </button>
                      )}
                      </div>
                      )}
                    </div>
                  )}

                  {/* ─── MEDIA / TRAILER SECTION ─── */}
                   {(trailer || otherVideos.length > 0) && !showTrailer && (
                     <div className="mb-6 border border-[#1a1a1a] bg-[#0d0d0d]">
                      <button
                        onClick={() => toggleSection('media')}
                        className="w-full px-4 py-2 border-b border-[#1a1a1a] flex items-center justify-between hover:bg-[#151515] transition-colors"
                      >
                        <div className="text-[10px] text-[#E4002B] tracking-[0.3em] flex items-center gap-2">
                          <span className="text-[8px]">{collapsed.media ? '▶' : '▼'}</span>
                          <div className="w-4 h-px bg-[#E4002B]" />
                          MEDIA ARCHIVE
                        </div>
                        <span className="text-[10px] text-[#333333] tracking-[0.2em]">
                          {videos.length} FILE{videos.length !== 1 ? 'S' : ''}
                        </span>
                      </button>
                      {!collapsed.media && (
                      <div className="p-4">
                        {/* Main trailer thumbnail — only play in header */}
                        {trailer && (
                          <div className="mb-4">
                            <div className="relative aspect-video bg-[#000] border border-[#222222] overflow-hidden">
                              {showTrailer ? (
                                /* Trailer playing in header — show indicator */
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <img
                                    src={`https://img.youtube.com/vi/${trailer.key}/hqdefault.jpg`}
                                    alt={trailer.name}
                                    className="absolute inset-0 w-full h-full object-cover opacity-20"
                                  />
                                  <div className="relative z-10 flex flex-col items-center gap-2">
                                    <div className="w-2 h-2 bg-[#E4002B] animate-pulse" />
                                    <span className="text-[10px] text-[#E4002B] tracking-[0.3em]">PLAYING IN HEADER</span>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setShowTrailer(true)}
                                  className="absolute inset-0 w-full h-full flex items-center justify-center group"
                                >
                                  <img
                                    src={`https://img.youtube.com/vi/${trailer.key}/hqdefault.jpg`}
                                    alt={trailer.name}
                                    className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-opacity"
                                  />
                                  <div className="relative z-10 w-14 h-14 rounded-full border-2 border-[#E4002B]/60 bg-[#0A0A0A]/70 flex items-center justify-center group-hover:bg-[#E4002B]/20 transition-colors">
                                    <svg className="w-5 h-5 text-[#E4002B] ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M8 5v14l11-7z" />
                                    </svg>
                                  </div>
                                </button>
                              )}
                              {/* Corner brackets */}
                              <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-[#E4002B]/30 pointer-events-none" />
                              <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-[#E4002B]/30 pointer-events-none" />
                              <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-[#E4002B]/30 pointer-events-none" />
                              <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-[#E4002B]/30 pointer-events-none" />
                            </div>
                            <div className="mt-2 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-[#B8B8B8] tracking-wider truncate max-w-xs">
                                  {trailer.name?.toUpperCase()}
                                </span>
                                {trailer.official && (
                                  <span className="px-1.5 py-0.5 bg-[#E4002B]/10 border border-[#E4002B]/20 text-[#E4002B] text-[8px] tracking-wider">
                                    OFFICIAL
                                  </span>
                                )}
                              </div>
                              <span className="text-[9px] text-[#333333] tracking-wider">
                                {trailer.type?.toUpperCase()}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Other videos grid */}
                        {otherVideos.length > 0 && (
                          <div>
                            <div className="text-[9px] text-[#444444] tracking-[0.3em] mb-2">ADDITIONAL MEDIA</div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {otherVideos.map((video) => (
                                <a
                                  key={video.id || video.key}
                                  href={`https://www.youtube.com/watch?v=${video.key}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="group block border border-[#1a1a1a] hover:border-[#E4002B]/30 transition-colors overflow-hidden"
                                >
                                  <div className="relative aspect-video bg-[#000]">
                                    <img
                                      src={`https://img.youtube.com/vi/${video.key}/mqdefault.jpg`}
                                      alt={video.name}
                                      className="w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-opacity"
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <div className="w-8 h-8 rounded-full border border-[#E4002B]/40 bg-[#0A0A0A]/60 flex items-center justify-center">
                                        <svg className="w-3 h-3 text-[#E4002B] ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                                          <path d="M8 5v14l11-7z" />
                                        </svg>
                                      </div>
                                    </div>
                                    {/* Type badge */}
                                    <div className="absolute bottom-1 right-1 px-1 py-0.5 bg-[#0A0A0A]/80 text-[7px] text-[#555555] tracking-wider">
                                      {video.type?.toUpperCase()}
                                    </div>
                                  </div>
                                  <div className="p-1.5">
                                    <div className="text-[8px] text-[#666666] tracking-wider line-clamp-1">
                                      {video.name}
                                    </div>
                                  </div>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      )}
                    </div>
                  )}

                    {/* ─── TV SEASON/EPISODE SELECTOR ─── */}
                   {isTv && !isPlayerActive && numberOfSeasons > 0 && (
                     <div className="mb-6 border border-[#1a1a1a] bg-[#0d0d0d] overflow-hidden">
                       {/* Header */}
                       <div className="px-4 pt-4 pb-3 flex items-center gap-2">
                         <div className="w-4 h-px bg-[#E4002B]" />
                         <span className="text-[10px] text-[#E4002B] tracking-[0.3em]">EPISODE ARCHIVE</span>
                         <span className="ml-auto text-[10px] text-[#333333] tracking-wider font-mono">
                           {(mediaDetail as any)?.numberOfEpisodes ?? 0} TOTAL FILES
                         </span>
                       </div>

                       {/* Season tabs */}
                       <div className="px-4 pb-3 flex gap-1.5 overflow-x-auto scrollbar-thin scrollbar-thumb-[#222222]">
                         {seasons
                           .filter((s: any) => s.season_number > 0)
                           .map((s: any) => (
                             <button
                               key={s.season_number}
                               onClick={() => {
                                 setSelectedSeason(s.season_number);
                                 setSelectedEpisode(1);
                                 setEpisodePage(1);
                               }}
                               className={`flex-shrink-0 px-3 py-2 border transition-all text-left min-w-[80px] ${
                                 selectedSeason === s.season_number
                                   ? 'border-[#E4002B] bg-[#E4002B]/10'
                                   : 'border-[#1a1a1a] hover:border-[#333333] bg-[#0A0A0A]'
                               }`}
                             >
                               <div className={`text-[10px] tracking-wider font-mono ${
                                 selectedSeason === s.season_number ? 'text-[#E4002B]' : 'text-[#555555]'
                               }`}>
                                 S{String(s.season_number).padStart(2, '0')}
                               </div>
                               <div className={`text-[9px] mt-0.5 truncate max-w-[80px] ${
                                 selectedSeason === s.season_number ? 'text-[#888888]' : 'text-[#333333]'
                               }`}>
                                 {s.name ?? `Season ${s.season_number}`}
                               </div>
                               <div className="text-[8px] text-[#333333] mt-0.5 font-mono">
                                 {s.episode_count ?? '?'} EP
                               </div>
                             </button>
                           ))}
                       </div>

                       <div className="h-px bg-[#1a1a1a] mx-4" />

                       {/* Season loading */}
                       {seasonLoading && (
                         <div className="px-4 py-8 flex items-center justify-center gap-3">
                           <div className="w-4 h-4 border-2 border-[#E4002B]/30 border-t-[#E4002B] rounded-full animate-spin" />
                           <span className="text-[10px] text-[#444444] tracking-[0.2em]">LOADING EPISODES...</span>
                         </div>
                       )}

                       {/* Episodes grid */}
                       {!seasonLoading && seasonEpisodes.length > 0 && (
                         <>
                           <div className="px-4 pt-3 pb-1 flex items-center gap-2">
                             <span className="text-[9px] text-[#333333] tracking-[0.2em]">
                               S{String(selectedSeason).padStart(2, '0')} — {seasonEpisodes.length} EPISODES
                             </span>
                             {totalEpisodePages > 1 && (
                               <span className="text-[9px] text-[#333333] tracking-wider ml-auto font-mono">
                                 PAGE {episodePage}/{totalEpisodePages}
                               </span>
                             )}
                           </div>

                           <div className="px-4 py-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-[#222222]">
                             {paginatedEpisodes.map((ep) => {
                               const isSelected = selectedEpisode === ep.episode_number;
                               const stillUrl = ep.still_path
                                 ? `https://image.tmdb.org/t/p/w300${ep.still_path}`
                                 : null;
                               return (
                                 <button
                                   key={ep.id}
                                   onClick={() => setSelectedEpisode(ep.episode_number ?? 1)}
                                   className={`flex items-start gap-2.5 p-2 border text-left transition-all ${
                                     isSelected
                                       ? 'border-[#E4002B] bg-[#E4002B]/5'
                                       : 'border-transparent hover:border-[#222222] hover:bg-[#111111]'
                                   }`}
                                 >
                                   {/* Thumbnail */}
                                   <div className="flex-shrink-0 w-[72px] h-[40px] bg-[#111111] border border-[#1a1a1a] overflow-hidden relative">
                                     {stillUrl ? (
                                       <img
                                         src={stillUrl}
                                         alt=""
                                         className="w-full h-full object-cover grayscale-[60%] hover:grayscale-0 transition-all"
                                         loading="lazy"
                                       />
                                     ) : (
                                       <div className="w-full h-full flex items-center justify-center">
                                         <span className="text-[10px] text-[#333333] font-mono">
                                           E{String(ep.episode_number ?? '?').padStart(2, '0')}
                                         </span>
                                       </div>
                                     )}
                                   </div>
                                   {/* Info */}
                                   <div className="flex-1 min-w-0">
                                     <div className="flex items-center gap-1.5">
                                       <span className={`text-[10px] font-mono tracking-wider ${
                                         isSelected ? 'text-[#E4002B]' : 'text-[#444444]'
                                       }`}>
                                         {String(ep.episode_number ?? '?').padStart(2, '0')}
                                       </span>
                                       <span className={`text-[10px] truncate ${
                                         isSelected ? 'text-[#CCCCCC]' : 'text-[#777777]'
                                       }`}>
                                         {ep.name || `Episode ${ep.episode_number}`}
                                       </span>
                                     </div>
                                     <div className="flex items-center gap-2 mt-0.5">
                                       {ep.runtime && (
                                         <span className="text-[8px] text-[#333333] font-mono">{ep.runtime}m</span>
                                       )}
                                       {ep.air_date && (
                                         <span className="text-[8px] text-[#333333] font-mono">
                                           {ep.air_date.slice(0, 4)}
                                         </span>
                                       )}
                                       {(ep.vote_average ?? 0) > 0 && (
                                         <span className="text-[8px] text-[#333333] font-mono">
                                           ▲ {Math.round((ep.vote_average ?? 0) * 10)}%
                                         </span>
                                       )}
                                     </div>
                                   </div>
                                 </button>
                               );
                             })}
                           </div>

                           {/* Episode pagination */}
                           {totalEpisodePages > 1 && (
                             <div className="px-4 py-2 flex items-center justify-center gap-2 border-t border-[#111111]">
                               <button
                                 onClick={() => setEpisodePage(Math.max(1, episodePage - 1))}
                                 disabled={episodePage <= 1}
                                 className="px-2 py-1 text-[9px] text-[#444444] tracking-wider border border-[#1a1a1a] hover:border-[#333333] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                               >
                                 ◀ PREV
                               </button>
                               {Array.from({ length: totalEpisodePages }, (_, i) => i + 1)
                                 .filter((p) => {
                                   if (totalEpisodePages <= 7) return true;
                                   if (p === 1 || p === totalEpisodePages) return true;
                                   if (Math.abs(p - episodePage) <= 1) return true;
                                   return false;
                                 })
                                 .map((p, i, arr) => {
                                   const prev = arr[i - 1];
                                   const showEllipsis = prev !== undefined && p - prev > 1;
                                   return (
                                     <span key={p} className="flex items-center gap-0.5">
                                       {showEllipsis && <span className="text-[9px] text-[#333333] px-0.5">⋯</span>}
                                     <button
                                       onClick={() => setEpisodePage(p)}
                                         className={`w-6 h-6 text-[9px] tracking-wider border transition-all ${
                                         episodePage === p
                                           ? 'border-[#E4002B] text-[#E4002B] bg-[#E4002B]/10'
                                           : 'border-[#1a1a1a] text-[#444444] hover:border-[#333333]'
                                       }`}
                                     >
                                       {p}
                                     </button>
                                     </span>
                                   );
                                 })}
                               <button
                                 onClick={() => setEpisodePage(Math.min(totalEpisodePages, episodePage + 1))}
                                 disabled={episodePage >= totalEpisodePages}
                                 className="px-2 py-1 text-[9px] text-[#444444] tracking-wider border border-[#1a1a1a] hover:border-[#333333] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                               >
                                 NEXT ▶
                               </button>
                             </div>
                           )}
                         </>
                       )}

                       {/* No episodes */}
                       {!seasonLoading && seasonEpisodes.length === 0 && (
                         <div className="px-4 py-6 flex items-center justify-center gap-2">
                           <span className="text-[10px] text-[#333333] tracking-[0.2em]">NO EPISODE DATA AVAILABLE</span>
                         </div>
                       )}

                       {/* Currently selected indicator */}
                       <div className="px-4 py-2 border-t border-[#111111] flex items-center gap-2">
                         <div className={`w-1.5 h-1.5 ${selectedEpisode && seasonEpisodes.length > 0 ? 'bg-[#E4002B]' : 'bg-[#333333]'}`} />
                         <span className="text-[10px] text-[#444444] tracking-wider font-mono">
                           SELECTED: S{String(selectedSeason).padStart(2, '0')}E{String(selectedEpisode).padStart(2, '0')}
                         </span>
                         <span className="text-[10px] text-[#333333] tracking-wider ml-auto font-mono">
                           ▶ READY FOR PLAYBACK
                         </span>
                       </div>
                     </div>
                   )}

                    {/* Resume prompt */}
                    {savedProgress && savedProgress.currentTime > 10 && !savedProgress.completed && (
                      <div className="flex items-center gap-3 px-4 py-2 bg-[#E4002B]/5 border border-[#E4002B]/20">
                        <div className="w-1.5 h-1.5 bg-[#E4002B]" />
                        <span className="text-[10px] text-[#E4002B] tracking-[0.2em]">
                          ◆ PREVIOUSLY AT {formatTime(savedProgress.currentTime)} ({Math.round(savedProgress.progress)}% COMPLETE)
                        </span>
                        <div className="flex-1 h-[2px] bg-[#1a1a1a]">
                          <div
                            className="h-full bg-[#E4002B]/60"
                            style={{ width: `${Math.min(savedProgress.progress, 100)}%` }}
                          />
                        </div>
                        <button
                          onClick={() => {
                            if (selectedMedia) {
                              removeWatchProgress(selectedMedia.id, selectedMedia.mediaType, isTv ? selectedSeason : undefined, isTv ? selectedEpisode : undefined);
                            }
                          }}
                          className="text-[9px] text-[#444444] tracking-wider hover:text-[#E4002B] transition-colors"
                        >
                          RESET ✕
                        </button>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-3">
                      <motion.button
                        onClick={() => setIsPlayerActive(true)}
                        className="group relative px-8 py-3 border border-[#E4002B] text-[#E4002B] text-xs tracking-[0.3em] overflow-hidden"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <span className="relative z-10 group-hover:text-[#0A0A0A] transition-colors duration-300">
                          {savedProgress && savedProgress.currentTime > 10 && !savedProgress.completed
                            ? `▶ RESUME FROM ${formatTime(savedProgress.currentTime)}`
                            : '▶ INITIATE PLAYBACK'}
                        </span>
                       <motion.div
                         className="absolute inset-0 bg-[#E4002B]"
                         initial={{ x: '-100%' }}
                         whileHover={{ x: 0 }}
                         transition={{ duration: 0.3 }}
                       />
                     </motion.button>
                     {trailer && !showTrailer && !isPlayerActive && (
                       <motion.button
                         onClick={() => {
                           setShowTrailer(true);
                           setTimeout(() => {
                             modalContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                           }, 100);
                         }}
                         className="px-8 py-3 border border-[#333333] text-[#666666] text-xs tracking-[0.3em] hover:border-[#E4002B]/50 hover:text-[#E4002B] transition-colors glitch-btn"
                         whileHover={{ scale: 1.02 }}
                         whileTap={{ scale: 0.98 }}
                       >
                         ▶ WATCH TRAILER
                       </motion.button>
                     )}
                     {/* Watchlist Toggle */}
                     <motion.button
                       onClick={() => {
                         if (!selectedMedia) return;
                         if (isInWatchlist) {
                           removeFromWatchlist(selectedMedia.id, selectedMedia.mediaType);
                         } else {
                           addToWatchlist({
                             id: selectedMedia.id,
                             mediaType: selectedMedia.mediaType,
                             title: selectedMedia.title,
                             posterPath: selectedMedia.posterPath,
                             year: selectedMedia.year,
                             rating: selectedMedia.rating,
                           });
                         }
                       }}
                       className={`px-6 py-3 border text-xs tracking-[0.3em] transition-colors ${
                         isInWatchlist
                           ? 'border-[#E4002B] text-[#E4002B] bg-[#E4002B]/10'
                           : 'border-[#333333] text-[#666666] hover:border-[#E4002B]/50 hover:text-[#E4002B]'
                       }`}
                       whileHover={{ scale: 1.02 }}
                       whileTap={{ scale: 0.98 }}
                     >
                       {isInWatchlist ? '♥ IN WATCHLIST' : '+ ADD TO WATCHLIST'}
                     </motion.button>

                     {/* Add to Collection */}
                     <div className="relative">
                       <motion.button
                         onClick={() => setShowCollectionsMenu(!showCollectionsMenu)}
                         className="px-6 py-3 border border-[#333333] text-[#666666] text-xs tracking-[0.3em] hover:border-[#E4002B]/50 hover:text-[#E4002B] transition-colors"
                         whileHover={{ scale: 1.02 }}
                         whileTap={{ scale: 0.98 }}
                       >
                         ◈ COLLECTION
                       </motion.button>
                       <AnimatePresence>
                         {showCollectionsMenu && selectedMedia && (
                           <motion.div
                             className="absolute top-full left-0 mt-2 w-64 bg-[#0d0d0d] border border-[#222222] z-20 max-h-60 overflow-y-auto"
                             initial={{ opacity: 0, y: -5 }}
                             animate={{ opacity: 1, y: 0 }}
                             exit={{ opacity: 0, y: -5 }}
                           >
                             <div className="p-2 border-b border-[#1a1a1a]">
                               <span className="text-[9px] text-[#444444] tracking-wider">ADD TO COLLECTION</span>
                             </div>
                             {collections.length === 0 ? (
                               <div className="p-4 text-center">
                                 <p className="text-[10px] text-[#444444]">NO COLLECTIONS YET</p>
                                 <p className="text-[9px] text-[#333333] mt-1">Create one in the Watchlist panel</p>
                               </div>
                             ) : (
                               collections.map((col) => {
                                 const inCol = getItemsInCollections(selectedMedia.id, selectedMedia.mediaType).includes(col.name);
                                 return (
                                   <button
                                     key={col.id}
                                     onClick={() => {
                                       if (!inCol) {
                                         addToCollection(col.id, {
                                           id: selectedMedia.id,
                                           mediaType: selectedMedia.mediaType,
                                           title: selectedMedia.title,
                                           posterPath: selectedMedia.posterPath,
                                           year: selectedMedia.year,
                                         });
                                       }
                                       setShowCollectionsMenu(false);
                                     }}
                                     className="w-full text-left px-3 py-2 hover:bg-[#111111] transition-colors flex items-center gap-2"
                                   >
                                     <span className={`text-[10px] ${inCol ? 'text-[#E4002B]' : 'text-[#333333]'}`}>
                                       {inCol ? '●' : '○'}
                                     </span>
                                     <span className="text-[11px] text-[#888888] truncate">{col.name}</span>
                                     <span className="text-[9px] text-[#333333] ml-auto">{col.items.length}</span>
                                   </button>
                                 );
                               })
                             )}
                           </motion.div>
                         )}
                       </AnimatePresence>
                     </div>
                   </div>

                   {/* Rating Section */}
                   <div className="mt-4 border border-[#1a1a1a] bg-[#0d0d0d] p-4">
                     <div className="flex items-center gap-3 mb-3">
                       <span className="text-[10px] text-[#E4002B] tracking-[0.3em]">★</span>
                       <span className="text-[10px] text-[#888888] tracking-[0.2em]">YOUR RATING</span>
                       {userRating && (
                         <span className="text-[10px] text-[#E4002B] ml-auto">{userRating.rating}/10</span>
                       )}
                       {userRating && (
                         <button
                           onClick={() => selectedMedia && removeRating(selectedMedia.id, selectedMedia.mediaType)}
                           className="text-[10px] text-[#333333] hover:text-[#E4002B] tracking-wider transition-colors"
                         >
                           CLEAR
                         </button>
                       )}
                     </div>
                     <div className="flex items-center gap-1">
                       {Array.from({ length: 10 }, (_, i) => i + 1).map((star) => (
                         <button
                           key={star}
                           onClick={() => {
                             if (!selectedMedia) return;
                             setRating({
                               id: selectedMedia.id,
                               mediaType: selectedMedia.mediaType,
                               rating: star,
                               review: reviewText || userRating?.review || '',
                             });
                           }}
                           onMouseEnter={() => setUserRatingHover(star)}
                           onMouseLeave={() => setUserRatingHover(0)}
                           className={`flex-1 h-6 transition-colors ${
                             star <= (userRatingHover || (userRating ? userRating.rating : 0))
                               ? 'bg-[#E4002B]'
                               : 'bg-[#1a1a1a] hover:bg-[#333333]'
                           }`}
                           title={`${star}/10`}
                         />
                       ))}
                     </div>
                     <div className="flex items-center justify-between mt-2">
                       <span className="text-[9px] text-[#333333]">1</span>
                       <span className="text-[9px] text-[#333333]">5</span>
                       <span className="text-[9px] text-[#333333]">10</span>
                     </div>
                     {/* Review toggle */}
                     <button
                       onClick={() => setShowReviewInput(!showReviewInput)}
                       className="mt-2 text-[10px] text-[#444444] hover:text-[#E4002B] tracking-wider transition-colors"
                     >
                       {userRating?.review ? 'EDIT REVIEW' : showReviewInput ? 'CANCEL' : '+ WRITE REVIEW'}
                     </button>
                     <AnimatePresence>
                       {(showReviewInput || userRating?.review) && (
                         <motion.div
                           initial={{ height: 0, opacity: 0 }}
                           animate={{ height: 'auto', opacity: 1 }}
                           exit={{ height: 0, opacity: 0 }}
                           className="overflow-hidden"
                         >
                           <textarea
                             value={reviewText || userRating?.review || ''}
                             onChange={(e) => setReviewText(e.target.value)}
                             placeholder="WRITE YOUR REVIEW..."
                             className="w-full mt-2 bg-[#0A0A0A] border border-[#222222] text-[#888888] text-xs p-3 h-20 resize-none tracking-wider placeholder:text-[#333333] focus:border-[#E4002B] focus:outline-none"
                           />
                           {showReviewInput && (
                             <button
                               onClick={() => {
                                 if (!selectedMedia) return;
                                 setRating({
                                   id: selectedMedia.id,
                                   mediaType: selectedMedia.mediaType,
                                   rating: userRating?.rating || 5,
                                   review: reviewText,
                                 });
                                 setShowReviewInput(false);
                               }}
                               className="mt-2 px-4 py-1.5 border border-[#333333] text-[#666666] text-[10px] tracking-wider hover:border-[#E4002B] hover:text-[#E4002B] transition-colors"
                             >
                               SAVE REVIEW
                             </button>
                           )}
                         </motion.div>
                       )}
                     </AnimatePresence>
                   </div>
                </div>
              )}

              {/* Related Records — Similar + Recommended */}
              {!isDetailLoading && (similar.length > 0 || recommended.length > 0) && (
                <div className="border-t border-[#1a1a1a]">
                  {/* Similar */}
                  {similar.length > 0 && (
                    <div className="px-6 md:px-8 pt-5 pb-2">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-[10px] text-[#E4002B] tracking-[0.3em] font-mono">◆</span>
                        <h3 className="text-[11px] text-[#888888] tracking-[0.3em] font-mono">RELATED RECORDS</h3>
                        <span className="text-[10px] text-[#333333] tracking-wider font-mono ml-auto">{similar.length} FOUND</span>
                      </div>
                      <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-thin scrollbar-thumb-[#222222]">
                        {similar.slice(0, 12).map((item) => (
                          <RelatedCard key={`similar-${item.id}`} item={item} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommended */}
                  {recommended.length > 0 && (
                    <div className="px-6 md:px-8 pt-2 pb-4">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-[10px] text-[#E4002B] tracking-[0.3em] font-mono">◇</span>
                        <h3 className="text-[11px] text-[#888888] tracking-[0.3em] font-mono">RECOMMENDED VIEWING</h3>
                        <span className="text-[10px] text-[#333333] tracking-wider font-mono ml-auto">{recommended.length} FOUND</span>
                      </div>
                      <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-thin scrollbar-thumb-[#222222]">
                        {recommended.slice(0, 12).map((item) => (
                          <RelatedCard key={`rec-${item.id}`} item={item} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Footer decoration */}
              <div className="border-t border-[#1a1a1a] px-6 md:px-8 py-3 flex items-center justify-between">
                <span className="text-[10px] text-[#333333] tracking-[0.3em]">
                  ARC-{String(selectedMedia.id).padStart(3, '0')} // ARCHIVE RECORD
                </span>
                <span className="text-[10px] text-[#333333] tracking-[0.2em]">
                  LOOPFLIX ARCHIVE SYSTEM v2.47
                </span>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
