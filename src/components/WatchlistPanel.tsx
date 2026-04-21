'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { useUserStore } from '@/store/useUserStore';
import type { MediaType } from '../lib/tmdb/types';

type Tab = 'watchlist' | 'history' | 'collections';

const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: 'watchlist', label: 'WATCHLIST', icon: '◆' },
  { id: 'history', label: 'HISTORY', icon: '◇' },
  { id: 'collections', label: 'COLLECTIONS', icon: '◈' },
];

function MediaRow({
  item,
  onRemove,
  onClick,
  showDate,
  dateLabel,
}: {
  item: { id: number; mediaType: MediaType; title: string; posterPath: string | null; year: string };
  onRemove?: () => void;
  onClick?: () => void;
  showDate?: boolean;
  dateLabel?: string;
}) {
  const posterUrl = item.posterPath
    ? `https://image.tmdb.org/t/p/w92${item.posterPath}`
    : null;

  return (
    <div className="flex items-center gap-3 p-3 hover:bg-[#111111] transition-colors group">
      {/* Poster */}
      <div
        className="w-10 h-14 bg-[#1a1a1a] border border-[#222222] overflow-hidden shrink-0 cursor-pointer"
        onClick={onClick}
      >
        {posterUrl ? (
          <img src={posterUrl} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#333333] text-xs">◆</div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 cursor-pointer" onClick={onClick}>
        <p className="text-[#B8B8B8] text-xs truncate group-hover:text-[#E4002B] transition-colors">
          {item.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-[#444444]">{item.year}</span>
          <span className={`text-[9px] tracking-wider ${item.mediaType === 'tv' ? 'text-[#E4002B]' : 'text-[#555555]'}`}>
            {item.mediaType === 'tv' ? 'TV' : 'FILM'}
          </span>
          {showDate && dateLabel && (
            <span className="text-[9px] text-[#333333] ml-auto">{dateLabel}</span>
          )}
        </div>
      </div>

      {/* Remove */}
      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="text-[#333333] hover:text-[#E4002B] transition-colors opacity-0 group-hover:opacity-100 shrink-0"
          title="Remove"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

function CollectionCard({
  collection,
  onDelete,
  onClick,
}: {
  collection: ReturnType<typeof useUserStore.getState>['collections'][0];
  onDelete: () => void;
  onClick: () => void;
}) {
  return (
    <div className="border border-[#1a1a1a] bg-[#0d0d0d] p-4 hover:border-[#333333] transition-colors group cursor-pointer">
      <div className="flex items-start justify-between mb-2">
        <div onClick={onClick}>
          <h4 className="text-[#B8B8B8] text-xs tracking-wider group-hover:text-[#E4002B] transition-colors">
            {collection.name}
          </h4>
          {collection.description && (
            <p className="text-[10px] text-[#444444] mt-1 line-clamp-2">{collection.description}</p>
          )}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="text-[#333333] hover:text-[#E4002B] transition-colors opacity-0 group-hover:opacity-100"
          title="Delete collection"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14" />
          </svg>
        </button>
      </div>
      <div className="flex items-center gap-2 mt-3">
        <span className="text-[10px] text-[#444444] tracking-wider">
          {collection.items.length} {collection.items.length === 1 ? 'ITEM' : 'ITEMS'}
        </span>
        {/* Mini poster stack */}
        <div className="flex -space-x-1 ml-auto">
          {collection.items.slice(0, 4).map((ci) => (
            <div key={ci.id} className="w-5 h-7 bg-[#1a1a1a] border border-[#222222] overflow-hidden">
              {ci.posterPath && (
                <img
                  src={`https://image.tmdb.org/t/p/w92${ci.posterPath}`}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              )}
            </div>
          ))}
          {collection.items.length > 4 && (
            <div className="w-5 h-7 bg-[#1a1a1a] border border-[#222222] flex items-center justify-center">
              <span className="text-[7px] text-[#444444]">+{collection.items.length - 4}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CollectionDetail({ collectionId, onBack }: { collectionId: string; onBack: () => void }) {
  const collections = useUserStore((s) => s.collections);
  const removeFromCollection = useUserStore((s) => s.removeFromCollection);
  const collection = collections.find((c) => c.id === collectionId);
  const setSelectedMedia = useStore((s) => s.setSelectedMedia);
  const setWatchlistPanelOpen = useStore((s) => s.setWatchlistPanelOpen);

  if (!collection) return null;

  const handleClick = (item: typeof collection.items[0]) => {
    setSelectedMedia({
      id: item.id,
      mediaType: item.mediaType,
      title: item.title,
      originalTitle: item.title,
      overview: '',
      posterPath: item.posterPath,
      backdropPath: null,
      year: item.year,
      genres: [],
      rating: 0,
      voteCount: 0,
      popularity: 0,
    });
    setWatchlistPanelOpen(false);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-[#1a1a1a]">
        <button onClick={onBack} className="text-[#666666] hover:text-[#E4002B] transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h3 className="text-[#B8B8B8] text-xs tracking-wider">{collection.name}</h3>
          <span className="text-[10px] text-[#444444]">{collection.items.length} ITEMS</span>
        </div>
      </div>

      {/* Items */}
      {collection.items.length === 0 ? (
        <div className="p-8 text-center">
          <span className="text-[#333333] text-2xl">◈</span>
          <p className="text-[#444444] text-xs mt-2">NO ITEMS IN THIS COLLECTION</p>
        </div>
      ) : (
        <div className="divide-y divide-[#1a1a1a]">
          {collection.items.map((item) => (
            <MediaRow
              key={`${item.mediaType}-${item.id}`}
              item={item}
              onClick={() => handleClick(item)}
              onRemove={() => removeFromCollection(collectionId, item.id, item.mediaType)}
              showDate
              dateLabel={new Date(item.addedAt).toLocaleDateString()}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function WatchlistPanel() {
  const { watchlistPanelOpen, setWatchlistPanelOpen, setSelectedMedia: setSelectedMediaItem } = useStore();
  const [activeTab, setActiveTab] = useState<Tab>('watchlist');
  const [viewingCollectionId, setViewingCollectionId] = useState<string | null>(null);
  const [newColName, setNewColName] = useState('');
  const [showNewCol, setShowNewCol] = useState(false);

  // Data
  const watchlist = useUserStore((s) => s.watchlist);
  const removeFromWatchlist = useUserStore((s) => s.removeFromWatchlist);
  const clearWatchlist = useUserStore((s) => s.clearWatchlist);
  const recentlyViewed = useUserStore((s) => s.recentlyViewed);
  const clearRecentlyViewed = useUserStore((s) => s.clearRecentlyViewed);
  const collections = useUserStore((s) => s.collections);
  const createCollection = useUserStore((s) => s.createCollection);
  const deleteCollection = useUserStore((s) => s.deleteCollection);

  const handleItemClick = (item: typeof watchlist[0]) => {
    setSelectedMediaItem({
      id: item.id,
      mediaType: item.mediaType,
      title: item.title,
      originalTitle: item.title,
      overview: '',
      posterPath: item.posterPath,
      backdropPath: null,
      year: item.year,
      genres: [],
      rating: item.rating,
      voteCount: 0,
      popularity: 0,
    });
    setWatchlistPanelOpen(false);
  };

  const handleCreateCollection = () => {
    if (newColName.trim()) {
      createCollection(newColName.trim());
      setNewColName('');
      setShowNewCol(false);
    }
  };

  const formatTime = (ts: number) => {
    const now = Date.now();
    const diff = now - ts;
    if (diff < 60000) return 'JUST NOW';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}M AGO`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}H AGO`;
    return new Date(ts).toLocaleDateString();
  };

  const counts = {
    watchlist: watchlist.length,
    history: recentlyViewed.length,
    collections: collections.length,
  };

  return (
    <AnimatePresence>
      {watchlistPanelOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[60] bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setWatchlistPanelOpen(false)}
          />

          {/* Panel */}
          <motion.div
            className="fixed top-0 right-0 bottom-0 z-[70] w-full max-w-md bg-[#0A0A0A] border-l border-[#1a1a1a] flex flex-col"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#1a1a1a]">
              <div className="flex items-center gap-2">
                <span className="text-[#E4002B] text-xs">◆</span>
                <h2 className="text-[#B8B8B8] text-xs tracking-[0.3em]">PERSONAL ARCHIVE</h2>
              </div>
              <button
                onClick={() => setWatchlistPanelOpen(false)}
                className="text-[#666666] hover:text-[#E4002B] transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-[#1a1a1a]">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setViewingCollectionId(null); }}
                  className={`flex-1 py-3 text-[10px] tracking-[0.2em] transition-colors flex items-center justify-center gap-2 ${
                    activeTab === tab.id
                      ? 'text-[#E4002B] border-b border-[#E4002B] bg-[#E4002B]/5'
                      : 'text-[#555555] hover:text-[#888888]'
                  }`}
                >
                  <span className="text-[8px]">{tab.icon}</span>
                  {tab.label}
                  {counts[tab.id] > 0 && (
                    <span className={`text-[8px] px-1.5 py-0.5 ${
                      activeTab === tab.id ? 'bg-[#E4002B]/20 text-[#E4002B]' : 'bg-[#1a1a1a] text-[#444444]'
                    }`}>
                      {counts[tab.id]}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {viewingCollectionId ? (
                <CollectionDetail
                  collectionId={viewingCollectionId}
                  onBack={() => setViewingCollectionId(null)}
                />
              ) : (
                <>
                  {/* Watchlist Tab */}
                  {activeTab === 'watchlist' && (
                    <>
                      {watchlist.length === 0 ? (
                        <div className="p-12 text-center">
                          <span className="text-[#333333] text-3xl">◆</span>
                          <p className="text-[#444444] text-xs mt-3 tracking-wider">WATCHLIST EMPTY</p>
                          <p className="text-[#333333] text-[10px] mt-1">Add records to your personal queue</p>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between px-4 py-2 border-b border-[#1a1a1a]">
                            <span className="text-[10px] text-[#444444] tracking-wider">
                              {watchlist.length} RECORDS
                            </span>
                            <button
                              onClick={clearWatchlist}
                              className="text-[10px] text-[#333333] hover:text-[#E4002B] tracking-wider transition-colors"
                            >
                              CLEAR ALL
                            </button>
                          </div>
                          <div className="divide-y divide-[#1a1a1a]">
                            {watchlist.map((item) => (
                              <MediaRow
                                key={`${item.mediaType}-${item.id}`}
                                item={item}
                                onClick={() => handleItemClick(item)}
                                onRemove={() => removeFromWatchlist(item.id, item.mediaType)}
                                showDate
                                dateLabel={formatTime(item.addedAt)}
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </>
                  )}

                  {/* History Tab */}
                  {activeTab === 'history' && (
                    <>
                      {recentlyViewed.length === 0 ? (
                        <div className="p-12 text-center">
                          <span className="text-[#333333] text-3xl">◇</span>
                          <p className="text-[#444444] text-xs mt-3 tracking-wider">NO HISTORY</p>
                          <p className="text-[#333333] text-[10px] mt-1">Viewed records will appear here</p>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between px-4 py-2 border-b border-[#1a1a1a]">
                            <span className="text-[10px] text-[#444444] tracking-wider">
                              {recentlyViewed.length} RECORDS
                            </span>
                            <button
                              onClick={clearRecentlyViewed}
                              className="text-[10px] text-[#333333] hover:text-[#E4002B] tracking-wider transition-colors"
                            >
                              CLEAR HISTORY
                            </button>
                          </div>
                          <div className="divide-y divide-[#1a1a1a]">
                            {recentlyViewed.map((item) => (
                              <MediaRow
                                key={`${item.mediaType}-${item.id}`}
                                item={item}
                                onClick={() => handleItemClick(item as any)}
                                showDate
                                dateLabel={formatTime(item.viewedAt)}
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </>
                  )}

                  {/* Collections Tab */}
                  {activeTab === 'collections' && (
                    <>
                      {/* New collection input */}
                      {showNewCol ? (
                        <div className="p-4 border-b border-[#1a1a1a]">
                          <input
                            type="text"
                            value={newColName}
                            onChange={(e) => setNewColName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCreateCollection()}
                            placeholder="COLLECTION NAME..."
                            className="w-full bg-[#0d0d0d] border border-[#333333] text-[#B8B8B8] text-xs px-3 py-2 tracking-wider placeholder:text-[#333333] focus:border-[#E4002B] focus:outline-none"
                            autoFocus
                          />
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={handleCreateCollection}
                              className="flex-1 py-2 border border-[#E4002B] text-[#E4002B] text-[10px] tracking-wider hover:bg-[#E4002B]/10"
                            >
                              CREATE
                            </button>
                            <button
                              onClick={() => { setShowNewCol(false); setNewColName(''); }}
                              className="flex-1 py-2 border border-[#333333] text-[#666666] text-[10px] tracking-wider hover:border-[#555555]"
                            >
                              CANCEL
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 border-b border-[#1a1a1a]">
                          <button
                            onClick={() => setShowNewCol(true)}
                            className="w-full py-2 border border-dashed border-[#333333] text-[#555555] text-[10px] tracking-wider hover:border-[#E4002B]/50 hover:text-[#E4002B] transition-colors"
                          >
                            + NEW COLLECTION
                          </button>
                        </div>
                      )}

                      {collections.length === 0 && !showNewCol ? (
                        <div className="p-12 text-center">
                          <span className="text-[#333333] text-3xl">◈</span>
                          <p className="text-[#444444] text-xs mt-3 tracking-wider">NO COLLECTIONS</p>
                          <p className="text-[#333333] text-[10px] mt-1">Organize records into custom groups</p>
                        </div>
                      ) : (
                        <div className="p-4 grid gap-3">
                          {collections.map((col) => (
                            <CollectionCard
                              key={col.id}
                              collection={col}
                              onDelete={() => deleteCollection(col.id)}
                              onClick={() => setViewingCollectionId(col.id)}
                            />
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-[#1a1a1a] px-4 py-2 flex items-center justify-between">
              <span className="text-[9px] text-[#333333] tracking-wider">
                STORED LOCALLY // {Math.round(JSON.stringify({ w: watchlist, r: recentlyViewed, c: collections }).length / 1024)}KB USED
              </span>
              <span className="text-[9px] text-[#333333] tracking-wider">
                PERSONAL ARCHIVE v1.0
              </span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
