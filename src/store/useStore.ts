import { create } from 'zustand';
import type { MediaItem, MediaDetail, TmdbCredits } from '../lib/tmdb/types';

export interface SessionLogEntry {
  id: string;
  type: 'view' | 'rate' | 'watchlist' | 'search' | 'error' | 'slow' | 'system' | 'play' | 'navigate';
  message: string;
  detail?: string;
  timestamp: number;
}

interface AppState {
  selectedMedia: MediaItem | null;
  setSelectedMedia: (media: MediaItem | null) => void;

  mediaDetail: MediaDetail | null;
  setMediaDetail: (detail: MediaDetail | null) => void;
  credits: TmdbCredits | null;
  setCredits: (credits: TmdbCredits | null) => void;
  isDetailLoading: boolean;
  setIsDetailLoading: (loading: boolean) => void;
  isPlayerActive: boolean;
  setIsPlayerActive: (active: boolean) => void;

  selectedServer: string;
  setSelectedServer: (server: string) => void;

  isNavOpen: boolean;
  setIsNavOpen: (open: boolean) => void;
  currentSection: string;
  setCurrentSection: (section: string) => void;

  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;

  watchlistPanelOpen: boolean;
  setWatchlistPanelOpen: (open: boolean) => void;

  signalLostOpen: boolean;
  setSignalLostOpen: (open: boolean) => void;

  sessionLog: SessionLogEntry[];
  addSessionLog: (entry: Omit<SessionLogEntry, 'id' | 'timestamp'>) => void;
  clearSessionLog: () => void;

  bootComplete: boolean;
  setBootComplete: (complete: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
  selectedMedia: null,
  setSelectedMedia: (media) => set({ selectedMedia: media, isPlayerActive: false }),

  mediaDetail: null,
  setMediaDetail: (detail) => set({ mediaDetail: detail }),
  credits: null,
  setCredits: (credits) => set({ credits }),
  isDetailLoading: false,
  setIsDetailLoading: (loading) => set({ isDetailLoading: loading }),
  isPlayerActive: false,
  setIsPlayerActive: (active) => set({ isPlayerActive: active }),

  selectedServer: 'vidking',
  setSelectedServer: (server) => set({ selectedServer: server }),

  isNavOpen: false,
  setIsNavOpen: (open) => set({ isNavOpen: open }),
  currentSection: 'archive',
  setCurrentSection: (section) => set({ currentSection: section }),

  settingsOpen: false,
  setSettingsOpen: (open) => set({ settingsOpen: open }),

  watchlistPanelOpen: false,
  setWatchlistPanelOpen: (open) => set({ watchlistPanelOpen: open }),

  signalLostOpen: false,
  setSignalLostOpen: (open) => set({ signalLostOpen: open }),

  sessionLog: [],
  addSessionLog: (entry) => set((s) => ({
    sessionLog: [
      { ...entry, id: `LOG-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, timestamp: Date.now() },
      ...s.sessionLog,
    ].slice(0, 100),
  })),
  clearSessionLog: () => set({ sessionLog: [] }),

  bootComplete: false,
  setBootComplete: (complete) => set({ bootComplete: complete }),
}));
