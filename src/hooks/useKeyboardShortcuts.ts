'use client';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { playSound } from './useSound';

export function useKeyboardShortcuts() {
  const router = useRouter();
  const pathname = usePathname();
  const { setSelectedMedia, setSettingsOpen, setWatchlistPanelOpen } = useStore();

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if ((e.target as HTMLElement)?.isContentEditable) return;
      const modalOpen = useStore.getState().selectedMedia !== null;
      const key = e.key.toLowerCase();

      switch (key) {
        case '1': e.preventDefault(); router.push('/'); playSound('navigate'); break;
        case '2': e.preventDefault(); router.push('/catalog'); playSound('navigate'); break;
        case '3': e.preventDefault(); router.push('/terminal'); playSound('navigate'); break;
        case '/':
          e.preventDefault(); playSound('click');
          router.push('/catalog');
          setTimeout(() => { document.getElementById('catalog-search-input')?.focus(); }, 200);
          break;
        case 'w':
          if (!e.ctrlKey && !e.metaKey) { e.preventDefault(); playSound('open'); setWatchlistPanelOpen(true); }
          break;
        case ',':
          if (e.ctrlKey || e.metaKey) { e.preventDefault(); playSound('open'); setSettingsOpen(true); }
          break;
        case 'escape':
          if (!modalOpen) { setSettingsOpen(false); setWatchlistPanelOpen(false); }
          break;
        case 'g':
          if (!e.shiftKey) { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); playSound('navigate'); }
          else { e.preventDefault(); window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); playSound('navigate'); }
          break;
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [router, pathname, setSelectedMedia, setSettingsOpen, setWatchlistPanelOpen]);
}
