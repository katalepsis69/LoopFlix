'use client';
import { useState, useEffect } from 'react';

/**
 * Returns false during SSR and initial client render,
 * true after the component has mounted on the client.
 * 
 * Usage:
 *   const mounted = useHydration();
 *   if (!mounted) return <ServerSafeFallback />;
 */
export function useHydration(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  return mounted;
}
