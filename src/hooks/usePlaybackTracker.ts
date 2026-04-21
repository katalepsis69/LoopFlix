'use client';
import { useEffect, useRef, useCallback } from 'react';
import { useUserStore } from '@/store/useUserStore';
import type { MediaType } from '@/lib/tmdb/types';

interface UsePlaybackTrackerOptions {
  mediaId: number;
  mediaType: MediaType;
  title: string;
  posterPath: string | null;
  season?: number;
  episode?: number;
  enabled?: boolean;
}

function isPlayerEvent(data: any): data is { type: 'PLAYER_EVENT'; data: { event: string; currentTime: number; duration: number; progress: number; id: string; mediaType: string; season?: number; episode?: number; timestamp: number } } {
  return data?.type === 'PLAYER_EVENT' && data?.data?.event;
}

export function usePlaybackTracker({ mediaId, mediaType, title, posterPath, season, episode, enabled = true }: UsePlaybackTrackerOptions) {
  const updateWatchProgress = useUserStore((s) => s.updateWatchProgress);
  const lastSaveRef = useRef(0);
  const playerStateRef = useRef<{ playing: boolean; currentTime: number; duration: number; progress: number }>({ playing: false, currentTime: 0, duration: 0, progress: 0 });

  const handleMessage = useCallback((event: MessageEvent) => {
    if (!enabled) return;
    let parsed: unknown;
    try { parsed = typeof event.data === 'string' ? JSON.parse(event.data) : event.data; } catch { return; }
    if (!isPlayerEvent(parsed)) return;
    const { data } = parsed;
    if (String(data.id) !== String(mediaId)) return;
    playerStateRef.current = { playing: data.event === 'play', currentTime: data.currentTime, duration: data.duration, progress: data.progress };
    const now = Date.now();
    if (data.event === 'timeupdate' && now - lastSaveRef.current < 5000) return;
    if (['timeupdate', 'pause', 'seeked', 'ended'].includes(data.event)) {
      lastSaveRef.current = now;
      updateWatchProgress({ id: mediaId, mediaType, title, posterPath, currentTime: data.currentTime, duration: data.duration, progress: data.progress, season, episode, completed: data.event === 'ended' });
    }
  }, [enabled, mediaId, mediaType, title, posterPath, season, episode, updateWatchProgress]);

  useEffect(() => {
    if (!enabled) return;
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleMessage, enabled]);

  return playerStateRef;
}

export function formatTime(seconds: number): string {
  if (!seconds || seconds <= 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}
