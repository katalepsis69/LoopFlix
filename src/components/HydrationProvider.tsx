'use client';

import { useEffect, useState } from 'react';
import { useUserStore } from '@/store/useUserStore';

/**
 * Rehydrates Zustand persist stores after mount.
 * Prevents hydration mismatch by ensuring server and client
 * render the same initial (empty) state.
 * 
 * Wrap your app content with this:
 *   <HydrationProvider>{children}</HydrationProvider>
 */
export default function HydrationProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const rehydrate = useUserStore.persist.rehydrate;

  useEffect(() => {
    // Rehydrate Zustand persist stores from localStorage
    rehydrate();
    setHydrated(true);
  }, [rehydrate]);

  // During SSR and initial client render, show a minimal shell
  // that matches between server and client
  if (!hydrated) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-center">
          <div className="text-[#E4002B] text-sm font-mono tracking-[0.3em] animate-pulse">
            ◈ LOOPFLIX
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
