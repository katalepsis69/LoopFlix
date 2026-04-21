'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { MediaType } from '../lib/tmdb/types';

// ─── Types ────────────────────────────────────────────────────

export interface WatchlistItem {
  id: number;
  mediaType: MediaType;
  title: string;
  posterPath: string | null;
  year: string;
  rating: number;
  addedAt: number;
}

export interface UserRating {
  id: number;
  mediaType: MediaType;
  rating: number;
  review: string;
  ratedAt: number;
}

export interface RecentlyViewItem {
  id: number;
  mediaType: MediaType;
  title: string;
  posterPath: string | null;
  year: string;
  viewedAt: number;
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  items: CollectionItem[];
  createdAt: number;
  updatedAt: number;
}

export interface CollectionItem {
  id: number;
  mediaType: MediaType;
  title: string;
  posterPath: string | null;
  year: string;
  addedAt: number;
}

export interface WatchProgress {
  id: number;
  mediaType: MediaType;
  title: string;
  posterPath: string | null;
  currentTime: number;
  duration: number;
  progress: number;
  season?: number;
  episode?: number;
  updatedAt: number;
  completed: boolean;
}

// ─── Store Interface ──────────────────────────────────────────

interface UserState {
  watchlist: WatchlistItem[];
  addToWatchlist: (item: Omit<WatchlistItem, 'addedAt'>) => void;
  removeFromWatchlist: (id: number, mediaType: MediaType) => void;
  isInWatchlist: (id: number, mediaType: MediaType) => boolean;
  clearWatchlist: () => void;

  ratings: UserRating[];
  setRating: (item: Omit<UserRating, 'ratedAt'>) => void;
  removeRating: (id: number, mediaType: MediaType) => void;
  getRating: (id: number, mediaType: MediaType) => UserRating | undefined;

  recentlyViewed: RecentlyViewItem[];
  addToRecentlyViewed: (item: Omit<RecentlyViewItem, 'viewedAt'>) => void;
  clearRecentlyViewed: () => void;

  collections: Collection[];
  createCollection: (name: string, description?: string) => Collection;
  deleteCollection: (id: string) => void;
  renameCollection: (id: string, name: string) => void;
  addToCollection: (collectionId: string, item: Omit<CollectionItem, 'addedAt'>) => boolean;
  removeFromCollection: (collectionId: string, itemId: number, mediaType: MediaType) => void;
  isInCollection: (collectionId: string, itemId: number, mediaType: MediaType) => boolean;
  getItemsInCollections: (itemId: number, mediaType: MediaType) => string[];

  watchProgress: WatchProgress[];
  updateWatchProgress: (progress: Omit<WatchProgress, 'updatedAt'>) => void;
  getWatchProgress: (id: number, mediaType: MediaType, season?: number, episode?: number) => WatchProgress | undefined;
  removeWatchProgress: (id: number, mediaType: MediaType, season?: number, episode?: number) => void;
  clearWatchProgress: () => void;
  getContinueWatching: () => WatchProgress[];
}

// ─── Helper ───────────────────────────────────────────────────

const itemKey = (id: number, mediaType: MediaType) => `${mediaType}-${id}`;
const MAX_RECENTLY_VIEWED = 50;

// ─── Store ────────────────────────────────────────────────────

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      watchlist: [],
      addToWatchlist: (item) => {
        const key = itemKey(item.id, item.mediaType);
        const exists = get().watchlist.some((w) => itemKey(w.id, w.mediaType) === key);
        if (exists) return;
        set((state) => ({ watchlist: [{ ...item, addedAt: Date.now() }, ...state.watchlist] }));
      },
      removeFromWatchlist: (id, mediaType) => {
        const key = itemKey(id, mediaType);
        set((state) => ({ watchlist: state.watchlist.filter((w) => itemKey(w.id, w.mediaType) !== key) }));
      },
      isInWatchlist: (id, mediaType) => {
        const key = itemKey(id, mediaType);
        return get().watchlist.some((w) => itemKey(w.id, w.mediaType) === key);
      },
      clearWatchlist: () => set({ watchlist: [] }),

      ratings: [],
      setRating: (item) => {
        const key = itemKey(item.id, item.mediaType);
        set((state) => {
          const filtered = state.ratings.filter((r) => itemKey(r.id, r.mediaType) !== key);
          return { ratings: [...filtered, { ...item, ratedAt: Date.now() }] };
        });
      },
      removeRating: (id, mediaType) => {
        const key = itemKey(id, mediaType);
        set((state) => ({ ratings: state.ratings.filter((r) => itemKey(r.id, r.mediaType) !== key) }));
      },
      getRating: (id, mediaType) => {
        const key = itemKey(id, mediaType);
        return get().ratings.find((r) => itemKey(r.id, r.mediaType) === key);
      },

      recentlyViewed: [],
      addToRecentlyViewed: (item) => {
        const key = itemKey(item.id, item.mediaType);
        set((state) => {
          const filtered = state.recentlyViewed.filter((v) => itemKey(v.id, v.mediaType) !== key);
          return { recentlyViewed: [{ ...item, viewedAt: Date.now() }, ...filtered].slice(0, MAX_RECENTLY_VIEWED) };
        });
      },
      clearRecentlyViewed: () => set({ recentlyViewed: [] }),

      collections: [],
      createCollection: (name, description = '') => {
        const newCollection: Collection = {
          id: `col-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name, description, items: [], createdAt: Date.now(), updatedAt: Date.now(),
        };
        set((state) => ({ collections: [...state.collections, newCollection] }));
        return newCollection;
      },
      deleteCollection: (id) => {
        set((state) => ({ collections: state.collections.filter((c) => c.id !== id) }));
      },
      renameCollection: (id, name) => {
        set((state) => ({
          collections: state.collections.map((c) => c.id === id ? { ...c, name, updatedAt: Date.now() } : c),
        }));
      },
      addToCollection: (collectionId, item) => {
        const key = itemKey(item.id, item.mediaType);
        const collection = get().collections.find((c) => c.id === collectionId);
        if (!collection) return false;
        const exists = collection.items.some((i) => itemKey(i.id, i.mediaType) === key);
        if (exists) return false;
        set((state) => ({
          collections: state.collections.map((c) =>
            c.id === collectionId ? { ...c, items: [...c.items, { ...item, addedAt: Date.now() }], updatedAt: Date.now() } : c
          ),
        }));
        return true;
      },
      removeFromCollection: (collectionId, itemId, mediaType) => {
        const key = itemKey(itemId, mediaType);
        set((state) => ({
          collections: state.collections.map((c) =>
            c.id === collectionId ? { ...c, items: c.items.filter((i) => itemKey(i.id, i.mediaType) !== key), updatedAt: Date.now() } : c
          ),
        }));
      },
      isInCollection: (collectionId, itemId, mediaType) => {
        const key = itemKey(itemId, mediaType);
        const collection = get().collections.find((c) => c.id === collectionId);
        if (!collection) return false;
        return collection.items.some((i) => itemKey(i.id, i.mediaType) === key);
      },
      getItemsInCollections: (itemId, mediaType) => {
        const key = itemKey(itemId, mediaType);
        return get().collections.filter((c) => c.items.some((i) => itemKey(i.id, i.mediaType) === key)).map((c) => c.name);
      },

      watchProgress: [],
      updateWatchProgress: (progress) => {
        const pKey = progress.season != null && progress.episode != null
          ? `${itemKey(progress.id, progress.mediaType)}-s${progress.season}e${progress.episode}`
          : itemKey(progress.id, progress.mediaType);
        set((state) => {
          const filtered = state.watchProgress.filter((p) => {
            const existingKey = p.season != null && p.episode != null
              ? `${itemKey(p.id, p.mediaType)}-s${p.season}e${p.episode}`
              : itemKey(p.id, p.mediaType);
            return existingKey !== pKey;
          });
          const isCompleted = progress.progress >= 90;
          return { watchProgress: [{ ...progress, updatedAt: Date.now(), completed: isCompleted }, ...filtered].slice(0, 200) };
        });
      },
      getWatchProgress: (id, mediaType, season, episode) => {
        const pKey = season != null && episode != null
          ? `${itemKey(id, mediaType)}-s${season}e${episode}`
          : itemKey(id, mediaType);
        return get().watchProgress.find((p) => {
          const existingKey = p.season != null && p.episode != null
            ? `${itemKey(p.id, p.mediaType)}-s${p.season}e${p.episode}`
            : itemKey(p.id, p.mediaType);
          return existingKey === pKey;
        });
      },
      removeWatchProgress: (id, mediaType, season, episode) => {
        const pKey = season != null && episode != null
          ? `${itemKey(id, mediaType)}-s${season}e${episode}`
          : itemKey(id, mediaType);
        set((state) => ({
          watchProgress: state.watchProgress.filter((p) => {
            const existingKey = p.season != null && p.episode != null
              ? `${itemKey(p.id, p.mediaType)}-s${p.season}e${p.episode}`
              : itemKey(p.id, p.mediaType);
            return existingKey !== pKey;
          }),
        }));
      },
      clearWatchProgress: () => set({ watchProgress: [] }),
      getContinueWatching: () => {
        return get().watchProgress
          .filter((p) => !p.completed && p.progress > 2 && p.progress < 90)
          .sort((a, b) => b.updatedAt - a.updatedAt)
          .slice(0, 20);
      },
    }),
    {
      name: 'loopflix-user-data',
      version: 2,
      skipHydration: true,
      storage: createJSONStorage(() => {
        if (typeof window === 'undefined') {
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          };
        }
        return localStorage;
      }),
      migrate: (persistedState: unknown) => {
        const state = persistedState as Record<string, unknown>;
        if (state._version === 1) {
          return { ...state, watchProgress: [] };
        }
        return state;
      },
    }
  )
);
