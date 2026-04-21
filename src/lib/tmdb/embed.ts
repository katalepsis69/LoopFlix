/**
 * Multi-server embed system for LoopFlix.
 * Client-safe — no secrets, just URL construction.
 */

export interface EmbedServer {
  id: string;
  name: string;
  movieUrl: (tmdbId: number, options?: EmbedOptions) => string;
  tvUrl: (tmdbId: number, season: number, episode: number, options?: EmbedOptions) => string;
}

export interface EmbedOptions {
  progress?: number;
}

const VIDKING_BASE = 'https://www.vidking.net/embed';

const vidking: EmbedServer = {
  id: 'vidking',
  name: 'Server 1',
  movieUrl(tmdbId, options) {
    const params = new URLSearchParams({
      color: 'e4002b',
      autoPlay: 'true',
      nextEpisode: 'true',
      episodeSelector: 'true',
    });
    if (options?.progress && options.progress > 10) {
      params.set('progress', String(Math.floor(options.progress)));
    }
    return `${VIDKING_BASE}/movie/${tmdbId}?${params}`;
  },
  tvUrl(tmdbId, season, episode, options) {
    const params = new URLSearchParams({
      color: 'e4002b',
      autoPlay: 'true',
      nextEpisode: 'true',
      episodeSelector: 'true',
    });
    if (options?.progress && options.progress > 10) {
      params.set('progress', String(Math.floor(options.progress)));
    }
    return `${VIDKING_BASE}/tv/${tmdbId}/${season}/${episode}?${params}`;
  },
};

const MULTIEMBED_BASE = 'https://multiembed.mov';

const multiembed: EmbedServer = {
  id: 'multiembed',
  name: 'Server 2',
  movieUrl(tmdbId) {
    return `${MULTIEMBED_BASE}/?video_id=${tmdbId}&tmdb=1`;
  },
  tvUrl(tmdbId, season, episode) {
    return `${MULTIEMBED_BASE}/?video_id=${tmdbId}&tmdb=1&s=${season}&e=${episode}`;
  },
};

export const SERVERS: EmbedServer[] = [
  vidking,
  multiembed,
];

export function getServer(id: string): EmbedServer | undefined {
  return SERVERS.find((s) => s.id === id);
}

export const DEFAULT_SERVER = SERVERS[0];

// ─── Convenience helpers ──────────────────────────────────────

export function getMovieEmbedUrl(tmdbId: number, serverId = 'vidking', options?: EmbedOptions): string {
  const server = getServer(serverId) ?? DEFAULT_SERVER;
  return server.movieUrl(tmdbId, options);
}

export function getTvEmbedUrl(tmdbId: number, season: number, episode: number, serverId = 'vidking', options?: EmbedOptions): string {
  const server = getServer(serverId) ?? DEFAULT_SERVER;
  return server.tvUrl(tmdbId, season, episode, options);
}

export function getMovieEmbedHtml(tmdbId: number, serverId = 'vidking', options?: EmbedOptions): string {
  const url = getMovieEmbedUrl(tmdbId, serverId, options);
  return `<iframe src="${url}" width="100%" height="100%" frameborder="0" allowfullscreen allow="autoplay; encrypted-media; picture-in-picture" sandbox="allow-scripts allow-same-origin allow-popups allow-forms" referrerpolicy="no-referrer"></iframe>`;
}

export function getTvEmbedHtml(tmdbId: number, season: number, episode: number, serverId = 'vidking', options?: EmbedOptions): string {
  const url = getTvEmbedUrl(tmdbId, season, episode, serverId, options);
  return `<iframe src="${url}" width="100%" height="100%" frameborder="0" allowfullscreen allow="autoplay; encrypted-media; picture-in-picture" sandbox="allow-scripts allow-same-origin allow-popups allow-forms" referrerpolicy="no-referrer"></iframe>`;
}
