'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { useUserStore } from '@/store/useUserStore';
import { searchMulti, movieToMediaItem, tvToMediaItem } from '@/lib/tmdb/client';
import type { MediaItem } from '../lib/tmdb/types';

// ─── Terminal Line Types ────────────────────────────────────

interface TerminalLine {
  type: 'input' | 'output' | 'error' | 'success' | 'system';
  text: string;
}

// ─── Terminal Component ─────────────────────────────────────

export default function Terminal() {
  const [lines, setLines] = useState<TerminalLine[]>([
    { type: 'system', text: 'LOOPFLIX ARCHIVE TERMINAL v2.47.1' },
    { type: 'system', text: 'Type "help" for available commands.' },
    { type: 'system', text: '─'.repeat(50) },
  ]);
  const [input, setInput] = useState('');
  const [processing, setProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { setSelectedMedia, setCurrentSection, addSessionLog } = useStore();

  const addLine = useCallback((type: TerminalLine['type'], text: string) => {
    setLines((prev) => [...prev, { type, text }]);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSearch = useCallback(async (query: string) => {
    setProcessing(true);
    addLine('input', `> search ${query}`);
    try {
      const data = await searchMulti(query);
      const results = data.results
        .filter((r: any) => r.media_type === 'movie' || r.media_type === 'tv')
        .slice(0, 8);
      if (results.length === 0) {
        addLine('error', `No results found for "${query}"`);
      } else {
        addLine('success', `Found ${results.length} results:`);
        results.forEach((r: any, i: number) => {
          const type = r.media_type === 'tv' ? 'TV' : 'FILM';
          const year = (r.release_date || r.first_air_date || '').slice(0, 4);
          const rating = r.vote_average ? r.vote_average.toFixed(1) : '—';
          addLine('output', `  ${i + 1}. [${type}] ${r.title || r.name} (${year}) ★${rating}  ID:${r.id}`);
        });
        addLine('system', 'Use "play <title>" to search and play the first match.');
      }
      addSessionLog({ type: 'search', message: `Searched: "${query}"`, detail: `${results.length} results` });
    } catch {
      addLine('error', 'Search failed. Check connection.');
    }
    setProcessing(false);
  }, [addLine, addSessionLog]);

  const handlePlay = useCallback(async (query: string) => {
    setProcessing(true);
    addLine('input', `> play ${query}`);

    const num = parseInt(query);
    if (!isNaN(num) && num > 0) {
      addLine('system', 'Direct ID selection requires a previous search. Searching instead...');
    }

    try {
      const data = await searchMulti(query);
      const results = data.results.filter((r: any) => r.media_type === 'movie' || r.media_type === 'tv');
      if (results.length === 0) {
        addLine('error', `No results found for "${query}"`);
      } else {
        const first = results[0];
        const title = first.title || first.name;
        const type = first.media_type as 'movie' | 'tv';
        addLine('success', `Loading: ${title} (${type === 'tv' ? 'TV SERIES' : 'FILM'})...`);

        const mediaItem: MediaItem = type === 'tv'
          ? tvToMediaItem(first as any)
          : movieToMediaItem(first as any);

        setSelectedMedia(mediaItem);
        addSessionLog({ type: 'play', message: `Playing: ${title}`, detail: `ID: ${first.id}` });
      }
    } catch {
      addLine('error', 'Failed to load. Check connection.');
    }
    setProcessing(false);
  }, [addLine, addSessionLog, setSelectedMedia]);

  const handleRandom = useCallback(async (genre?: string) => {
    setProcessing(true);
    addLine('input', `> random ${genre || ''}`.trim());
    addLine('system', 'Scanning archive...');
    try {
      const { discoverMovies } = await import('../lib/tmdb/api');
      const page = Math.floor(Math.random() * 50) + 1;
      const data = await discoverMovies({ page });
      if (data.results.length === 0) {
        addLine('error', 'No results found.');
      } else {
        const pick = data.results[Math.floor(Math.random() * data.results.length)];
        addLine('success', `◈ ${pick.title} (${(pick.release_date || '').slice(0, 4)}) ★${pick.vote_average?.toFixed(1) || '—'}`);
        addLine('system', 'Use "play <title>" to open.');
        addSessionLog({ type: 'system', message: `Random pick: ${pick.title}` });
      }
    } catch {
      addLine('error', 'Random scan failed.');
    }
    setProcessing(false);
  }, [addLine, addSessionLog]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = input.trim();
    if (!raw || processing) return;
    setInput('');

    const parts = raw.split(' ');
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1).join(' ');

    switch (cmd) {
      case 'help':
        addLine('system', '─'.repeat(50));
        addLine('output', 'Available commands:');
        addLine('output', '  search <query>     Search TMDB for movies/TV');
        addLine('output', '  play <title>       Search & play the first match');
        addLine('output', '  random [genre]     Get a random movie recommendation');
        addLine('output', '  status             Check service health');
        addLine('output', '  clear              Clear terminal');
        addLine('output', '  goto <section>     Navigate (archive/catalog/terminal)');
        addLine('output', '  help               Show this help');
        addLine('system', '─'.repeat(50));
        break;
      case 'search':
        if (!args) { addLine('error', 'Usage: search <query>'); break; }
        await handleSearch(args);
        break;
      case 'play':
        if (!args) { addLine('error', 'Usage: play <title>'); break; }
        await handlePlay(args);
        break;
      case 'random':
        await handleRandom(args || undefined);
        break;
      case 'status':
        addLine('system', 'Checking services...');
        try {
          const start = performance.now();
          await fetch('https://api.themoviedb.org/3/configuration?api_key=3a16a4172e03d111270c5bf5c638f1a5', { mode: 'no-cors' });
          const lat = Math.round(performance.now() - start);
          addLine('success', `TMDB API: OPERATIONAL (${lat}ms)`);
        } catch {
          addLine('error', 'TMDB API: OFFLINE');
        }
        addLine('output', `Session log entries: ${useStore.getState().sessionLog.length}`);
        addLine('output', `Watchlist items: ${useUserStore.getState().watchlist.length}`);
        break;
      case 'clear':
        setLines([{ type: 'system', text: 'Terminal cleared.' }]);
        break;
      case 'goto': {
        const section = args.toLowerCase();
        if (['archive', 'catalog', 'terminal'].includes(section)) {
          setCurrentSection(section);
          addLine('success', `Navigated to ${section.toUpperCase()}`);
        } else {
          addLine('error', 'Available sections: archive, catalog, terminal');
        }
        break;
      }
      default:
        addLine('error', `Unknown command: "${cmd}". Type "help" for available commands.`);
    }
  }, [input, processing, addLine, handleSearch, handlePlay, handleRandom, setCurrentSection]);

  const lineColor = (type: TerminalLine['type']) => {
    switch (type) {
      case 'input': return 'text-[#B8B8B8]';
      case 'output': return 'text-[#666666]';
      case 'error': return 'text-[#E4002B]';
      case 'success': return 'text-green-400';
      case 'system': return 'text-[#444444]';
    }
  };

  return (
    <section className="relative px-4 md:px-8 py-16 max-w-7xl mx-auto" id="terminal-section">
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-2 h-2 bg-[#E4002B]" />
        <h2 className="text-[#E0E0E0] text-xl tracking-[0.3em] font-retro">TERMINAL</h2>
        <div className="flex-1 h-px bg-[#1a1a1a]" />
        <span className="text-[#666666] text-[10px] tracking-[0.3em]">SESSION ACTIVE</span>
        <div className="w-2 h-2 bg-[#E4002B] pulse-red" />
      </div>

      {/* Terminal Window */}
      <motion.div
        className="border border-[#1a1a1a] bg-[#080808] overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        onClick={() => inputRef.current?.focus()}
      >
        {/* Terminal Header Bar */}
        <div className="flex items-center gap-2 px-4 py-2 bg-[#0d0d0d] border-b border-[#1a1a1a]">
          <div className="w-2 h-2 bg-[#E4002B]/60" />
          <div className="w-2 h-2 bg-[#333333]" />
          <div className="w-2 h-2 bg-[#333333]" />
          <span className="ml-2 text-[10px] text-[#333333] tracking-[0.3em]">
            LOOPFLIX TERMINAL — CMD INTERFACE
          </span>
          {processing && (
            <span className="ml-auto text-[9px] text-yellow-500 tracking-wider animate-pulse">PROCESSING...</span>
          )}
        </div>

        {/* Terminal Content */}
        <div ref={scrollRef} className="p-4 md:p-6 space-y-1 font-mono text-xs min-h-[400px] max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-[#222222]">
          {lines.map((line, i) => (
            <div key={i} className={`${lineColor(line.type)} leading-relaxed whitespace-pre-wrap break-all`}>
              {line.text}
            </div>
          ))}
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="flex items-center gap-2 px-4 py-3 bg-[#0a0a0a] border-t border-[#1a1a1a]">
          <span className="text-[#E4002B] text-xs font-bold">▸</span>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={processing}
            className="flex-1 bg-transparent text-[#B8B8B8] text-xs font-mono tracking-wider outline-none placeholder:text-[#333333] disabled:opacity-50"
            placeholder={processing ? 'Processing...' : 'Type a command (help for list)...'}
            autoFocus
          />
        </form>
      </motion.div>

      {/* Quick Commands */}
      <div className="mt-4 flex flex-wrap gap-2">
        {[
          { cmd: 'help', label: 'HELP' },
          { cmd: 'search ', label: 'SEARCH' },
          { cmd: 'play ', label: 'PLAY' },
          { cmd: 'random', label: 'RANDOM' },
          { cmd: 'status', label: 'STATUS' },
          { cmd: 'clear', label: 'CLEAR' },
        ].map(({ cmd, label }) => (
          <button
            key={label}
            onClick={() => {
              if (label === 'CLEAR' || label === 'HELP' || label === 'RANDOM' || label === 'STATUS') {
                setInput(cmd);
              } else {
                setInput(cmd);
                inputRef.current?.focus();
              }
            }}
            className="text-[9px] text-[#444444] tracking-[0.2em] px-2 py-1 border border-[#1a1a1a] hover:border-[#E4002B]/30 hover:text-[#E4002B] transition-colors"
          >
            {label}
          </button>
        ))}
      </div>
    </section>
  );
}
