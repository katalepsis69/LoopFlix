/**
 * TerminalClient — Client component for the terminal page.
 *
 * Uses /api/tmdb proxy instead of direct server-only imports.
 */
"use client";

import Navbar from "../Navbar";
import Footer from "../Footer";
import Scanlines from "../Scanlines";
import MovieModal from "../MovieModal";
import Settings from "../Settings";
import WatchlistPanel from "../WatchlistPanel";
import OfflineDetector from "../OfflineDetector";
import ErrorBoundary from "../ErrorBoundary";
import RandomPicker from "../RandomPicker";
import { useStore } from "@/store/useStore";
import { useUserStore } from "@/store/useUserStore";
import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";

interface TerminalLine {
  type: "input" | "output" | "error" | "success" | "system";
  text: string;
}

// Client-side TMDB proxy helper
async function tmdbProxy(endpoint: string, params: Record<string, string> = {}) {
  const searchParams = new URLSearchParams({ e: endpoint, ...params });
  const res = await fetch(`/api/tmdb?${searchParams.toString()}`);
  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  return res.json();
}

// Quick command buttons
const QUICK_COMMANDS = [
  { cmd: "search ", label: "SEARCH", icon: "◉" },
  { cmd: "play ", label: "PLAY", icon: "▶" },
  { cmd: "random", label: "RANDOM", icon: "◈" },
  { cmd: "watchlist", label: "WATCHLIST", icon: "◆" },
  { cmd: "ratings", label: "RATINGS", icon: "★" },
  { cmd: "history", label: "HISTORY", icon: "◇" },
  { cmd: "status", label: "STATUS", icon: "●" },
  { cmd: "help", label: "HELP", icon: "?" },
];

const RANDOM_GENRES = [
  "horror", "sci-fi", "action", "thriller", "mystery",
  "animation", "comedy", "drama", "fantasy",
];

export default function TerminalClient() {
  const [lines, setLines] = useState<TerminalLine[]>([
    { type: "system", text: "LOOPFLIX ARCHIVE TERMINAL v2.47.1" },
    { type: "system", text: 'Type "help" for available commands.' },
    { type: "system", text: "─".repeat(50) },
  ]);
  const [input, setInput] = useState("");
  const [processing, setProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { setSelectedMedia, addSessionLog } = useStore();
  const signalLostOpen = useStore((s) => s.signalLostOpen);

  const addLine = useCallback((type: TerminalLine["type"], text: string) => {
    setLines((prev) => [...prev, { type, text }]);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // ─── Commands ──────────────────────────────────────────────

  const handleSearch = useCallback(
    async (query: string) => {
      setProcessing(true);
      addLine("input", `> search ${query}`);
      try {
        const data = await tmdbProxy("search/multi", { query });
        const results = (data.results || [])
          .filter((r: any) => r.media_type === "movie" || r.media_type === "tv")
          .slice(0, 8);
        if (results.length === 0) {
          addLine("error", `No results found for "${query}"`);
        } else {
          addLine("success", `Found ${results.length} results:`);
          results.forEach((r: any, i: number) => {
            const type = r.media_type === "tv" ? "TV" : "FILM";
            const year = (r.release_date || r.first_air_date || "").slice(0, 4);
            const rating = r.vote_average ? r.vote_average.toFixed(1) : "—";
            addLine("output", `  ${i + 1}. [${type}] ${r.title || r.name} (${year}) ★${rating}  ID:${r.id}`);
          });
          addLine("system", 'Use "play <title>" to open the first match.');
        }
        addSessionLog({ type: "search", message: `Searched: "${query}"`, detail: `${results.length} results` });
      } catch {
        addLine("error", "Search failed. Check connection.");
      }
      setProcessing(false);
    },
    [addLine, addSessionLog],
  );

  const handlePlay = useCallback(
    async (query: string) => {
      setProcessing(true);
      addLine("input", `> play ${query}`);
      try {
        const data = await tmdbProxy("search/multi", { query });
        const results = (data.results || []).filter(
          (r: any) => r.media_type === "movie" || r.media_type === "tv",
        );
        if (results.length === 0) {
          addLine("error", `No results found for "${query}"`);
        } else {
          const first = results[0];
          const title = first.title || first.name;
          const type = first.media_type as "movie" | "tv";
          addLine("success", `Loading: ${title} (${type === "tv" ? "TV SERIES" : "FILM"})...`);

          setSelectedMedia({
            id: first.id,
            title: title,
            posterPath: first.poster_path,
            backdropPath: first.backdrop_path,
            mediaType: type,
          });

          addSessionLog({ type: "view", message: `Played: ${title}`, detail: type.toUpperCase() });
        }
      } catch {
        addLine("error", "Playback failed. Check connection.");
      }
      setProcessing(false);
    },
    [addLine, addSessionLog, setSelectedMedia],
  );

  const handleRandom = useCallback(
    async (genreArg?: string) => {
      setProcessing(true);
      const genre = genreArg || RANDOM_GENRES[Math.floor(Math.random() * RANDOM_GENRES.length)];
      addLine("input", `> random${genreArg ? ` ${genreArg}` : ""}`);
      addLine("system", `Scanning ${genre} archives...`);
      try {
        const randomPage = Math.floor(Math.random() * 50) + 1;
        const data = await tmdbProxy("discover/movie", {
          page: String(randomPage),
          with_genres: genre,
          sort_by: "popularity.desc",
        });
        const results = data.results || [];
        if (results.length === 0) {
          addLine("error", `No ${genre} records found.`);
        } else {
          const pick = results[Math.floor(Math.random() * results.length)];
          const rating = pick.vote_average ? pick.vote_average.toFixed(1) : "—";
          const year = (pick.release_date || "").slice(0, 4);
          addLine("success", `◈ SIGNAL ACQUIRED:`);
          addLine("output", `  ${pick.title} (${year}) ★${rating}`);
          addLine("output", `  ${pick.overview?.slice(0, 120) || "No synopsis available."}...`);
          addLine("system", `Use "play ${pick.title}" to open this record.`);
        }
      } catch {
        addLine("error", "Random scan failed.");
      }
      setProcessing(false);
    },
    [addLine],
  );

  const handleWatchlist = useCallback(() => {
    addLine("input", "> watchlist");
    const watchlist = useUserStore.getState().watchlist;
    if (watchlist.length === 0) {
      addLine("output", "Watchlist is empty.");
      addLine("system", 'Add items by clicking ◆ on any movie card.');
    } else {
      addLine("success", `${watchlist.length} items in watchlist:`);
      watchlist.slice(0, 10).forEach((item, i) => {
        addLine("output", `  ${i + 1}. ${item.title} (${item.year || "—"})`);
      });
      if (watchlist.length > 10) {
        addLine("system", `  ... and ${watchlist.length - 10} more`);
      }
    }
  }, [addLine]);

  const handleRatings = useCallback(() => {
    addLine("input", "> ratings");
    const ratings = useUserStore.getState().ratings;
    if (ratings.length === 0) {
      addLine("output", "No ratings yet.");
      addLine("system", "Rate movies by clicking ★ in the movie detail modal.");
    } else {
      addLine("success", `${ratings.length} rated items:`);
      ratings.slice(0, 10).forEach((r, i) => {
        addLine("output", `  ${i + 1}. ${r.title} — ${"★".repeat(Math.round(r.rating / 2))}${"☆".repeat(5 - Math.round(r.rating / 2))} ${r.rating}/10`);
      });
    }
  }, [addLine]);

  const handleHistory = useCallback(() => {
    addLine("input", "> history");
    const history = useUserStore.getState().recentlyViewed;
    if (history.length === 0) {
      addLine("output", "No viewing history.");
    } else {
      addLine("success", `Recently viewed (${history.length}):`);
      history.slice(0, 10).forEach((item, i) => {
        const ago = item.viewedAt
          ? new Date(item.viewedAt).toLocaleString()
          : "unknown";
        addLine("output", `  ${i + 1}. ${item.title} — ${ago}`);
      });
    }
  }, [addLine]);

  const handleStatus = useCallback(async () => {
    addLine("input", "> status");
    addLine("system", "Checking services...");
    const services = [
      { name: "TMDB API", url: "trending/movie/day?page=1" },
      { name: "IMAGE CDN", url: null },
    ];
    for (const service of services) {
      if (service.url) {
        const start = Date.now();
        try {
          await tmdbProxy(service.url);
          const ms = Date.now() - start;
          const status = ms < 500 ? "OPERATIONAL" : ms < 2000 ? "DEGRADED" : "SLOW";
          const color = ms < 500 ? "success" : ms < 2000 ? "output" : "error";
          addLine(color, `  ● ${service.name}: ${status} (${ms}ms)`);
        } catch {
          addLine("error", `  ● ${service.name}: OFFLINE`);
        }
      } else {
        // Image CDN check
        const start = Date.now();
        try {
          await fetch("https://image.tmdb.org/t/p/w92/abc.jpg", { method: "HEAD", mode: "no-cors" });
          const ms = Date.now() - start;
          addLine("success", `  ● ${service.name}: OPERATIONAL (${ms}ms)`);
        } catch {
          addLine("error", `  ● ${service.name}: OFFLINE`);
        }
      }
    }
    addLine("system", `  Device: ${navigator?.hardwareConcurrency || "?"} cores`);
    addLine("system", `  Online: ${navigator?.onLine ? "YES" : "NO"}`);
  }, [addLine]);

  const handleHelp = useCallback(() => {
    addLine("input", "> help");
    addLine("system", "Available commands:");
    addLine("output", "  search <query>     Search movies & TV shows");
    addLine("output", "  play <title>       Search and open first match");
    addLine("output", "  random [genre]     Get a random movie suggestion");
    addLine("output", "  watchlist          View your saved watchlist");
    addLine("output", "  ratings            View your rated movies");
    addLine("output", "  history            View recently opened records");
    addLine("output", "  status             Check system services");
    addLine("output", "  clear              Clear terminal output");
    addLine("output", "  help               Show this help message");
    addLine("system", "Tip: Click quick-command buttons below for faster access.");
  }, [addLine]);

  // ─── Command Router ────────────────────────────────────────

  const processCommand = useCallback(
    async (cmd: string) => {
      const trimmed = cmd.trim();
      if (!trimmed) return;

      const parts = trimmed.split(/\s+/);
      const command = parts[0].toLowerCase();
      const args = parts.slice(1).join(" ");

      switch (command) {
        case "search":
        case "s":
          if (args) await handleSearch(args);
          else addLine("error", 'Usage: search <query>');
          break;
        case "play":
        case "p":
          if (args) await handlePlay(args);
          else addLine("error", 'Usage: play <title>');
          break;
        case "random":
        case "r":
          await handleRandom(args || undefined);
          break;
        case "watchlist":
        case "wl":
          handleWatchlist();
          break;
        case "ratings":
        case "rt":
          handleRatings();
          break;
        case "history":
        case "h":
          handleHistory();
          break;
        case "status":
          await handleStatus();
          break;
        case "clear":
        case "cls":
          setLines([]);
          break;
        case "help":
        case "?":
          handleHelp();
          break;
        default:
          addLine("error", `Unknown command: "${command}". Type "help" for commands.`);
      }
    },
    [addLine, handleSearch, handlePlay, handleRandom, handleWatchlist, handleRatings, handleHistory, handleStatus, handleHelp],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    processCommand(input);
    setInput("");
  };

  return (
    <div className="relative min-h-screen bg-[#0A0A0A]">
      <Scanlines />
      <OfflineDetector />
      <Navbar />

      <main className="relative z-10 pt-20 pb-8">
        <div className="max-w-5xl mx-auto px-4 md:px-8">
          {/* Section Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-2 h-2 bg-[#E4002B]" />
            <h1 className="text-[#E0E0E0] text-xl tracking-[0.3em] font-retro">TERMINAL</h1>
            <div className="flex-1 h-px bg-[#1a1a1a]" />
            <span className="text-[#444444] text-[10px] tracking-wider">v2.47.1</span>
          </div>

          {/* Quick Commands */}
          <div className="flex flex-wrap gap-2 mb-4">
            {QUICK_COMMANDS.map((qc) => (
              <button
                key={qc.cmd}
                onClick={() => {
                  if (qc.cmd === "random" || qc.cmd === "watchlist" || qc.cmd === "ratings" || qc.cmd === "history" || qc.cmd === "status" || qc.cmd === "help") {
                    processCommand(qc.cmd);
                  } else {
                    setInput(qc.cmd);
                    inputRef.current?.focus();
                  }
                }}
                className="px-3 py-1.5 bg-[#0d0d0d] border border-[#1a1a1a] text-[#666666] text-[10px] tracking-wider font-mono hover:border-[#E4002B]/30 hover:text-[#E4002B] transition-all glitch-hover"
              >
                {qc.icon} {qc.label}
              </button>
            ))}
          </div>

          {/* Terminal Window */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="border border-[#1a1a1a] bg-[#050505] relative"
          >
            {/* Title Bar */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-[#1a1a1a] bg-[#080808]">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#E4002B] animate-pulse" />
                <span className="text-[#444444] text-[10px] tracking-wider font-mono">LOOPFLIX://TERMINAL</span>
              </div>
              <span className="text-[#333333] text-[9px] tracking-wider font-mono">
                {processing ? "◈ PROCESSING..." : "● READY"}
              </span>
            </div>

            {/* Output */}
            <div
              ref={scrollRef}
              className="h-[60vh] overflow-y-auto p-4 font-mono text-xs space-y-1 scrollbar-thin"
              onClick={() => inputRef.current?.focus()}
            >
              {lines.map((line, i) => (
                <div
                  key={i}
                  className={`${
                    line.type === "input"
                      ? "text-[#E4002B]"
                      : line.type === "output"
                      ? "text-[#B8B8B8]"
                      : line.type === "error"
                      ? "text-[#E4002B]/70"
                      : line.type === "success"
                      ? "text-green-400"
                      : "text-[#444444]"
                  }`}
                >
                  <span className="text-[#333333] select-none">{String(i + 1).padStart(3, " ")} │ </span>
                  {line.text}
                </div>
              ))}
              {processing && (
                <div className="text-[#E4002B] animate-pulse">
                  <span className="text-[#333333] select-none">{String(lines.length + 1).padStart(3, " ")} │ </span>
                  ◈ Processing...
                </div>
              )}
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="flex items-center border-t border-[#1a1a1a] bg-[#080808]">
              <span className="text-[#E4002B] text-xs font-mono px-3 select-none">▸</span>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={processing}
                className="flex-1 bg-transparent text-[#B8B8B8] text-xs font-mono py-3 outline-none placeholder:text-[#333333] disabled:opacity-50"
                placeholder="Type a command..."
                autoComplete="off"
                spellCheck={false}
              />
              <span className="text-[#333333] text-[9px] font-mono px-3 tracking-wider">ENTER ↵</span>
            </form>
          </motion.div>

          {/* Help Hint */}
          <div className="mt-4 text-[#333333] text-[9px] tracking-wider font-mono text-center">
            AVAILABLE: search, play, random, watchlist, ratings, history, status, clear, help
          </div>
        </div>
      </main>

      <Footer />
      <MovieModal />
      <Settings />
      <WatchlistPanel />
      {signalLostOpen && <RandomPicker />}
    </div>
  );
}
