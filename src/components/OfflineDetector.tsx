'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function OfflineDetector() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          className="fixed bottom-0 left-0 right-0 z-[70] bg-[#E4002B] px-4 py-3 flex items-center justify-center gap-3"
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          exit={{ y: 100 }}
          transition={{ type: 'spring', damping: 25 }}
        >
          <div className="w-2 h-2 bg-white animate-pulse rounded-full" />
          <span className="text-white text-xs tracking-[0.3em] font-retro">
            CONNECTION TERMINATED — ARCHIVE OFFLINE
          </span>
          <div className="w-2 h-2 bg-white animate-pulse rounded-full" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
