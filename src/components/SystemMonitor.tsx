'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { useUserStore } from '@/store/useUserStore';
import { searchMulti, movieToMediaItem, tvToMediaItem } from '@/lib/tmdb/client';
import type { MediaItem } from '../lib/tmdb/types';

// ─── Service Health Check ────────────────────────────────────

interface ServiceStatus {
  name: string;
  url: string;
  status: 'checking' | 'operational' | 'degraded' | 'down';
  latency: number;
  lastCheck: number;
}

const SERVICES: Omit<ServiceStatus, 'status' | 'latency' | 'lastCheck'>[] = [
  { name: 'TMDB API', url: 'https://api.themoviedb.org/3/configuration?api_key=3a16a4172e03d111270c5bf5c638f1a5' },
  { name: 'IMAGE CDN', url: 'https://image.tmdb.org/t/p/w92/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg' },
  { name: 'VIDKING', url: 'https://www.vidking.net' },
];

function ServiceHealth() {
  const [services, setServices] = useState<ServiceStatus[]>(
    SERVICES.map((s) => ({ ...s, status: 'checking', latency: 0, lastCheck: 0 }))
  );
  const [checking, setChecking] = useState(false);

  const checkServices = useCallback(async () => {
    setChecking(true);
    const results = await Promise.all(
      SERVICES.map(async (service) => {
        const start = performance.now();
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 8000);
          await fetch(service.url, { mode: 'no-cors', signal: controller.signal });
          clearTimeout(timeout);
          const latency = Math.round(performance.now() - start);
          return {
            ...service,
            status: latency < 3000 ? 'operational' as const : 'degraded' as const,
            latency,
            lastCheck: Date.now(),
          };
        } catch {
          return {
            ...service,
            status: 'down' as const,
            latency: Math.round(performance.now() - start),
            lastCheck: Date.now(),
          };
        }
      })
    );
    setServices(results);
    setChecking(false);
  }, []);

  useEffect(() => { checkServices(); }, [checkServices]);
  useEffect(() => { const i = setInterval(checkServices, 60000); return () => clearInterval(i); }, [checkServices]);

  const statusDot = (s: ServiceStatus['status']) => {
    if (s === 'checking') return 'bg-yellow-500 animate-pulse';
    if (s === 'operational') return 'bg-green-500';
    if (s === 'degraded') return 'bg-yellow-500';
    return 'bg-[#E4002B]';
  };

  const statusLabel = (s: ServiceStatus['status']) => {
    if (s === 'checking') return 'CHECKING';
    if (s === 'operational') return 'OPERATIONAL';
    if (s === 'degraded') return 'DEGRADED';
    return 'OFFLINE';
  };

  return (
    <div className="border border-[#1a1a1a] bg-[#0d0d0d]">
      <div className="px-4 py-2 border-b border-[#1a1a1a] flex items-center justify-between">
        <div className="text-[10px] text-[#E4002B] tracking-[0.3em] flex items-center gap-2">
          <div className="w-4 h-px bg-[#E4002B]" />
          SERVICE STATUS
        </div>
        <button
          onClick={checkServices}
          disabled={checking}
          className="text-[9px] text-[#444444] tracking-wider hover:text-[#E4002B] transition-colors disabled:opacity-50"
        >
          {checking ? 'CHECKING...' : 'REFRESH'}
        </button>
      </div>
      <div className="divide-y divide-[#111111]">
        {services.map((s) => (
          <div key={s.name} className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 ${statusDot(s.status)}`} />
              <span className="text-[11px] text-[#B8B8B8] tracking-wider">{s.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-[10px] tracking-[0.2em] ${
                s.status === 'operational' ? 'text-green-500' : s.status === 'degraded' ? 'text-yellow-500' : s.status === 'down' ? 'text-[#E4002B]' : 'text-yellow-500'
              }`}>
                {statusLabel(s.status)}
              </span>
              <span className="text-[10px] text-[#444444] tracking-wider font-mono w-16 text-right">
                {s.latency > 0 ? `${s.latency}ms` : '—'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Session Log ─────────────────────────────────────────────

function SessionLog() {
  const sessionLog = useStore((s) => s.sessionLog);
  const clearSessionLog = useStore((s) => s.clearSessionLog);

  const typeConfig: Record<string, { icon: string; color: string }> = {
    view: { icon: '▶', color: 'text-[#B8B8B8]' },
    rate: { icon: '★', color: 'text-yellow-500' },
    watchlist: { icon: '◆', color: 'text-[#E4002B]' },
    search: { icon: '⊕', color: 'text-blue-400' },
    error: { icon: '✗', color: 'text-[#E4002B]' },
    slow: { icon: '⚠', color: 'text-yellow-500' },
    system: { icon: '◎', color: 'text-[#666666]' },
    play: { icon: '▶', color: 'text-green-400' },
    navigate: { icon: '◇', color: 'text-[#555555]' },
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="border border-[#1a1a1a] bg-[#0d0d0d]">
      <div className="px-4 py-2 border-b border-[#1a1a1a] flex items-center justify-between">
        <div className="text-[10px] text-[#E4002B] tracking-[0.3em] flex items-center gap-2">
          <div className="w-4 h-px bg-[#E4002B]" />
          SESSION LOG
          <span className="text-[#333333] ml-1">({sessionLog.length})</span>
        </div>
        <button
          onClick={clearSessionLog}
          className="text-[9px] text-[#444444] tracking-wider hover:text-[#E4002B] transition-colors"
        >
          CLEAR
        </button>
      </div>
      <div className="max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-[#222222]">
        {sessionLog.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <span className="text-[10px] text-[#333333] tracking-[0.2em]">NO SESSION ACTIVITY YET</span>
          </div>
        ) : (
          <div className="divide-y divide-[#111111]">
            {sessionLog.map((entry) => {
              const cfg = typeConfig[entry.type] ?? typeConfig.system;
              return (
                <motion.div
                  key={entry.id}
                  className="px-4 py-2.5 flex items-start gap-3 hover:bg-[#111111] transition-colors"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <span className={`text-[10px] ${cfg.color} mt-0.5`}>{cfg.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] text-[#888888] tracking-wider">{entry.message}</div>
                    {entry.detail && (
                      <div className="text-[9px] text-[#444444] tracking-wider mt-0.5 truncate">{entry.detail}</div>
                    )}
                  </div>
                  <span className="text-[9px] text-[#333333] tracking-wider font-mono shrink-0">
                    {formatTime(entry.timestamp)}
                  </span>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Functional Terminal ─────────────────────────────────────

interface TerminalLine {
  type: 'input' | 'output' | 'error' | 'success' | 'system';
  text: string;
}

function FunctionalTerminal() {
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
        addLine('system', 'Use "play <number>" to open a result, or "play <title>" to search and play the first match.');
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

    // Check if it's a number (direct selection from previous search results)
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
        addLine('output', '  goto <section>     Navigate (archive/catalog/monitor)');
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
        if (['archive', 'catalog', 'monitor'].includes(section)) {
          setCurrentSection(section);
          addLine('success', `Navigated to ${section.toUpperCase()}`);
        } else {
          addLine('error', 'Available sections: archive, catalog, monitor');
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
    <div className="border border-[#1a1a1a] bg-[#080808] overflow-hidden">
      {/* Terminal Header */}
      <div className="flex items-center gap-2 px-4 py-2 bg-[#0d0d0d] border-b border-[#1a1a1a]">
        <div className="w-2 h-2 bg-[#E4002B]/60" />
        <div className="w-2 h-2 bg-[#333333]" />
        <div className="w-2 h-2 bg-[#333333]" />
        <span className="ml-2 text-[10px] text-[#333333] tracking-[0.3em]">
          ARCHIVE TERMINAL — SESSION ACTIVE
        </span>
        {processing && (
          <span className="ml-auto text-[9px] text-yellow-500 tracking-wider animate-pulse">PROCESSING...</span>
        )}
      </div>

      {/* Terminal Content */}
      <div ref={scrollRef} className="p-4 md:p-6 space-y-1 font-mono text-xs min-h-[300px] max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-[#222222]">
        {lines.map((line, i) => (
          <div key={i} className={`${lineColor(line.type)} leading-relaxed whitespace-pre-wrap break-all`}>
            {line.text}
          </div>
        ))}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 px-4 py-3 bg-[#0a0a0a] border-t border-[#1a1a1a]">
        <span className="text-[#B8B8B8] text-xs">&gt;</span>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={processing}
          className="flex-1 bg-transparent text-[#B8B8B8] text-xs font-mono tracking-wider outline-none placeholder:text-[#333333] disabled:opacity-50"
          placeholder={processing ? 'Processing...' : 'Type a command...'}
          autoFocus
        />
      </form>
    </div>
  );
}

// ─── Main System Monitor ─────────────────────────────────────

export default function SystemMonitor() {
  return (
    <section className="relative px-4 md:px-8 py-16 max-w-7xl mx-auto" id="monitor-section">
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-2 h-2 bg-[#E4002B]" />
        <h2 className="text-[#E0E0E0] text-xl tracking-[0.3em]">SYSTEM MONITOR</h2>
        <div className="flex-1 hline-dim" />
        <span className="text-[#666666] text-[10px] tracking-[0.3em]">LIVE</span>
        <div className="w-2 h-2 bg-[#E4002B] pulse-red" />
      </div>

      <div className="space-y-8">
        {/* Service Health */}
        <ServiceHealth />

        {/* Session Log */}
        <SessionLog />

        {/* Terminal */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-4 h-px bg-[#E4002B]" />
            <span className="text-[10px] text-[#888888] tracking-[0.3em]">TERMINAL</span>
            <span className="text-[9px] text-[#333333] tracking-wider">Type "help" for commands</span>
          </div>
          <FunctionalTerminal />
        </div>
      </div>
    </section>
  );
}
